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
    const ctx = `🏛️ ARCHITECTURE — ${found.rel} (${note})\n\n\`\`\`${lang}\n${text}${tail}\n\`\`\``;
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

  process.stdout.write("usage: harness architecture {inject|show}\n");
  return 1;
}
