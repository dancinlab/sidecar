// harness architecture {inject|show} — design-SSOT carrier. On SessionStart it
// surfaces the repo-root ARCHITECTURE.json (preferred) or ARCHITECTURE.md as
// additionalContext, so the final-architecture SSOT is in context from the
// first turn — just like CLAUDE.md — without anyone having to open the file.
// The design tree is the c4/c14 SSOT; keeping it salient means edits stay in
// lockstep with the code instead of drifting.
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
    const note = isJson
      ? "설계 SSOT (JSON 트리 = AI·툴 파싱용 · 사람은 `python3 serve.py` HTML 뷰어). 코드/설계 변경 시 lockstep 갱신 (commons c4·c14)."
      : "설계 SSOT (최종 아키텍처 = 갱신형). 코드/설계 변경 시 lockstep 갱신 (commons c4·c14).";
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
