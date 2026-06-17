// harness claudemd {inject|show} — project-rules carrier. CLAUDE.md lands in
// context once at SessionStart (Claude Code default), then fades as the
// conversation grows and the per-project rules get forgotten. `inject` re-emits
// the repo-root CLAUDE.md (or just its marked enforce block) as additionalContext
// EACH UserPromptSubmit — the same mechanism `commons inject` uses to keep the
// governance SSOT salient — so project rules stay enforced instead of scrolling
// off. Silent when the repo has no CLAUDE.md.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { readStdin } from "../lib/exec.ts";

// Cap re-injected size so a huge CLAUDE.md never blows the context window each
// turn. Past the cap we inject the head + a pointer back to the file.
const CAP = 80_000;

const HEADER =
  "# project rules (CLAUDE.md · MUST FOLLOW every reply — re-injected each turn, hard rules not hints)\n\n";

// An optional <!-- enforce:start -->…<!-- enforce:end --> block lets a repo
// re-inject ONLY its hard-rules section every turn (cheaper than re-sending the
// whole project map). Absent markers → the whole file (capped).
function extract(raw: string): string {
  const m = raw.match(/<!--\s*enforce:start\s*-->([\s\S]*?)<!--\s*enforce:end\s*-->/);
  const body = (m ? m[1] : raw).trim();
  return body.length > CAP ? body.slice(0, CAP) + "\n\n…(truncated — open CLAUDE.md for the rest)\n" : body;
}

function find(): string | null {
  const p = resolve(REPO_ROOT, "CLAUDE.md");
  return existsSync(p) ? p : null;
}

export async function runClaudemd(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  const p = find();

  if (sub === "show") {
    process.stdout.write(p ? readFileSync(p, "utf8") : "claudemd: no CLAUDE.md at repo root\n");
    return 0;
  }

  if (sub === "inject") {
    if (!p) return 0; // silent when the repo ships no CLAUDE.md
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      const text = HEADER + extract(readFileSync(p, "utf8"));
      process.stdout.write(
        JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: text } }) + "\n",
      );
    } catch {
      return 0;
    }
    return 0;
  }

  process.stdout.write("usage: harness claudemd {inject|show}\n");
  return 1;
}
