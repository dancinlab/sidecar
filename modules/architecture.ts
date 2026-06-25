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
import { info, ok, loudFail } from "../lib/log.ts";

// Cap injected size so a huge tree never blows the context window. ~80 KB is
// well under a typical CLAUDE.md budget; past it we inject the head + a pointer.
const CAP = 80_000;

// Repo-root design SSOT, JSON tree preferred over prose (c4 — JSON = AI/tool
// parse target). Returns null when the repo ships neither.
function pick(): { path: string; rel: string } | null {
  for (const rel of ["ARCHITECTURE.json", "ARCHITECTURE.md"]) {
    const p = resolve(REPO_ROOT, rel);
    if (existsSync(p)) return { path: p, rel };
  }
  return null;
}

export async function runArchitecture(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  const found = pick();

  if (sub === "convergence") return convergenceVerb(args.slice(1));

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
    // Per-turn re-inject must NOT carry the `convergence` learning store — it can be
    // large (one record per recurrence) and is delivered TARGETED on file-touch
    // (convergenceForFile), so dumping all records every UserPromptSubmit is pure
    // token waste. Strip it from the injected snapshot only (file/show/lint keep it).
    if (found.rel.endsWith(".json")) {
      try {
        const obj = JSON.parse(text) as Record<string, unknown>;
        if (obj.convergence) {
          const n = (obj.convergence as { records?: unknown[] }).records?.length ?? 0;
          delete obj.convergence;
          text = JSON.stringify(obj, null, 2) + `\n(convergence: ${n} record(s) omitted — surfaced per-file on touch · \`sidecar architecture convergence list\`)`;
        }
      } catch {
        /* invalid JSON → inject raw text as-is */
      }
    }
    let tail = "";
    if (text.length > CAP) {
      text = text.slice(0, CAP);
      tail = `\n… (truncated at ${CAP} chars — read ${found.rel} for the full tree)`;
    }
    const isJson = found.rel.endsWith(".json");
    const lang = isJson ? "json" : "markdown";
    const snapshot =
      "⚠️ 현재상태 스냅샷이지 이력 로그 아님 — 변경 시 해당 노드를 제자리 교체(update-in-place)하고 옛 서술은 지운다. " +
      "트리에 변경이력·버전·날짜·`previous`/`이전엔…`/`deprecated` 노드 금지 (이력은 CHANGELOG + git · commons c4).";
    const note = isJson
      ? `설계 SSOT (JSON 트리 = AI·툴 파싱용 · 사람은 \`python3 serve.py\` HTML 뷰어). 코드/설계 변경 시 lockstep 갱신 (commons c4·c14). ${snapshot}`
      : `설계 SSOT (최종 아키텍처 = 갱신형). 코드/설계 변경 시 lockstep 갱신 (commons c4·c14). ${snapshot}`;
    // Turn-close gate placed AFTER the tree (recency = most-attended) so the model
    // actually updates+reports per turn instead of only when the user asks.
    // (recurrence learning ARCH_INJECT_IGNORED → ARCHITECTURE.json convergence array.)
    const gate =
      "🏛️ 턴 마감 게이트 — 이번 턴에 코드·구조·데이터흐름을 바꿨으면 **지금** 위 트리의 해당 노드를 제자리 교체(update-in-place)하고, " +
      "응답에 `🏛️ ARCHITECTURE 갱신: <무엇을>` 한 줄로 보고하라. 안 바꿨으면 트리 그대로 두고 보고도 생략 (안 했으면서 했다고 말하지 말 것).";
    const ctx = `🏛️ ARCHITECTURE — ${found.rel} (${note})\n\n\`\`\`${lang}\n${text}${tail}\n\`\`\`\n${gate}`;
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: ctx } }) + "\n");
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

  process.stdout.write("usage: sidecar architecture {inject|show|lint|convergence {list|add|rm|edit}}\n");
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
  try {
    root = JSON.parse(readFileSync(found.path, "utf8"));
  } catch {
    loudFail("architecture convergence: ARCHITECTURE.json is not valid JSON");
    return false;
  }
  const conv = (root.convergence as { note?: string; records?: ConvergenceRecord[] }) ?? {};
  conv.records = records;
  root.convergence = conv;
  writeFileSync(found.path, JSON.stringify(root, null, 2) + "\n");
  return true;
}

async function convergenceVerb(args: string[]): Promise<number> {
  const verb = args[0] ?? "list";
  const records = loadConvergence();

  if (verb === "list") {
    if (!records.length) return info("convergence: no records"), 0;
    for (const r of records) info(`  [${r.state}] ${r.id}  (${r.source ?? "-"})  ${r.value ?? ""}`);
    info(`convergence: ${records.length} record(s)`);
    return 0;
  }

  if (verb === "add") {
    const id = flag(args, "id");
    const state = flag(args, "state") ?? "ossified";
    const value = flag(args, "value");
    if (!id || !value) {
      info('usage: sidecar architecture convergence add --id <ID> --state <s> --value "<핵심>" [--threshold "<재발조건>"] [--source <file>]');
      info("  (value/threshold 에 셸 특수문자: --value - 로 stdin 읽기)");
      return 1;
    }
    if (!CONV_STATES.has(state)) return loudFail(`invalid state '${state}' (allowed: ${[...CONV_STATES].join("·")})`), 1;
    const rec: ConvergenceRecord = { id, state, value, threshold: flag(args, "threshold") ?? "", source: flag(args, "source") ?? "" };
    const idx = records.findIndex((r) => r.id === id);
    if (idx >= 0) records[idx] = rec; // upsert (update-in-place)
    else records.push(rec);
    if (!writeConvergence(records)) return 1;
    ok(`convergence: ${idx >= 0 ? "updated" : "added"} ${id} (${records.length} total)`);
    return 0;
  }

  if (verb === "edit") {
    const id = args[1] && !args[1].startsWith("--") ? args[1] : flag(args, "id");
    const rec = records.find((r) => r.id === id);
    if (!rec) return loudFail(`convergence edit: no record id=${id ?? "?"}`), 1;
    const st = flag(args, "state");
    if (st !== undefined) {
      if (!CONV_STATES.has(st)) return loudFail(`invalid state '${st}'`), 1;
      rec.state = st;
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

  info("usage: sidecar architecture convergence {list|add|rm <id>|edit <id> [--state|--value|--threshold|--source]}");
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

// A single leaf string past this should be decomposed into child nodes. Normal
// cells run a few hundred chars; past ~700 a cell is a subsection in disguise —
// break it into one child node per logical sub-point (c4). Tightened from 1500
// to force a finely-split tree instead of paragraph-leaves.
const MAX_CELL_CHARS = 700;
// A leaf gluing more than this many dot-joined items is a child list flattened
// into one string - it belongs in a list block or nested nodes, not one cell.
// Tightened from 10 → 6 so piled enumerations decompose into child nodes.
const MAX_PILED_ITEMS = 6;
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
  const walk = (node: unknown, path: string): void => {
    if (typeof node === "string") {
      if (node.length > MAX_CELL_CHARS) {
        hits.push({
          rule: "ARCH-BIG-CELL",
          path,
          msg: `${node.length}-char leaf - split into child nodes (c4: one logical item per node)`,
        });
      }
      const items = node.split(PILE_SEP).length;
      if (items > MAX_PILED_ITEMS) {
        hits.push({
          rule: "ARCH-PILED",
          path,
          msg: `${items} piled items in one leaf - split into a list/children (c4)`,
        });
      }
    } else if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        // the top-level `convergence` array is the recurrence-learning store, NOT part
        // of the visual design tree — it has long value/threshold strings by design and
        // its own validator (lintConvergenceRecords); skip it from tree-hygiene checks.
        if (path === "root" && k === "convergence") continue;
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
  return hits;
}

// --- convergence: recurrence-learning store (ARCHITECTURE.json `convergence.records`) ---
// Recurrence-prevention learnings live in the design SSOT (single-doc), NOT as inline
// code markers. Each record: { id, state, value, threshold, source }. Two consumers:
//   • lintConvergenceRecords — commit gate (well-formed id + valid state)
//   • convergenceForFile     — surfaced when the agent touches `source` (pre hook)
const CONV_STATES = new Set([
  "ossified", "stable", "in_flight", "pending", "completed", "completed_gap", "failed", "blocked",
]);

export interface ConvergenceRecord {
  id?: string;
  state?: string;
  value?: string;
  threshold?: string;
  source?: string;
}

function loadConvergence(): ConvergenceRecord[] {
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
    else if (!CONV_STATES.has(r.state)) out.push(`convergence ${at} — invalid state '${r.state}' (allowed: ${[...CONV_STATES].join("·")})`);
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
    (r) => `  • [${r.state}] ${r.id} — ${r.value}${r.threshold ? `  (재발조건/해결: ${r.threshold})` : ""}`,
  );
  return (
    `🛡️ convergence — ${rel} 에 박힌 재발방지 학습 ${hits.length}건 (ARCHITECTURE.json · 같은 결함 재도입 금지):\n` +
    lines.join("\n")
  );
}
