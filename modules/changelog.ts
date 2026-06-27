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
//
import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { REPO_ROOT } from "../lib/paths.ts";
import { readStdin } from "../lib/exec.ts";
import { info, ok, warn } from "../lib/log.ts";

interface Entry {
  ts: string | null; // YYYY-MM-DD, or null for undated (migrated history)
  title: string;
  body: string;
}

const FILE = () => resolve(REPO_ROOT, "CHANGELOG.jsonl");

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

function load(): Entry[] {
  const p = FILE();
  if (!existsSync(p)) return [];
  const out: Entry[] = [];
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try {
      const j = JSON.parse(s) as Entry;
      if (typeof j.title === "string") out.push({ ts: j.ts ?? null, title: j.title, body: j.body ?? "" });
    } catch {
      /* skip a malformed line rather than lose the whole file */
    }
  }
  return out;
}

// newest-first on disk: one compact JSON object per line.
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
    const entries = load();
    entries.unshift({ ts: today(), title, body }); // newest-first
    const keep = keepN();
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
    const entries = load();
    const before = entries.length;
    const keep = flag(args, "--keep");
    const older = flag(args, "--older-than");
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
    const mdPath = resolve(REPO_ROOT, "CHANGELOG.md");
    if (!existsSync(mdPath)) {
      warn("changelog migrate: no CHANGELOG.md to migrate");
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
    const entries = load();
    const keep = Number(flag(args, "--keep")) > 0 ? Number(flag(args, "--keep")) : keepN();
    if (entries.length <= keep) return 0;
    const removed = entries.length - keep;
    save(entries.slice(0, keep));
    info(`changelog: autopruned ${removed} old entr${removed === 1 ? "y" : "ies"} → kept newest ${keep} (older preserved in git history)`);
    return 0;
  }

  info("usage: sidecar changelog {add \"<title>\"|list [N]|render [N]|prune --keep N|--older-than D|autoprune|migrate}");
  return 1;
}
