// harness commons {inject|show} — cross-project governance carrier (the harness
// governance SSOT). `inject` emits config/commons.md (or a repo override at
// .harness/commons.md) as additionalContext, re-injected each turn so the
// always-on rules never fade from context. The discrete rules are also
// mechanically enforced by harness hooks (root-cause/pre write · verify ·
// bypass · docs · tmp-guard · handoff-guard · git-guard · recommend · askq);
// this is the salient single SSOT, re-injected like recommend.
import { readFileSync } from "node:fs";
import { resolveRuleFile } from "../lib/config.ts";
import { readStdin } from "../lib/exec.ts";

function body(): string {
  const f = resolveRuleFile(".harness/commons.md", "commons.md");
  try {
    return readFileSync(f, "utf8");
  } catch {
    return "";
  }
}

export async function runCommons(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  const text = body();
  if (sub === "show") {
    process.stdout.write(text);
    return 0;
  }
  if (sub === "inject") {
    if (!text) return 0;
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: text } }) + "\n");
    } catch {
      return 0;
    }
    return 0;
  }
  process.stdout.write("usage: harness commons {inject|show}\n");
  return 1;
}
