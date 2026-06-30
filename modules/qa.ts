// sidecar qa [--min <n>]
// The formal "all-PASS" QA bar for the harness itself, run as `ship`'s pre-flight so
// nothing ever propagates on a red harness. Aggregates the three canonical health
// checks into ONE verdict (each is the existing canonical command — no new logic):
//   1. ci    — configured verify.checks (typecheck/build/test) must pass
//   2. lint  — staged-L0 + freshness + CHANGELOG + convergence + INJECT-OVERSIZED caps
//   3. audit — 6-axis self-scorecard: NO axis may sit at 0 (a dead/inverted gate);
//              optional --min raises the bar to a minimum total.
// Exit 0 only when every check passes; 1 otherwise — so `ship` (and CI) can hard-gate
// on it. No `--skip` escape hatch by design (no-escape-hatch): fix the red, don't bypass.
import { info, ok, loudFail } from "../lib/log.ts";
import { runCi } from "./ci.ts";
import { runLint } from "./lint.ts";
import { score } from "./audit.ts";

type Check = { name: string; pass: boolean; detail: string };

export async function runQa(args: string[]): Promise<number> {
  const minIdx = args.indexOf("--min");
  const min = minIdx >= 0 ? Number(args[minIdx + 1]) || 0 : 0;
  const results: Check[] = [];

  // ci and lint print their own output and return 0 (pass) / non-0 (fail). lint also
  // appends a clean run to the log, which keeps the audit window honest.
  info("qa: 1/3 — ci (verify checks)…");
  const ci = await runCi([]);
  results.push({ name: "ci", pass: ci === 0, detail: ci === 0 ? "checks passed" : "a check FAILED" });

  info("qa: 2/3 — lint (L0 · injectCaps · CHANGELOG · convergence)…");
  const lint = await runLint([]);
  results.push({ name: "lint", pass: lint === 0, detail: lint === 0 ? "no blocking violations" : "blocking violations" });

  info("qa: 3/3 — audit (no-zero-axis self-scorecard)…");
  const { scores, total, max } = score();
  const deadAxes = Object.entries(scores).filter(([, v]) => v <= 0).map(([k]) => k);
  const auditPass = deadAxes.length === 0 && total >= min;
  results.push({
    name: "audit",
    pass: auditPass,
    detail: deadAxes.length
      ? `${total}/${max} · DEAD axes: ${deadAxes.join(", ")}`
      : `${total}/${max}${min ? ` (min ${min})` : ""} · all axes live`,
  });

  const failed = results.filter((r) => !r.pass);
  info("");
  info("┌─ QA (all-PASS bar) ───────────────────");
  for (const r of results) info(`│ ${r.pass ? "🟢 PASS" : "🔴 FAIL"}  ${r.name.padEnd(6)} ${r.detail}`);
  info("└───────────────────────────────────────");

  if (failed.length) {
    loudFail(`qa: ${failed.length}/${results.length} FAILED (${failed.map((r) => r.name).join(", ")}) — fix before ship.`);
    return 1;
  }
  ok(`qa: all-PASS (ci · lint · audit ${total}/${max}).`);
  return 0;
}
