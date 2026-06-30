// sidecar audit [full|summary|json]
// A 6-axis self-scorecard (each 0-10, total /60) derived from the JSONL logs +
// config, so you can watch the sidecar's own health trend over time.
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

// Lifetime-cumulative logs saturate ratio metrics to 0 forever (an artifact:
// quality_gate compared per-VIOLATION error rows to per-RUN lint rows, and cost
// counted pre_block guard-firings — the harness DOING its job — as "mistakes").
// Window the operational logs to the recent period so the score reflects CURRENT
// health and can recover, honouring this module's "watch the health trend over
// time" intent. We do NOT prune the logs (no evidence destruction) — only read a
// recent slice. WINDOW_DAYS is the trend horizon.
const WINDOW_DAYS = 14;
function recent<T extends { ts?: string; time?: string }>(rows: T[]): T[] {
  const cut = Date.now() - WINDOW_DAYS * 86_400_000;
  return rows.filter((r) => {
    const t = Date.parse(r.ts ?? r.time ?? "");
    return Number.isFinite(t) ? t >= cut : true; // undated rows count as recent
  });
}

export function score(): { scores: Record<string, number>; total: number; max: number } {
  const cfg = config();
  const lintRuns = recent(readJsonl(LOGS.lint)).length;
  const errs = recent(readJsonl(LOGS.errors)).length;
  const obs = recent(readJsonl(LOGS.observations)).length;
  const blocks = recent(readJsonl(LOGS.mistakes)).length;

  const enforcementRules = countEnforcementRules();
  const verifyChecks = cfg.verify.checks?.length ?? 0;
  const guidesPresent = (cfg.guides ?? []).filter((g) => existsSync(repoPath(g))).length;

  // quality_gate: lint gate health — full marks while wired and recent runs are not
  // error-storming. errs ÷ runs is avg violations/run (both windowed = dimensionally
  // sound); forgiving slope because a CAUGHT violation is the gate working, not a
  // lingering defect.
  const violPerRun = lintRuns > 0 ? errs / lintRuns : 0;
  // cost: pre_block guard-firings PREVENT cost (bad command stopped pre-run), so they
  // are not penalised 1:1; only a high block-to-activity ratio (thrash) docks points.
  const thrash = obs > 0 ? blocks / obs : 0;

  const scores = {
    tool_coverage: clamp((verifyChecks > 0 ? 4 : 0) + (enforcementRules > 0 ? 4 : 0) + 2),
    enforcement: clamp(enforcementRules), // 1 pt per rule, capped 10
    quality_gate: clamp(lintRuns > 0 ? 10 - Math.max(0, violPerRun - 1) * 2.5 : 0),
    memory: clamp(guidesPresent * 3 + (cfg.lockdown.files.length > 0 ? 1 : 0)),
    eval: clamp(obs / 20),
    cost: clamp(obs > 0 ? 10 - Math.max(0, thrash - 0.5) * 20 : 10),
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
  info(`sidecar audit — ${result.total}/${result.max}`);
  for (const [k, v] of Object.entries(result.scores)) {
    info(`  ${k.padEnd(14)} ${String(v).padStart(2)}/10  ${"▓".repeat(v)}${"░".repeat(10 - v)}`);
  }
  return 0;
}
