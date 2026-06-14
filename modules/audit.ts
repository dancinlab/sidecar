// harness audit [full|summary|json]
// A 6-axis self-scorecard (each 0-10, total /60) derived from the JSONL logs +
// config, so you can watch the harness's own health trend over time.
import { existsSync } from "node:fs";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl, info } from "../lib/log.ts";
import { readJsonl } from "../lib/json.ts";
import { config, repoPath, resolveRuleFile } from "../lib/config.ts";
import { readJsonOr } from "../lib/json.ts";

function clamp(n: number): number {
  return Math.max(0, Math.min(10, Math.round(n)));
}

function countEnforcementRules(): number {
  const file = resolveRuleFile(config().enforcementFile, "enforcement.json");
  const e = readJsonOr<{ pre_bash?: unknown[]; pre_write?: unknown[]; prompt_hints?: unknown[] }>(file, {});
  return (e.pre_bash?.length ?? 0) + (e.pre_write?.length ?? 0) + (e.prompt_hints?.length ?? 0);
}

export function score(): { scores: Record<string, number>; total: number; max: number } {
  const cfg = config();
  const lints = readJsonl(LOGS.lint).length;
  const errs = readJsonl(LOGS.errors).length;
  const obs = readJsonl(LOGS.observations).length;
  const mistakes = readJsonl(LOGS.mistakes).length;

  const enforcementRules = countEnforcementRules();
  const verifyChecks = cfg.verify.checks?.length ?? 0;
  const guidesPresent = (cfg.guides ?? []).filter((g) => existsSync(repoPath(g))).length;

  const scores = {
    tool_coverage: clamp((verifyChecks > 0 ? 4 : 0) + (enforcementRules > 0 ? 4 : 0) + 2),
    enforcement: clamp(enforcementRules), // 1 pt per rule, capped 10
    quality_gate: clamp(10 - (errs / Math.max(lints, 1)) * 10),
    memory: clamp(guidesPresent * 3 + (cfg.lockdown.files.length > 0 ? 1 : 0)),
    eval: clamp(obs / 20),
    cost: clamp(10 - (mistakes / Math.max(obs, 1)) * 50),
  };
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return { scores, total, max: 60 };
}

export async function runAudit(args: string[]): Promise<number> {
  const mode = args[0] ?? "full";
  const result = score();
  if (mode === "json") {
    process.stdout.write(JSON.stringify(result) + "\n");
    return 0;
  }
  appendJsonl(LOGS.audit, { kind: "audit", ...result });
  if (mode === "summary") {
    info(`audit: ${result.total}/${result.max}`);
    return 0;
  }
  info(`harness audit — ${result.total}/${result.max}`);
  for (const [k, v] of Object.entries(result.scores)) {
    info(`  ${k.padEnd(14)} ${String(v).padStart(2)}/10  ${"▓".repeat(v)}${"░".repeat(10 - v)}`);
  }
  return 0;
}
