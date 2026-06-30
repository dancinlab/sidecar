// sidecar ship [--no-doc]
// One-shot propagation: after an implementation cycle, push the change to EVERY
// surface a sidecar install lives on, in the one correct order — so a feature can
// never land on one surface (merged) while silently missing another (slash command
// invisible because the shadow mirror was never refreshed).
//
//   0. qa          — all-PASS pre-flight gate (ci · lint · audit no-zero-axis)
//   1. pr-cycle    — doc-gate → push → PR → verified merge → local main ff-sync
//   2. self-update — git-pull the GLOBAL CLI clone (~/.sidecar/cli) to the just-merged main
//   3. shadow      — re-mirror commands/ → ~/.claude/commands/ as bare /cmd delegators
//
import { info, ok, loudFail } from "../lib/log.ts";
import { runQa } from "./qa.ts";
import { runPrCycle } from "./pr-cycle.ts";
import { runSelfUpdate } from "./setup.ts";
import { runShadow } from "./shadow.ts";

export async function runShip(args: string[]): Promise<number> {
  // 0. QA pre-flight — the formal all-PASS bar. Never propagate a red harness to any
  // surface. No bypass flag by design (no-escape-hatch): a red check is a STOP — fix it.
  info("ship: 1/4 — qa (all-PASS pre-flight gate)…");
  const qa = await runQa([]);
  if (qa !== 0) {
    loudFail("ship: qa FAILED — STOP. nothing pushed/merged/propagated. fix the red checks then re-run `sidecar ship`.");
    return qa;
  }

  // forward pr-cycle flags (e.g. --no-doc for config/data-only changes)
  info("ship: 2/4 — pr-cycle (verified merge to main)…");
  const merged = await runPrCycle(args);
  if (merged !== 0) {
    loudFail("ship: pr-cycle failed — STOP. global CLI + shadow NOT touched (nothing merged to propagate).");
    return merged;
  }

  // global CLI clone (~/.sidecar/cli) git-pulls the merged main — terminal `sidecar …` current.
  info("ship: 3/4 — self-update (global CLI ~/.sidecar/cli)…");
  const updated = await runSelfUpdate([]);
  if (updated !== 0) {
    loudFail("ship: self-update failed — merge landed but global CLI is STALE. fix then re-run `sidecar self-update`.");
    return updated;
  }

  // re-mirror commands/ so any NEW slash delegator appears in the picker (shadow is the
  // command source — plugin.json ships commands:[], so this step is what makes /cmd visible).
  info("ship: 4/4 — shadow (mirror slash commands → ~/.claude/commands)…");
  const mirrored = runShadow([]);
  if (mirrored !== 0) {
    loudFail("ship: shadow failed — merge + global CLI current, but new slash commands may be missing. re-run `sidecar shadow`.");
    return mirrored;
  }

  ok("ship: propagated to all surfaces (merge ✓ · global CLI ✓ · shadow ✓).");
  info("  • new slash commands → reload Claude Code (/reload-plugins or restart) to pick them up.");
  info("  • plugin-install users (/plugin) refresh separately via `/plugin update` after a version bump.");
  return 0;
}
