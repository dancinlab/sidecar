// harness kick <seed…> | <hexa-kick flags> — thin wrapper over `hexa kick`,
// the hexa-lang gap-breakthrough / discovery engine (aliased to `hexa drill`).
// The /kick wrapper: bare natural-language args join into
// `--seed "<seed>"`; if the first token is a flag (e.g. --rounds N, --engine
// mk9|mk10) the args pass through verbatim so advanced invocations still work.
//
// The discovery engine is long-running and streams progress, so this uses
// INHERITED stdio (live output, no capture/timeout truncation) — unlike the
// short `secret`/`research` passthroughs that capture. `hexa` resolves via PATH.
import { spawnSync } from "node:child_process";
import { execShell } from "../lib/exec.ts";
import { info } from "../lib/log.ts";

export async function runKick(args: string[]): Promise<number> {
  const hexa = (await execShell("command -v hexa 2>/dev/null")).stdout.trim();
  if (!hexa) {
    info("hexa CLI not found — `kick` wraps the hexa-lang discovery engine (`hexa kick`).");
    info("  install hexa-lang (github.com/dancinlab/hexa-lang) and put `hexa` on PATH.");
    return 127;
  }
  if (!args.length) {
    info('usage: harness kick <seed — natural language>   ·   harness kick --rounds N --engine mk9|mk10 …');
    info('  wraps `hexa kick --seed "<seed>"` — gap-breakthrough / discovery engine (alias: hexa drill).');
    return 0;
  }
  // bare seed (no leading flag) → --seed "<joined>"; leading flag → pass through verbatim
  const kickArgs = args[0].startsWith("-") ? ["kick", ...args] : ["kick", "--seed", args.join(" ")];
  const r = spawnSync(hexa, kickArgs, { stdio: "inherit" });
  if (r.error) {
    info(`kick: failed to launch hexa — ${r.error.message}`);
    return 1;
  }
  return r.status ?? 1;
}
