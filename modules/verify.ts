// harness verify [rubric | fence "<claim>"]  — tier-rubric claim verification
// (sidecar parity). Routes correctness/purity/grade/identity claims to a 6-tier
// rubric instead of LLM self-judgement; the agent reports the badge verbatim.
//   bare | rubric    → print the rubric + discipline (templates/verify.md)
//   fence "<claim>"  → record a ⚪ SPECULATION-FENCED claim to .verdicts/claims.jsonl
// Running build/test verification COMMANDS is `harness ci`; recording a
// PASS/FAIL command verdict is `harness verdict record`.
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { HARNESS_ROOT, REPO_ROOT } from "../lib/paths.ts";
import { appendJsonl, info, ok, loudFail } from "../lib/log.ts";

export async function runVerify(args: string[]): Promise<number> {
  const sub = args[0] ?? "rubric";

  if (sub === "rubric" || sub === "show") {
    const tpl = resolve(HARNESS_ROOT, "templates", "verify.md");
    if (existsSync(tpl)) process.stdout.write(readFileSync(tpl, "utf8"));
    else info("verify: templates/verify.md missing");
    return 0;
  }

  if (sub === "fence") {
    const claim = args.slice(1).join(" ").trim();
    if (!claim) {
      loudFail('verify fence "<claim>" — record an unverified claim as ⚪ SPECULATION-FENCED');
      return 2;
    }
    const dir = resolve(REPO_ROOT, ".verdicts");
    mkdirSync(dir, { recursive: true });
    appendJsonl(resolve(dir, "claims.jsonl"), { kind: "claim", tier: "SPECULATION-FENCED", badge: "⚪", claim });
    ok(`⚪ SPECULATION-FENCED 박제: "${claim.slice(0, 80)}" → .verdicts/claims.jsonl`);
    info("  (검증되면 harness ci / harness verdict record 로 🟢/🔵 승격)");
    return 0;
  }

  // any other token → treat the whole arg as a claim, show the rubric to grade it
  info(`verify: grade this claim with the rubric below (badge verbatim, no self-promotion) —`);
  info(`  claim: ${args.join(" ").trim()}`);
  const tpl = resolve(HARNESS_ROOT, "templates", "verify.md");
  if (existsSync(tpl)) process.stdout.write("\n" + readFileSync(tpl, "utf8"));
  return 0;
}
