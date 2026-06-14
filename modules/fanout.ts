// harness abg|afg [labels]  (aliases: all-bg-go | all-fg-go)
// Print the fan-out runbook (sidecar all-bg-go / all-fg-go parity): enumerate the
// branches the previous assistant turn offered, then bg = parallel background
// Agents / fg = sequential in-session execution. The harness emits the runbook +
// any label restriction; the agent performs the fan-out by following it.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HARNESS_ROOT } from "../lib/paths.ts";
import { info } from "../lib/log.ts";

export async function runFanout(kind: "abg" | "afg", args: string[]): Promise<number> {
  const tpl = resolve(HARNESS_ROOT, "templates", `${kind}.md`);
  if (!existsSync(tpl)) {
    info(`fan-out runbook missing (templates/${kind}.md)`);
    return 1;
  }
  const labels = args.join(" ").trim();
  process.stdout.write(readFileSync(tpl, "utf8"));
  process.stdout.write(
    "\n---\n" + (labels ? `restrict to labels: ${labels}\n` : "labels: (none given) → fan out ALL branches the prior turn offered\n")
  );
  return 0;
}
