// sidecar architecture {inject|show} — design-SSOT carrier. On SessionStart it
// surfaces the repo-root ARCHITECTURE.json (preferred) or ARCHITECTURE.md as
// additionalContext, so the final-architecture SSOT is in context from the
// first turn — just like CLAUDE.md — without anyone having to open the file.
// The design tree is the c4/c14 SSOT; keeping it salient means edits stay in
// lockstep with the code instead of drifting.
//
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { readStdin } from "../lib/exec.ts";
import { config } from "../lib/config.ts";
import { emitInject } from "../lib/inject.ts";
import { info, ok, loudFail, warn } from "../lib/log.ts";

// Per-turn inject carries a SKELETON (title + summary + 2-level TOC), never the
// full tree — the canonical large-doc pattern: keep a lean pointer salient and
// let the agent pull detail on demand (`show`/`search`/Read). Dumping the whole
// tree every turn blew the 10 KB additionalContext limit → harness file-fallback
// → repeated token cost for content read once. The cap below only guards a
// pathological skeleton; normal output is a few KB.
const CAP = 12_000;

// Repo-root design SSOT, JSON tree preferred over prose (c4 — JSON = AI/tool
// parse target). Returns null when the repo ships neither.
export function designSsot(): { path: string; rel: string } | null {
  for (const rel of ["ARCHITECTURE.json", "ARCHITECTURE.md"]) {
    const p = resolve(REPO_ROOT, rel);
    if (existsSync(p)) return { path: p, rel };
  }
  return null;
}

// internal shorthand — the design SSOT is looked up all over this module.
const pick = designSsot;

type TNode = {
  // English keys are canonical; the Korean/`slug` aliases are legacy and still READ
  // so a mid-migration or other-repo tree keeps resolving.
  name?: string;
  role?: string;
  detail?: string;
  id?: string;
  이름?: string; // legacy alias of name
  역할?: string; // legacy alias of role
  상세?: string; // legacy alias of detail
  value?: string; // alias of detail — the body text key several trees use
  slug?: string; // legacy alias of id
  children?: TNode[];
  [k: string]: unknown;
};

// Field readers — canonical English key first, alias as fallback. A key can hold a
// non-string (a `value` object, say), so every read is narrowed to text: a search that
// lowercases whatever it finds must never meet an object.
const text = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const nodeKey = (n: TNode): string | undefined => text(n.id) ?? text(n.slug); // stable searchable key
const nodeName = (n: TNode): string | undefined => text(n.name) ?? text(n.이름);
const nodeRole = (n: TNode): string | undefined => text(n.role) ?? text(n.역할);
const nodeDetail = (n: TNode): string | undefined => text(n.detail) ?? text(n.상세) ?? text(n.value);

// Two scaffolds are in the wild and both are canonical: a WRAPPER doc ({title, summary,
// tree}) and a doc that IS the root node ({name, children}). Reading only `.tree` gives a
// root-node doc an empty skeleton and crashes the search walk, so every reader goes
// through here.
type ArchDoc = { title?: string; summary?: string; tree?: TNode } & TNode;
function rootNode(doc: unknown): TNode | undefined {
  if (!doc || typeof doc !== "object") return undefined;
  const d = doc as ArchDoc;
  if (d.tree && typeof d.tree === "object") return d.tree;
  return nodeName(d) || d.children ? d : undefined;
}

// Build a 2-level table-of-contents from the JSON tree — enough for the agent to
// know the design's shape (and that the file exists) without carrying every cell.
// Detail lives in the file, pulled via `show`/`search`/Read.
function skeleton(doc: ArchDoc): string {
  const root = rootNode(doc);
  const lines: string[] = [];
  const title = doc.title ?? (doc.tree ? undefined : nodeName(doc));
  if (title) lines.push(title);
  if (doc.summary) lines.push(`요약: ${doc.summary}`);
  const top = root?.children ?? [];
  if (top.length) {
    lines.push("");
    lines.push("목차 (top-level · 2단계 · 전체 트리·`detail`셀은 파일에):");
    for (const c of top) {
      const name = nodeName(c) ?? nodeKey(c) ?? "?";
      const role = nodeRole(c) ? ` — ${nodeRole(c)}` : "";
      lines.push(`- ${name}${role}`);
      for (const g of c.children ?? []) {
        const gn = nodeName(g) ?? nodeKey(g) ?? "?";
        const gr = nodeRole(g) ? ` — ${nodeRole(g)}` : "";
        lines.push(`  - ${gn}${gr}`);
      }
    }
  }
  return lines.join("\n");
}

export async function runArchitecture(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  const found = pick();

  if (sub === "convergence") return convergenceVerb(args.slice(1));
  if (sub === "result" || sub === "results") return resultVerb(args.slice(1));
  // tombstone — `stop-check` and `gate-stop-check` are superseded by the ONE `turn-close check`
  // trio gate. Kept as SILENT no-ops for one release so a stale ~/.claude/settings.json (not yet
  // re-run through `install-hooks`) does not spew a Stop-hook error every turn. Drop once the
  // fleet has re-installed hooks.
  if (sub === "stop-check" || sub === "gate-stop-check") return 0;

  if (sub === "show") {
    if (!found) {
      process.stdout.write("architecture: no ARCHITECTURE.json/.md at repo root\n");
      return 0;
    }
    process.stdout.write(readFileSync(found.path, "utf8"));
    return 0;
  }

  if (sub === "inject") {
    if (!found) return 0; // silent when the repo has no design SSOT
    let text: string;
    try {
      text = readFileSync(found.path, "utf8");
    } catch {
      return 0;
    }
    if (!text.trim()) return 0;
    const isJson = found.rel.endsWith(".json");
    // Carry a SKELETON, not the full tree (large-doc canonical pattern). For JSON
    // that is title + summary + a 2-level TOC; for prose, the head excerpt (its
    // headings already form a TOC). Full detail — every `상세` cell, the whole
    // tree, the convergence store — stays in the file, pulled on demand via
    // `show`/`search`/Read. The convergence learning is delivered TARGETED on
    // file-touch (convergenceForFile), so it is never in this snapshot at all.
    let body: string;
    let lang = "markdown";
    if (isJson) {
      try {
        body = skeleton(JSON.parse(text) as ArchDoc);
      } catch {
        body = text.slice(0, CAP); // invalid JSON → head excerpt as a fallback
      }
    } else {
      body = text.length > CAP ? text.slice(0, CAP) + `\n… (head only — read ${found.rel} for the rest)` : text;
    }
    const pointer =
      `📖 세부 설계는 온디맨드로 — \`sidecar architecture show\` (전체 트리) · ` +
      `\`sidecar architecture search "<질의>"\` (노드 검색) · 또는 ${found.rel} 직접 Read (사람은 \`python3 serve.py\` HTML 뷰어).`;
    const snapshot =
      "⚠️ 현재상태 스냅샷이지 이력 로그 아님 — 변경 시 해당 노드를 제자리 교체(update-in-place)하고 옛 서술은 지운다. " +
      "트리에 변경이력·버전·날짜·`previous`/`이전엔…`/`deprecated` 노드 금지 (이력은 CHANGELOG + git · commons c4).";
    const note = `설계 SSOT 스켈레톤 (전체는 ${found.rel} · 코드/설계 변경 시 lockstep 갱신 · commons c4·c14). ${snapshot}`;
    // The turn-close TRIO directive (all three legs together) now rides `turn-close inject`,
    // per-turn; this session-scoped inject keeps only the one-line design pointer so the tree
    // and the gate guarding it never drift apart.
    const gate =
      "🏛️ 설계·구조 변경 · 게이트 verdict · 실험/벤치 결과 → ARCHITECTURE.json 해당 노드를 제자리 교체(update-in-place · 한 단어 수정·빈 재스테이징은 갱신 아님) 후 턴 마감 트리오의 `🏛️ ARCHITECTURE 갱신: <무엇을>` 줄로 보고 (`turn-close check` 강제 · 갱신 주장은 diff 로 검증).";
    const fence = isJson ? "" : `\n\n\`\`\`${lang}\n${body}\n\`\`\``;
    const ctx = isJson
      ? `🏛️ ARCHITECTURE — ${found.rel} (${note})\n\n${body}\n\n${pointer}\n${gate}`
      : `🏛️ ARCHITECTURE — ${found.rel} (${note})${fence}\n\n${pointer}\n${gate}`;
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      emitInject("architecture", ev, ctx);
    } catch {
      return 0;
    }
    return 0;
  }

  if (sub === "lint") {
    if (!found) {
      process.stdout.write("architecture: no ARCHITECTURE.json at repo root\n");
      return 0;
    }
    const hits = lintArchitectureTree();
    if (hits.length === 0) {
      process.stdout.write("architecture lint: ok (no oversized / piled / history nodes)\n");
      return 0;
    }
    for (const h of hits) process.stdout.write(`  [${h.rule}] ${h.path} - ${h.msg}\n`);
    process.stdout.write(
      `architecture lint: ${hits.length} violation(s) - c4 split-piled-cells-into-children (BLOCK)\n`,
    );
    // Block by default — the design tree MUST stay finely decomposed. The commit
    // gate (lint.ts 4c) already blocks via severity-map (ARCH-* = block); the
    // standalone command mirrors that so `architecture lint` fails the same way.
    return hits.length ? 1 : 0;
  }

  if (sub === "search") {
    const q = args.slice(1).join(" ").trim().toLowerCase();
    if (!found || !found.rel.endsWith(".json")) {
      process.stdout.write("architecture: no ARCHITECTURE.json at repo root (search needs the JSON tree)\n");
      return found ? 1 : 0;
    }
    if (!q) {
      process.stdout.write(
        "usage: sidecar architecture search <query> — substring (case-insensitive) over id / name / role / detail\n",
      );
      return 1;
    }
    let tree: TNode | undefined;
    try {
      tree = rootNode(JSON.parse(readFileSync(found.path, "utf8")));
    } catch {
      process.stdout.write("architecture search: ARCHITECTURE.json is not valid JSON\n");
      return 1;
    }
    if (!tree) {
      process.stdout.write(`architecture search: ${found.rel} carries no node tree (no \`tree\` key, no root node)\n`);
      return 1;
    }
    const hits: { id: string; name: string; role: string; crumb: string }[] = [];
    const walk = (n: TNode, crumb: string[]): void => {
      const key = nodeKey(n);
      const name = nodeName(n) ?? "";
      const role = nodeRole(n);
      const detail = nodeDetail(n);
      // A RENDERED node carries ANY of name/role/detail — the same test `lint` applies when it
      // demands an id (see ARCH-ID-MISSING). Gating the search on `name` alone made every
      // name-less {id, role} tree — the shape the c4 skeleton actually emits — unsearchable:
      // the walk visited each node and tested none, so `search` reported "no node matches" for
      // terms sitting verbatim in the file. Same rendered-node rule on both sides, or the id
      // gate enforces a searchable key that search then refuses to look at.
      const rendered = Boolean(name || role || detail);
      // Breadcrumbs fall back to the id so a name-less tree still yields a readable trail.
      const label = name || key || "";
      const here = label ? [...crumb, label] : crumb;
      if (rendered) {
        const hay = [key, name, role, detail].filter(Boolean).join(" ").toLowerCase();
        if (hay.includes(q)) {
          hits.push({ id: key ?? "(no id)", name: label, role: role ?? "", crumb: crumb.join(" › ") });
        }
      }
      for (const c of n.children ?? []) walk(c, here);
    };
    walk(tree, []);
    if (!hits.length) {
      process.stdout.write(`architecture search: no node matches "${q}"\n`);
      return 0;
    }
    for (const h of hits) {
      // `name` falls back to the id for name-less trees, so don't echo it twice.
      const head = h.name && h.name !== h.id ? `${h.name} — ${h.role}` : h.role;
      process.stdout.write(`  ${h.id}\n      ${head}\n      ↳ ${h.crumb || "(root)"}\n`);
    }
    process.stdout.write(`architecture search: ${hits.length} match(es) for "${q}"\n`);
    return 0;
  }


  process.stdout.write("usage: sidecar architecture {inject|show|search <q>|lint|convergence {list|add|rm|edit}}\n");
  return 1;
}

// --- convergence record CRUD (sidecar architecture convergence …) -------------
// Manage the recurrence-learning store in ARCHITECTURE.json `convergence.records[]`
// via the CLI instead of hand-editing JSON. id-keyed: `add` upserts, `edit` patches,
// `rm` deletes. Free-text value/threshold with shell-special chars: pass `--value -`
// (or `--threshold -`) to read THAT field from stdin (agent-safe, mirrors `ing --stdin`).
function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i < 0 || i + 1 >= args.length) return undefined;
  const v = args[i + 1];
  return v === "-" ? readStdin().trim() : v;
}

function writeConvergence(records: ConvergenceRecord[]): boolean {
  const found = pick();
  if (!found || !found.rel.endsWith(".json")) {
    loudFail("architecture convergence: ARCHITECTURE.json (JSON tree) required");
    return false;
  }
  let root: Record<string, unknown>;
  let raw = "";
  try {
    raw = readFileSync(found.path, "utf8");
    root = JSON.parse(raw);
  } catch {
    loudFail("architecture convergence: ARCHITECTURE.json is not valid JSON");
    return false;
  }
  const conv = (root.convergence as { note?: string; records?: ConvergenceRecord[] }) ?? {};
  conv.records = records;
  root.convergence = conv;
  writeFileSync(found.path, JSON.stringify(root, null, detectJsonIndent(raw)) + "\n");
  return true;
}

// Preserve the existing file's indentation width on rewrite. Forcing a fixed indent onto a
// file authored with a different one reserializes the ENTIRE tree — a downstream repo whose
// ARCHITECTURE.json is indent=1 got a 13k-line churn diff every time this writer touched it,
// re-gating stacked PRs (convergence architecture-json-1, 4× recurrence). Default 2 for a
// new/ambiguous file (the canonical width); otherwise mirror what is already on disk.
function detectJsonIndent(raw: string): number {
  const m = raw.match(/^\{[^\n]*\n( +)"/);
  return m ? m[1].length : 2;
}

async function convergenceVerb(args: string[]): Promise<number> {
  const verb = args[0] ?? "list";
  if (verb === "stop-check") return 0; // tombstone — superseded by `turn-close check` (see above)
  const records = loadConvergence();

  if (verb === "list") {
    if (!records.length) return info("convergence: no records"), 0;
    for (const r of records) info(`  [${convStateLabel(r.state)}] ${r.id}  (${r.source ?? "-"})  ${r.value ?? ""}`);
    info(`convergence: ${records.length} record(s)`);
    return 0;
  }

  // `for <file>` — pull just THIS file's recorded learnings so the agent can review
  // them before recording a new one (the 꺼내서-보고-수정 workflow). Same source-match
  // semantics as convergenceForFile (the on-touch surfacer), so what `for` shows is
  // exactly what a touch will inject. Read-only — the review step, not a mutation.
  if (verb === "for") {
    const file = args[1];
    if (!file) return info("usage: sidecar architecture convergence for <file>"), 1;
    const hits = records.filter((r) => r.source && (r.source === file || file.endsWith("/" + r.source) || r.source.endsWith("/" + file)));
    if (!hits.length) return info(`convergence: ${file} 에 기록된 학습 없음 (새 학습이면 add)`), 0;
    info(`convergence — ${file} 에 박힌 재발방지 학습 ${hits.length}건 (같은 결함이면 edit <id> 로 갱신):`);
    for (const r of hits) info(`  [${convStateLabel(r.state)}] ${r.id} — ${r.value}${r.threshold ? `  (재발조건/해결: ${r.threshold})` : ""}`);
    return 0;
  }

  if (verb === "add") {
    const source = flag(args, "source");
    const state = flag(args, "state") ?? "pos-conv";
    const value = flag(args, "value");
    // source is now REQUIRED — the learning is keyed by (and surfaced on touch of) the
    // file it guards; a record with no source can never be surfaced (convergenceForFile),
    // so the learning would be silently lost. id is AUTO-assigned from the source name
    // (no longer hand-picked) so records stay uniquely keyed by the file they protect.
    if (!source || !value) {
      info('usage: sidecar architecture convergence add --source <file> --value "<핵심>" [--state pos-conv|in-prog|neg-conv] [--threshold "<재발조건/해결>"]');
      info("  · id 는 source 파일명에서 자동 부여(--id 로 명시 upsert override 가능) · value/threshold 셸 특수문자는 --value - 로 stdin");
      return 1;
    }
    if (!CONV_STATES.has(normalizeConvState(state))) return loudFail(`invalid state '${state}' (allowed: ${[...CONV_STATES].join("·")} · legacy ossified/in_flight/failed accepted)`), 1;
    // review-before-append (root-cause · single-doc) — records must not just pile up
    // unclassified. If this source already carries learnings, refuse a BLIND append:
    // surface them so the agent reviews and either refines an existing one (`edit <id>`
    // / explicit `--id` upsert) or — only if it's a genuinely DISTINCT learning —
    // re-runs with `--new` to consciously add. (--id / --new = the reviewed paths.)
    const explicitId = flag(args, "id");
    const isNew = args.includes("--new");
    const sameSource = records.filter((r) => r.source === source);
    if (sameSource.length && !explicitId && !isNew) {
      loudFail(`convergence add: ${source} 에 이미 학습 ${sameSource.length}건 — 무작정 추가 말고 먼저 검토하라:`);
      for (const r of sameSource) info(`  [${convStateLabel(r.state)}] ${r.id} — ${r.value}${r.threshold ? `  (재발조건/해결: ${r.threshold})` : ""}`);
      info("  · 같은 결함의 재발/연장이면 → `architecture convergence edit <id> --value … [--threshold …]` 로 그 레코드 갱신(update-in-place)");
      info("  · 정말 별개의 새 학습이면 → 같은 명령에 `--new` 를 붙여 의식적으로 추가");
      return 1;
    }
    const id = explicitId ?? nextConvergenceId(source, new Set(records.map((r) => r.id ?? "")));
    const rec: ConvergenceRecord = { id, state: normalizeConvState(state), value, threshold: flag(args, "threshold") ?? "", source };
    const idx = records.findIndex((r) => r.id === id);
    if (idx >= 0) records[idx] = rec; // upsert (update-in-place) when an explicit --id matches
    else records.push(rec);
    if (!writeConvergence(records)) return 1;
    ok(`convergence: ${idx >= 0 ? "updated" : "added"} ${id} (source=${source} · ${records.length} total)`);
    return 0;
  }

  if (verb === "edit") {
    const id = args[1] && !args[1].startsWith("--") ? args[1] : flag(args, "id");
    const rec = records.find((r) => r.id === id);
    if (!rec) return loudFail(`convergence edit: no record id=${id ?? "?"}`), 1;
    const st = flag(args, "state");
    if (st !== undefined) {
      if (!CONV_STATES.has(normalizeConvState(st))) return loudFail(`invalid state '${st}' (allowed: ${[...CONV_STATES].join("·")})`), 1;
      rec.state = normalizeConvState(st);
    }
    for (const f of ["value", "threshold", "source"] as const) {
      const v = flag(args, f);
      if (v !== undefined) rec[f] = v;
    }
    if (!writeConvergence(records)) return 1;
    ok(`convergence: edited ${rec.id}`);
    return 0;
  }

  if (verb === "rm") {
    const id = args[1];
    if (!id) return info("usage: sidecar architecture convergence rm <id>"), 1;
    const kept = records.filter((r) => r.id !== id);
    if (kept.length === records.length) return loudFail(`convergence rm: no record id=${id}`), 1;
    if (!writeConvergence(kept)) return 1;
    ok(`convergence: removed ${id} (${kept.length} remain)`);
    return 0;
  }

  info("usage: sidecar architecture convergence {list|for <file>|add --source <f> --value <v> [--state|--threshold|--new]|rm <id>|edit <id> [--state|--value|--threshold|--source]}");
  return 1;
}

// architecture lint - c4 tree_convention enforcement.
// A design tree drifts when one node piles many claims into a single giant
// string instead of splitting into children (c4: "split piled-up cells into one
// child per logical item"). These checks flag that mechanically so the JSON tree
// stays navigable - not a wall of text - and the snapshot never accretes history.
export interface ArchLintHit {
  rule: string;
  path: string;
  msg: string;
}

// A single leaf string past this is a paragraph-in-disguise — keep only the
// crisp kernel (the prose/mechanism/precedent belongs in code + CHANGELOG + git
// per single-doc) or split it into one child node per logical sub-point (c4).
// Config-driven (lint.archCellCap); tightened 1500→700→300 to force a crisp tree
// of short cells, not prose-leaves. 0 = off.
const MAX_CELL_CHARS = config().lint?.archCellCap ?? 300;
// A leaf gluing more than this many dot-joined items is a child list flattened
// into one string - it belongs in a list block or nested nodes, not one cell.
// Config-driven (lint.archPiledMax, default 6 — tightened from 10). 0 = off.
const MAX_PILED_ITEMS = config().lint?.archPiledMax ?? 6;
// Keys that smuggle change-history into a current-state snapshot tree.
const HISTORY_KEYS = new Set(["previous", "deprecated", "history", "changelog", "이전"]);
const PILE_SEP = " · ";

export function lintArchitectureTree(): ArchLintHit[] {
  const found = pick();
  if (!found || !found.rel.endsWith(".json")) return []; // JSON tree only
  let tree: unknown;
  try {
    tree = JSON.parse(readFileSync(found.path, "utf8"));
  } catch {
    return [];
  }
  const hits: ArchLintHit[] = [];
  const idSeen = new Map<string, string>(); // id → first path that used it
  // The id + tree-hygiene gates only recognize the canonical name/children tree
  // (what `sidecar init` scaffolds). Legacy trees use Korean keys (이름/역할/상세) and
  // `slug`; both are still READ (name??이름, id??slug) so a mid-migration tree never
  // goes dark, but English keys + `id` are canonical. A file in a wholly different
  // schema (sections/blocks/title) carries ZERO name-nodes, so the gate finds nothing
  // to check and silently passes — the "id 없어도 통과" trap. Track whether we ever saw
  // a canonical node; if not, surface it (warn) instead of staying a silent no-op.
  let sawTreeNode = false;
  const walk = (node: unknown, path: string): void => {
    if (typeof node === "string") {
      if (MAX_CELL_CHARS > 0 && node.length > MAX_CELL_CHARS) {
        hits.push({
          rule: "ARCH-BIG-CELL",
          path,
          msg: `${node.length}-char leaf > ${MAX_CELL_CHARS} cap — keep the crisp kernel (prose/precedents → CHANGELOG/git) or split into child nodes (c4)`,
        });
      }
      const items = node.split(PILE_SEP).length;
      if (MAX_PILED_ITEMS > 0 && items > MAX_PILED_ITEMS) {
        hits.push({
          rule: "ARCH-PILED",
          path,
          msg: `${items} piled items in one leaf - split into a list/children (c4)`,
        });
      }
    } else if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      // A tree node = any object carrying name (canonical) or 이름 (legacy). Each MUST
      // have a unique kebab-case `id` (legacy alias: `slug`) so `sidecar architecture
      // search` can address it by a stable key. Skip the convergence store (id-keyed,
      // no name) and columns (key/label, no name).
      const nodeName = obj["name"] ?? obj["이름"];
      // A RENDERED tree node carries any of name/role/detail (canonical or legacy 이름/역할/상세)
      // — NOT just `name`. Keying id-enforcement on `name` alone let a node with role/detail but
      // NO name (still drawn in the viewer) dodge the id gate entirely. Broadened so every
      // rendered node needs an id. Structural wrappers (root, `tree` = children-only) and
      // columns (key/label) carry none of these → correctly skipped.
      const isRenderedNode =
        typeof nodeName === "string" ||
        obj["role"] !== undefined || obj["역할"] !== undefined ||
        obj["detail"] !== undefined || obj["상세"] !== undefined;
      if (isRenderedNode && !path.startsWith("root.convergence")) {
        sawTreeNode = true;
        const label = typeof nodeName === "string" && nodeName.trim() ? `"${nodeName}"` : `(unnamed · ${path})`;
        const id = obj["id"] ?? obj["slug"]; // id canonical, slug legacy fallback
        if (typeof id !== "string" || !id.trim()) {
          hits.push({
            rule: "ARCH-ID-MISSING",
            path,
            msg: `tree node ${label} has no id — every rendered node (name/role/detail) needs a stable searchable id (\`sidecar architecture search\`)`,
          });
        } else if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
          hits.push({
            rule: "ARCH-ID-FORMAT",
            path,
            msg: `id "${id}" is not kebab-case ([a-z0-9-], no leading dash) — keep ids grep-clean`,
          });
        } else {
          const prev = idSeen.get(id);
          if (prev) {
            hits.push({
              rule: "ARCH-ID-DUPE",
              path,
              msg: `id "${id}" duplicates ${prev} — ids are the unique search key, must not repeat`,
            });
          } else {
            idSeen.set(id, path);
          }
        }
      }
      for (const [k, v] of Object.entries(obj)) {
        // the top-level `convergence` array is the recurrence-learning store, NOT part
        // of the visual design tree — it has long value/threshold strings by design and
        // its own validator (lintConvergenceRecords); skip it from tree-hygiene checks.
        if (path === "root" && (k === "convergence" || k === "results")) continue;
        if (HISTORY_KEYS.has(k.toLowerCase())) {
          hits.push({
            rule: "ARCH-HISTORY",
            path: `${path}.${k}`,
            msg: `history-flavored key "${k}" - snapshot tree, history goes to CHANGELOG (c4)`,
          });
        }
        walk(v, `${path}.${k}`);
      }
    }
  };
  walk(tree, "root");
  // A JSON ARCHITECTURE file with no canonical name/이름-node means the id + tree-hygiene
  // gates never engaged — flag the silent no-op so an off-schema design doc can't quietly
  // dodge id enforcement (warn, not block: a non-canonical doc shouldn't hard-fail
  // commits, but the inactive gate must be visible). Convergence-only files are exempt.
  if (!sawTreeNode) {
    hits.push({
      rule: "ARCH-SCHEMA-UNRECOGNIZED",
      path: "root",
      msg: "no name/children tree node — id & tree-hygiene gates are INACTIVE (file is not in the canonical tree schema `sidecar init` scaffolds; `sidecar architecture` tooling won't address its nodes)",
    });
  }
  return hits;
}

// --- convergence: recurrence-learning store (ARCHITECTURE.json `convergence.records`) ---
// Recurrence-prevention learnings live in the design SSOT (single-doc), NOT as inline
// code markers. Each record: { id, state, value, threshold, source }. Two consumers:
//   • lintConvergenceRecords — commit gate (well-formed id + valid state)
//   • convergenceForFile     — surfaced when the agent touches `source` (pre hook)
// Convergence-state = the 3-stage CONVERGENCE classification, not a lifecycle flag:
//   pos-conv (🟢 포지티브 수렴)  = the fix/lesson converged POSITIVE — locked in, recurrence held
//   in-prog  (🔄 진행·검토)      = still converging — being worked / under review
//   neg-conv (🔴 네거티브 수렴)  = converged NEGATIVE — the prevention failed / the fix regressed
//   (🔴 = a red/negative outcome; the 🧱 wall stays reserved for the break-walls terminal verdict)
// Legacy lifecycle values (ossified/in_flight/failed…) are still ACCEPTED and normalized on
// read+display, so pre-migration records never hard-fail; `add`/`edit` store the canonical form.
const CONV_STATES = new Set(["pos-conv", "in-prog", "neg-conv"]);
const LEGACY_STATE_ALIAS: Record<string, string> = {
  ossified: "pos-conv", stable: "pos-conv", completed: "pos-conv",
  in_flight: "in-prog", pending: "in-prog", completed_gap: "in-prog",
  failed: "neg-conv", blocked: "neg-conv",
};
export function normalizeConvState(s: string | undefined): string {
  return (s && LEGACY_STATE_ALIAS[s]) || s || "";
}
// display: icon + canonical name (POS-CONV 🟢 · IN-PROG 🔄 · NEG-CONV 🔴), legacy mapped first.
// neg-conv is 🔴 (a red/negative outcome), NOT 🧱 — the 🧱 wall is the break-walls terminal
// verdict (stamped only after multi-lens exhaustion), a distinct concept from a negative convergence.
export function convStateLabel(s: string | undefined): string {
  const n = normalizeConvState(s);
  return n === "pos-conv" ? "🟢 POS-CONV" : n === "in-prog" ? "🔄 IN-PROG" : n === "neg-conv" ? "🔴 NEG-CONV" : (s ?? "?");
}

export interface ConvergenceRecord {
  id?: string;
  state?: string;
  value?: string;
  threshold?: string;
  source?: string;
}

// auto-assign a stable, readable id from the source filename: `<slug>-<n>`, where slug is
// the sanitized basename and n is the smallest free numeric suffix (collision-free across
// rm/re-add). ids are no longer hand-picked — `add` derives one so the agent supplies only
// the file + the learning, and every record stays uniquely keyed to the file it guards.
export function nextConvergenceId(source: string, existing: Set<string>): string {
  const base = source.split("/").pop() ?? source;
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "conv";
  for (let n = 1; ; n++) {
    const id = `${slug}-${n}`;
    if (!existing.has(id)) return id;
  }
}

export function loadConvergence(): ConvergenceRecord[] {
  const found = pick();
  if (!found || !found.rel.endsWith(".json")) return [];
  try {
    const j = JSON.parse(readFileSync(found.path, "utf8")) as { convergence?: { records?: ConvergenceRecord[] } };
    return j.convergence?.records ?? [];
  } catch {
    return [];
  }
}

// commit-time validator (lint 4d) — a malformed record can't be surfaced on file-touch,
// so the learning is silently lost. Mechanically enforces id + a valid state.
export function lintConvergenceRecords(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  loadConvergence().forEach((r, i) => {
    const at = r.id ? `id=${r.id}` : `record[${i}]`;
    if (!r.id) out.push(`convergence ${at} — missing required key: id`);
    else if (seen.has(r.id)) out.push(`convergence ${at} — duplicate id (records are id-keyed, update in place)`);
    else seen.add(r.id);
    if (!r.state) out.push(`convergence ${at} — missing required key: state`);
    else if (!CONV_STATES.has(normalizeConvState(r.state))) out.push(`convergence ${at} — invalid state '${r.state}' (allowed: ${[...CONV_STATES].join("·")} · legacy ossified/in_flight/failed accepted)`);
  });
  return out;
}

// per-file surfacing — when the agent touches a file, return the recurrence learnings
// recorded against it so it doesn't reintroduce a fixed defect. Empty string = none.
export function convergenceForFile(file: string): string {
  if (!file) return "";
  const rel = file.startsWith(REPO_ROOT) ? file.slice(REPO_ROOT.length).replace(/^\/+/, "") : file;
  const hits = loadConvergence().filter((r) => r.source && (r.source === rel || rel.endsWith("/" + r.source)));
  if (!hits.length) return "";
  const lines = hits.map(
    (r) => `  • [${convStateLabel(r.state)}] ${r.id} — ${r.value}${r.threshold ? `  (재발조건/해결: ${r.threshold})` : ""}`,
  );
  return (
    `🛡️ convergence — ${rel} 에 박힌 재발방지 학습 ${hits.length}건 (ARCHITECTURE.json · 같은 결함 재도입 금지):\n` +
    lines.join("\n")
  );
}

// --- results store: DISCARDED (owner decision) — experiment/bench verdicts go DIRECTLY into the
// ARCHITECTURE.json `type:"gate"` node's `verdict` field (update-in-place, enforced by the turn-close trio gate),
// NOT a separate accumulation store (it duplicated HYPOTHESES.jsonl + drifted). The `result` verb is a
// tombstone that refuses and redirects, so no session re-populates the removed store.
async function resultVerb(_args: string[]): Promise<number> {
  loudFail(
    "architecture result: the separate result store is DISCARDED. 실험/벤치 verdict 는 별도 store 가 아니라 " +
      'ARCHITECTURE.json 의 해당 `type:"gate"` 노드 `verdict` 를 직접 update-in-place 하라 ' +
      "(`sidecar architecture search <gate>` 로 노드 찾기 → Edit). 턴 마감 트리오의 🏛️ 줄(`turn-close check`)이 이를 강제한다.",
  );
  return 1;
}
