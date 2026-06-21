// harness ship [--no-doc]
// One-shot propagation: after an implementation cycle, push the change to EVERY
// surface a harness install lives on, in the one correct order — so a feature can
// never land on one surface (merged) while silently missing another (slash command
// invisible because the shadow mirror was never refreshed).
//
//   1. pr-cycle    — doc-gate → push → PR → verified merge → local main ff-sync
//   2. self-update — git-pull the GLOBAL CLI clone (~/.harness/cli) to the just-merged main
//   3. shadow      — re-mirror commands/ → ~/.claude/commands/ as bare /cmd delegators
//
// @convergence state=ossified id=SHIP_PROPAGATE_ALL_SURFACES value="merge+self-update+shadow must run as one unit" threshold="adding a slash command then running only pr-cycle+self-update left the shadow mirror stale → /fleet-abstract invisible; ship bundles all three"
import { info, ok, loudFail } from "../lib/log.ts";
import { runPrCycle } from "./pr-cycle.ts";
import { runSelfUpdate } from "./setup.ts";
import { runShadow } from "./shadow.ts";

export async function runShip(args: string[]): Promise<number> {
  // forward pr-cycle flags (e.g. --no-doc for config/data-only changes)
  info("ship: 1/3 — pr-cycle (verified merge to main)…");
  const merged = await runPrCycle(args);
  if (merged !== 0) {
    loudFail("ship: pr-cycle failed — STOP. global CLI + shadow NOT touched (nothing merged to propagate).");
    return merged;
  }

  // global CLI clone (~/.harness/cli) git-pulls the merged main — terminal `harness …` current.
  info("ship: 2/3 — self-update (global CLI ~/.harness/cli)…");
  const updated = await runSelfUpdate([]);
  if (updated !== 0) {
    loudFail("ship: self-update failed — merge landed but global CLI is STALE. fix then re-run `harness self-update`.");
    return updated;
  }

  // re-mirror commands/ so any NEW slash delegator appears in the picker (shadow is the
  // command source — plugin.json ships commands:[], so this step is what makes /cmd visible).
  info("ship: 3/3 — shadow (mirror slash commands → ~/.claude/commands)…");
  const mirrored = runShadow([]);
  if (mirrored !== 0) {
    loudFail("ship: shadow failed — merge + global CLI current, but new slash commands may be missing. re-run `harness shadow`.");
    return mirrored;
  }

  ok("ship: propagated to all surfaces (merge ✓ · global CLI ✓ · shadow ✓).");
  info("  • new slash commands → reload Claude Code (/reload-plugins or restart) to pick them up.");
  info("  • plugin-install users (/plugin) refresh separately via `/plugin update` after a version bump.");
  return 0;
}
