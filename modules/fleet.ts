// harness fleet [name:goal,...|go|stop|status]
// Perpetual multi-lane orchestrator runbook. Manages a
// lane roster at .harness/fleet/active and prints the runbook the agent follows
// (fire-on-arrival: each lane relaunches its next round the moment it lands).
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { HARNESS_ROOT, REPO_ROOT } from "../lib/paths.ts";
import { info, ok } from "../lib/log.ts";

function rosterPath(lab: boolean): string {
  // lab mode keeps a SEPARATE roster so a research-lab run and a build-fleet run
  // can coexist in the same repo without clobbering each other's lane list.
  return resolve(REPO_ROOT, ".harness", "fleet", lab ? "lab" : "active");
}

function printRunbook(lab: boolean): void {
  const tpl = resolve(HARNESS_ROOT, "templates", lab ? "fleet-lab.md" : "fleet.md");
  if (existsSync(tpl)) process.stdout.write(readFileSync(tpl, "utf8"));
}

export async function runFleet(args: string[]): Promise<number> {
  // `fleet lab …` = research-driven perpetual frontier lab (research-gate before
  // expensive implement; walls are measured + reopenable). Strip the leading token.
  let lab = false;
  if (args[0] === "lab") {
    lab = true;
    args = args.slice(1);
  }
  const label = lab ? "fleet-lab" : "fleet";
  const unit = lab ? "frontier" : "lane";
  const arg = args.join(" ").trim();
  const roster = rosterPath(lab);

  if (arg === "stop") {
    if (existsSync(roster)) rmSync(roster);
    ok(`${label}: roster cleared — in-flight ${unit}s drain, no relaunch.`);
    return 0;
  }
  if (arg === "status") {
    if (!existsSync(roster)) {
      info(`${label}: no active roster.`);
      return 0;
    }
    info(`${label} ${unit}s (${lab ? ".harness/fleet/lab" : ".harness/fleet/active"}):`);
    for (const l of readFileSync(roster, "utf8").split("\n").filter(Boolean)) info(`  • ${l}`);
    return 0;
  }

  // open / continue
  if (arg && arg !== "go") {
    // "name:goal, name:goal" → write roster (lane/frontier names)
    const lanes = arg.split(",").map((s) => s.trim().split(":")[0].trim()).filter(Boolean);
    if (lanes.length) {
      mkdirSync(dirname(roster), { recursive: true });
      writeFileSync(roster, lanes.join("\n") + "\n", "utf8");
      info(`${label}: roster armed with ${lanes.length} ${unit}(s): ${lanes.join(", ")}`);
    }
  } else if (!existsSync(roster)) {
    const hint = lab
      ? "pass `frontier:wall, …` or infer frontiers from ARCHITECTURE.json blocking-frontiers."
      : "pass `name:goal, …` or infer lanes from the prior turn.";
    info(`${label}: no roster + no specs — ${hint}`);
  }

  process.stdout.write(`# /${label} — engage (mode: ${arg === "go" ? "continue" : "open"})\n\n`);
  printRunbook(lab);
  return 0;
}
