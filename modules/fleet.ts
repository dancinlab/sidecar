// harness fleet [lab|abstract|full] [name:goal,...|go|stop|status]
// Perpetual multi-lane orchestrator runbook. Manages a lane roster under
// .harness/fleet/ and prints the runbook the agent follows (fire-on-arrival:
// each lane relaunches its next round the moment it lands).
//
// Modes share the engine, differ only in roster file + runbook + vocabulary:
//   fleet     — generic build/implement lanes  (.harness/fleet/active)
//   lab       — research-driven frontier lab    (.harness/fleet/lab · research-gate)
//   abstract  — abstraction-driven layer dive   (.harness/fleet/abstract · peel→meta-law→escape)
//   full      — full-stack campaign             (.harness/fleet/full · research→implement→abstract→falsify, auto-phase)
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { HARNESS_ROOT, REPO_ROOT } from "../lib/paths.ts";
import { info, ok } from "../lib/log.ts";

type Mode = "fleet" | "lab" | "abstract" | "full";

// per-mode config — separate roster so a build-fleet, a research-lab, and an
// abstraction dive can coexist in the same repo without clobbering each other.
const MODES: Record<Mode, { label: string; unit: string; roster: string; tpl: string; specHint: string }> = {
  fleet: {
    label: "fleet", unit: "lane", roster: "active", tpl: "fleet.md",
    specHint: "pass `name:goal, …` or infer lanes from the prior turn.",
  },
  lab: {
    label: "fleet-lab", unit: "frontier", roster: "lab", tpl: "fleet-lab.md",
    specHint: "pass `frontier:wall, …` or infer frontiers from ARCHITECTURE.json blocking-frontiers.",
  },
  abstract: {
    label: "fleet-abstract", unit: "layer", roster: "abstract", tpl: "fleet-abstract.md",
    specHint: "pass `layer:seed, …` or infer layers from ARCHITECTURE.json LAWS (peel the accumulated laws).",
  },
  full: {
    label: "fleet-full", unit: "frontier", roster: "full", tpl: "fleet-full.md",
    specHint: "pass `frontier:goal, …` — each frontier auto-phases research→implement→abstract→falsify.",
  },
};

export async function runFleet(args: string[]): Promise<number> {
  // leading mode token: `fleet lab|abstract|full …` (default = generic fleet).
  let mode: Mode = "fleet";
  if (args[0] === "lab" || args[0] === "abstract" || args[0] === "full") {
    mode = args[0];
    args = args.slice(1);
  }
  const cfg = MODES[mode];
  const arg = args.join(" ").trim();
  const roster = resolve(REPO_ROOT, ".harness", "fleet", cfg.roster);

  if (arg === "stop") {
    if (existsSync(roster)) rmSync(roster);
    ok(`${cfg.label}: roster cleared — in-flight ${cfg.unit}s drain, no relaunch.`);
    return 0;
  }
  if (arg === "status") {
    if (!existsSync(roster)) {
      info(`${cfg.label}: no active roster.`);
      return 0;
    }
    info(`${cfg.label} ${cfg.unit}s (.harness/fleet/${cfg.roster}):`);
    for (const l of readFileSync(roster, "utf8").split("\n").filter(Boolean)) info(`  • ${l}`);
    return 0;
  }

  // open / continue
  if (arg && arg !== "go") {
    // "name:goal, name:goal" → write roster (lane/frontier/layer names)
    const lanes = arg.split(",").map((s) => s.trim().split(":")[0].trim()).filter(Boolean);
    if (lanes.length) {
      mkdirSync(dirname(roster), { recursive: true });
      writeFileSync(roster, lanes.join("\n") + "\n", "utf8");
      info(`${cfg.label}: roster armed with ${lanes.length} ${cfg.unit}(s): ${lanes.join(", ")}`);
    }
  } else if (!existsSync(roster)) {
    info(`${cfg.label}: no roster + no specs — ${cfg.specHint}`);
  }

  process.stdout.write(`# /${cfg.label} — engage (mode: ${arg === "go" ? "continue" : "open"})\n\n`);
  const tpl = resolve(HARNESS_ROOT, "templates", cfg.tpl);
  if (existsSync(tpl)) process.stdout.write(readFileSync(tpl, "utf8"));
  return 0;
}
