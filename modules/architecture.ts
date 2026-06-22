// harness architecture {inject|show} — design-SSOT carrier. On SessionStart it
// surfaces the repo-root ARCHITECTURE.json (preferred) or ARCHITECTURE.md as
// additionalContext, so the final-architecture SSOT is in context from the
// first turn — just like CLAUDE.md — without anyone having to open the file.
// The design tree is the c4/c14 SSOT; keeping it salient means edits stay in
// lockstep with the code instead of drifting.
//
// @convergence state=ossified id=ARCH_SNAPSHOT_NOT_HISTORY value="ARCHITECTURE.json/.md is a CURRENT-STATE snapshot tree, not a change log — 'update' means replace the affected node in-place and delete the old wording; NEVER append history/version/dated/previous/deprecated nodes (history → CHANGELOG + git). The inject note carries this every turn so the model stops accreting history into the tree" threshold="the word '갱신형'(updatable) was read as 'add an update entry', so sessions kept leaving version/dated/'이전엔…' nodes in the tree; hardened the every-turn inject note + commons c4 to say snapshot/replace-in-place explicitly"
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { readStdin } from "../lib/exec.ts";

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
    // actually updates+reports per turn instead of only when the user asks. @convergence
    // state=in_flight id=ARCH_INJECT_IGNORED value="갱신 지시가 트리 앞 괄호에 묻혀 모델이 시켜야만 갱신" threshold="지시를 트리 뒤 게이트 줄로 이동 + 갱신 시 보고 의무화"
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
      `architecture lint: ${hits.length} warning(s) - c4 split-piled-cells-into-children` +
        (args.includes("--strict") ? " (--strict: fail)" : " (warn, non-blocking)") + "\n",
    );
    return args.includes("--strict") ? 1 : 0;
  }

  process.stdout.write("usage: harness architecture {inject|show|lint [--strict]}\n");
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
// cells run a few hundred chars; past ~1.5 KB a cell is a subsection in disguise.
const MAX_CELL_CHARS = 1500;
// A leaf gluing more than this many dot-joined items is a child list flattened
// into one string - it belongs in a list block or nested nodes, not one cell.
const MAX_PILED_ITEMS = 10;
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
