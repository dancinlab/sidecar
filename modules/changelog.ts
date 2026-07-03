// sidecar changelog {add|list|render|prune|migrate} — append-only history as JSONL.
//
// The history SSOT moved from a freeform CHANGELOG.md to CHANGELOG.jsonl (one entry
// per line, newest-first): machine-parseable, append-cheap, and prunable per-entry
// (a markdown wall can only be hand-edited). Each entry = { ts, title, body }.
//   add <title…>        append a new entry (body via STDIN or empty); ts = today
//   list [N]            recent N entries (ts + title), default 20
//   render [N]          markdown view to stdout (for humans / GitHub), newest-first
//   prune --keep N      keep the newest N, delete the rest
//   prune --older-than D delete entries dated > D days ago (undated = treated as old)
//   migrate [--force]   one-shot CHANGELOG.md → CHANGELOG.jsonl (then md can be removed)
//   migrate --to-fragments  one-shot CHANGELOG.jsonl → CHANGELOG.d/*.jsonl shards
//
// FRAGMENT MODE (auto-detected · zero config): when a `CHANGELOG.d/` directory exists,
// each `add` writes ONE brand-new shard file `CHANGELOG.d/<YYYYMMDDHHMMSS>-<4hex>-<slug>.jsonl`
// (exactly one JSON line) instead of prepending to the single CHANGELOG.jsonl line-1.
// Two parallel PRs therefore touch two DIFFERENT paths → git add/add conflict is
// structurally impossible. `load()` merges the legacy jsonl tail (if any) + every shard,
// so the switch is 100% backward-compatible: no CHANGELOG.d/ ⇒ legacy behavior unchanged.
//
import { resolve, join } from "node:path";
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync, rmSync } from "node:fs";
import { REPO_ROOT } from "../lib/paths.ts";
import { readStdin } from "../lib/exec.ts";
import { info, ok, warn } from "../lib/log.ts";

interface Entry {
  ts: string | null; // YYYY-MM-DD, or null for undated (migrated history)
  title: string;
  body: string;
}

const FILE = () => resolve(REPO_ROOT, "CHANGELOG.jsonl");

// Fragment (shard) directory. When it EXISTS, changelog runs in fragment mode:
// each add = one new file, so parallel PRs never collide on line-1. Auto-detected
// per call (cheap existsSync) so no config flag is needed and legacy repos are unchanged.
const FRAG_DIR = () => resolve(REPO_ROOT, "CHANGELOG.d");
const useFragments = () => existsSync(FRAG_DIR());

const DEFAULT_KEEP = 30;

// keep-N for auto-prune: harness.config.json `lint.changelog.keep`, fallback 30.
// Old entries beyond keep-N are trimmed from the working file; full history stays in git.
function keepN(): number {
  try {
    const cfg = JSON.parse(readFileSync(resolve(REPO_ROOT, "harness.config.json"), "utf8"));
    const k = cfg?.lint?.changelog?.keep;
    return typeof k === "number" && k > 0 ? k : DEFAULT_KEEP;
  } catch {
    return DEFAULT_KEEP;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── fragment helpers ────────────────────────────────────────────────────────

// A monotonic in-process counter so two shards minted in the same second (same
// process) never collide on filename even before the random suffix. Combined with
// a per-mint random 4-hex, cross-process same-second collision is astronomically
// unlikely. (Date.now is fine here — this is Node, not a here-shell.)
let _fragSeq = 0;

function ts14(d: Date): string {
  // YYYYMMDDHHMMSS in UTC — the shard filename sort key (lexical == chronological).
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    p(d.getUTCFullYear(), 4) +
    p(d.getUTCMonth() + 1) +
    p(d.getUTCDate()) +
    p(d.getUTCHours()) +
    p(d.getUTCMinutes()) +
    p(d.getUTCSeconds())
  );
}

function slugify(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return s || "entry";
}

function rand4hex(): string {
  // process-unique-ish: mix an incrementing counter with Math.random so successive
  // mints in the same tick still differ.
  const n = ((Math.floor(Math.random() * 0x10000) ^ (_fragSeq++ & 0xffff)) & 0xffff) >>> 0;
  return n.toString(16).padStart(4, "0");
}

// The shard filename for a fresh entry. Uniqueness = ts(sec) + in-proc counter + random.
function fragName(entry: Entry): string {
  const d = new Date();
  return `${ts14(d)}-${rand4hex()}-${slugify(entry.title)}.jsonl`;
}

// All shard files (basenames), sorted newest-first by filename (ts14 prefix sorts
// lexically == chronologically; the random suffix is a stable tiebreak).
function fragFiles(): string[] {
  const dir = FRAG_DIR();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .reverse();
}

function parseEntry(line: string): Entry | null {
  const s = line.trim();
  if (!s) return null;
  try {
    const j = JSON.parse(s) as Entry;
    if (typeof j.title === "string") return { ts: j.ts ?? null, title: j.title, body: j.body ?? "" };
  } catch {
    /* skip a malformed line rather than lose the whole file */
  }
  return null;
}

// Load every shard (one entry per file), newest-first by filename.
function loadFragments(): Entry[] {
  const out: Entry[] = [];
  for (const f of fragFiles()) {
    const e = parseEntry(readFileSync(join(FRAG_DIR(), f), "utf8"));
    if (e) out.push(e);
  }
  return out;
}

// Write ONE new shard file for a fresh entry. Never rewrites existing shards, so a
// parallel add on another branch produces a different path → no add/add conflict.
function writeFragment(entry: Entry): string {
  mkdirSync(FRAG_DIR(), { recursive: true });
  const name = fragName(entry);
  writeFileSync(join(FRAG_DIR(), name), JSON.stringify(entry) + "\n");
  return name;
}

// Trim shards to keep-N: keep the newest N files, unlink the rest (history stays in git).
function trimFragments(keep: number): number {
  if (keep < 0) return 0;
  const files = fragFiles(); // newest-first
  const stale = files.slice(keep);
  for (const f of stale) unlinkSync(join(FRAG_DIR(), f));
  return stale.length;
}

// ── legacy single-file load/save (unchanged) ────────────────────────────────

function loadLegacy(): Entry[] {
  const p = FILE();
  if (!existsSync(p)) return [];
  const out: Entry[] = [];
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const e = parseEntry(line);
    if (e) out.push(e);
  }
  return out;
}

// Unified read: in fragment mode, merge the legacy jsonl tail (if any) + all shards,
// newest-first. In legacy mode, just the single file. Sort is by `ts` descending,
// with shards (ts14-named) already newest-first as a stable secondary order.
function load(): Entry[] {
  if (!useFragments()) return loadLegacy();
  const legacy = loadLegacy(); // any residual tail during the migration window
  const frags = loadFragments();
  const merged = [...frags, ...legacy];
  // Stable sort by ts descending; undated (null) sink to the bottom. Entries with the
  // same ts keep their input order (shards before legacy tail), so render stays stable.
  return merged
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const ta = a.e.ts ? Date.parse(a.e.ts) : -Infinity;
      const tb = b.e.ts ? Date.parse(b.e.ts) : -Infinity;
      if (tb !== ta) return tb - ta;
      return a.i - b.i;
    })
    .map((x) => x.e);
}

// newest-first on disk: one compact JSON object per line. (Legacy mode only.)
function save(entries: Entry[]): void {
  writeFileSync(FILE(), entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : ""));
}

function daysAgo(ts: string | null, nowMs: number): number {
  if (!ts) return Number.POSITIVE_INFINITY; // undated = oldest
  const t = Date.parse(ts);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : (nowMs - t) / 86_400_000;
}

// Parse a freeform CHANGELOG.md into entries (## <title> + body until the next ##).
function parseMarkdown(md: string): Entry[] {
  const lines = md.split("\n");
  const entries: Entry[] = [];
  let cur: { title: string; body: string[] } | null = null;
  for (const line of lines) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) {
      if (cur) entries.push({ ts: null, title: cur.title.trim(), body: cur.body.join("\n").trim() });
      cur = { title: m[1], body: [] };
    } else if (cur) {
      cur.body.push(line);
    }
    // lines before the first `## ` (the `# CHANGELOG` header + intro) are dropped.
  }
  if (cur) entries.push({ ts: null, title: cur.title.trim(), body: cur.body.join("\n").trim() });
  return entries; // already newest-first (md order)
}

function renderMarkdown(entries: Entry[], n?: number): string {
  const slice = n && n > 0 ? entries.slice(0, n) : entries;
  let out = "# CHANGELOG\n\n> append-only history (SSOT = `CHANGELOG.jsonl`; this is a rendered view · `sidecar changelog render`).\n";
  for (const e of slice) {
    out += `\n## ${e.title}\n`;
    if (e.ts) out += `_${e.ts}_\n`;
    if (e.body) out += `\n${e.body}\n`;
  }
  return out;
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

export async function runChangelog(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";

  if (sub === "add") {
    const title = args.slice(1).filter((a) => !a.startsWith("-")).join(" ").trim();
    if (!title) {
      info('usage: sidecar changelog add "<title>"  (body via stdin: `printf "..." | sidecar changelog add "title"`)');
      return 1;
    }
    let body = "";
    try {
      body = readStdin().trim();
    } catch {
      /* no stdin */
    }
    const entry: Entry = { ts: today(), title, body };
    const keep = keepN();

    if (useFragments()) {
      // Fragment mode: write ONE new shard file (no line-1 prepend → no add/add conflict),
      // then trim the shard-file count to keep-N.
      const name = writeFragment(entry);
      const trimmed = trimFragments(keep);
      const total = fragFiles().length;
      ok(`changelog: + "${title}" → CHANGELOG.d/${name} (${total} shard${total === 1 ? "" : "s"}${trimmed ? `, pruned ${trimmed} old` : ""})`);
      return 0;
    }

    const entries = loadLegacy();
    entries.unshift(entry); // newest-first
    const trimmed = entries.length > keep ? entries.length - keep : 0;
    if (trimmed) entries.length = keep; // auto-prune oldest beyond keep-N (history stays in git)
    save(entries);
    ok(`changelog: + "${title}" (${entries.length} entries${trimmed ? `, pruned ${trimmed} old` : ""})`);
    return 0;
  }

  if (sub === "list") {
    const entries = load();
    if (!entries.length) {
      info("changelog: empty (CHANGELOG.jsonl). add: sidecar changelog add \"<title>\"");
      return 0;
    }
    const n = Number(args[1]) > 0 ? Number(args[1]) : 20;
    info(`CHANGELOG — ${entries.length} entries (newest ${Math.min(n, entries.length)}):`);
    for (const e of entries.slice(0, n)) info(`  ${e.ts ?? "  (undated)"}  ${e.title}`);
    if (entries.length > n) info(`  … +${entries.length - n} older (sidecar changelog list ${entries.length})`);
    return 0;
  }

  if (sub === "render") {
    const entries = load();
    const n = Number(args[1]) > 0 ? Number(args[1]) : undefined;
    process.stdout.write(renderMarkdown(entries, n));
    return 0;
  }

  if (sub === "prune") {
    const keep = flag(args, "--keep");
    const older = flag(args, "--older-than");

    if (useFragments()) {
      // Fragment mode: prune operates on shard FILES (keep-N newest, or older-than by ts14).
      const before = fragFiles().length;
      if (keep && Number(keep) >= 0) {
        const removed = trimFragments(Number(keep));
        ok(`changelog: pruned ${removed} old shard${removed === 1 ? "" : "s"} (${before - removed} kept)`);
        return 0;
      }
      if (older && Number(older) > 0) {
        const cutoffMs = Date.now() - Number(older) * 86_400_000;
        let removed = 0;
        for (const f of fragFiles()) {
          const e = parseEntry(readFileSync(join(FRAG_DIR(), f), "utf8"));
          if (e && daysAgo(e.ts, Date.now()) > Number(older)) {
            unlinkSync(join(FRAG_DIR(), f));
            removed++;
          } else if (!e) {
            // malformed shard older than cutoff by mtime-agnostic filename ts14 → drop if ts prefix past cutoff
            const m = /^(\d{14})-/.exec(f);
            if (m) {
              const y = m[1];
              const iso = `${y.slice(0, 4)}-${y.slice(4, 6)}-${y.slice(6, 8)}T${y.slice(8, 10)}:${y.slice(10, 12)}:${y.slice(12, 14)}Z`;
              if (Date.parse(iso) < cutoffMs) {
                unlinkSync(join(FRAG_DIR(), f));
                removed++;
              }
            }
          }
        }
        ok(`changelog: pruned ${removed} old shard${removed === 1 ? "" : "s"} (${before - removed} kept)`);
        return 0;
      }
      info("usage: sidecar changelog prune --keep <N> | --older-than <days>");
      return 1;
    }

    const entries = loadLegacy();
    const before = entries.length;
    let kept: Entry[];
    if (keep && Number(keep) >= 0) {
      kept = entries.slice(0, Number(keep)); // newest-first → keep the first N
    } else if (older && Number(older) > 0) {
      const now = Date.now();
      kept = entries.filter((e) => daysAgo(e.ts, now) <= Number(older));
    } else {
      info("usage: sidecar changelog prune --keep <N> | --older-than <days>");
      return 1;
    }
    save(kept);
    const removed = before - kept.length;
    ok(`changelog: pruned ${removed} old entr${removed === 1 ? "y" : "ies"} (${kept.length} kept)`);
    return 0;
  }

  if (sub === "migrate") {
    // --to-fragments: one-shot CHANGELOG.jsonl (N lines) → CHANGELOG.d/*.jsonl (N shards),
    // one file per entry. Undated entries get a synthetic ts14 back-counted by ordinal so
    // filenames stay a stable descending sort key. Removes the legacy file when done.
    if (args.includes("--to-fragments")) {
      const legacy = loadLegacy(); // newest-first
      if (!legacy.length) {
        warn("changelog migrate --to-fragments: CHANGELOG.jsonl empty or missing (nothing to shard)");
        return 1;
      }
      const dir = FRAG_DIR();
      if (existsSync(dir) && fragFiles().length && !args.includes("--force")) {
        warn(`changelog migrate --to-fragments: ${fragFiles().length} shard(s) already in CHANGELOG.d/ (use --force to add anyway)`);
        return 1;
      }
      mkdirSync(dir, { recursive: true });
      // Assign a synthetic descending ts14 so shard filenames preserve the input order
      // even for undated entries: newest entry = now, each older = -1s. This is a stable
      // ordinal back-calc, independent of the (possibly-null) ts field.
      const baseMs = Date.now();
      let written = 0;
      legacy.forEach((e, idx) => {
        const d = new Date(baseMs - idx * 1000); // idx 0 = newest → largest ts14
        const name = `${ts14(d)}-${rand4hex()}-${slugify(e.title)}.jsonl`;
        writeFileSync(join(dir, name), JSON.stringify(e) + "\n");
        written++;
      });
      if (existsSync(FILE())) rmSync(FILE());
      ok(`changelog: migrated ${written} entries CHANGELOG.jsonl → CHANGELOG.d/*.jsonl (line-1 conflicts eliminated)`);
      return 0;
    }

    const mdPath = resolve(REPO_ROOT, "CHANGELOG.md");
    if (!existsSync(mdPath)) {
      warn("changelog migrate: no CHANGELOG.md to migrate (for jsonl→shards use --to-fragments)");
      return 1;
    }
    if (existsSync(FILE()) && !args.includes("--force")) {
      warn("changelog migrate: CHANGELOG.jsonl already exists (use --force to overwrite)");
      return 1;
    }
    const entries = parseMarkdown(readFileSync(mdPath, "utf8"));
    save(entries);
    ok(`changelog: migrated ${entries.length} entries CHANGELOG.md → CHANGELOG.jsonl (rm the .md to finish)`);
    return 0;
  }

  if (sub === "autoprune") {
    // SessionStart-wired: trim the working file to keep-N if it has grown past it. Silent
    // no-op when under the cap (so it stays quiet at session start); full history is in git.
    const keep = Number(flag(args, "--keep")) > 0 ? Number(flag(args, "--keep")) : keepN();

    if (useFragments()) {
      const before = fragFiles().length;
      if (before <= keep) return 0;
      const removed = trimFragments(keep);
      info(`changelog: autopruned ${removed} old shard${removed === 1 ? "" : "s"} → kept newest ${keep} (older preserved in git history)`);
      return 0;
    }

    const entries = loadLegacy();
    if (entries.length <= keep) return 0;
    const removed = entries.length - keep;
    save(entries.slice(0, keep));
    info(`changelog: autopruned ${removed} old entr${removed === 1 ? "y" : "ies"} → kept newest ${keep} (older preserved in git history)`);
    return 0;
  }

  info("usage: sidecar changelog {add \"<title>\"|list [N]|render [N]|prune --keep N|--older-than D|autoprune|migrate [--to-fragments]}");
  return 1;
}
