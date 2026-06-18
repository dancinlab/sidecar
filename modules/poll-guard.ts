// poll-guard — built-in code-level enforcement of c19 (poll external long-runners
// at ≥30min). The main session can't have its ScheduleWakeup interval intercepted
// by harness (it's a runtime tool, not a bash command), but the OTHER way sessions
// poll — a bash `while …; do <status>; sleep <N>; done` loop — IS a bash command,
// so it's caught here. A short-interval (<1800s) poll LOOP over an EXTERNAL
// long-runner (pod / r2 / cloud / training job) busts the prompt cache and racks
// up wakeups for no gain; c19 says poll such jobs at ≥30min (or delegate the poll
// to a sub-agent). Fast local waits (server boot, a CI/deploy queue that finishes
// in minutes) are c19-exempt and NOT flagged — the guard only fires when the loop
// references an external-long-runner term.
//
// @convergence state=ossified id=NO_SHORT_POLL_LOOP value="a bash poll LOOP over an external long-runner (pod/r2/cloud/training) with sleep <1800s is blocked in code (c19) — poll at ≥30min or delegate to a sub-agent" threshold="a session ran a short-interval background re-rent/poll loop; c19 was only a hint, ScheduleWakeup interval can't be code-guarded, but the bash sleep-loop can"

const MIN_POLL_SECONDS = 1800; // c19 floor: 30 min

// external long-runner terms that put a poll loop in c19's scope (NOT local-server
// boot / fast CI waits, which are exempt).
const EXTERNAL_LONGRUNNER =
  /\b(runpod|runpodctl|vast|vastai|pod|gpu|nvidia-smi|r2|measure\d*|dojo|train(?:ing)?|finetune|torchrun|deepspeed|squeue|sacct|sinfo|cloud)\b/i;

// loop / repeated-poll constructs
const LOOP = /\b(while|until|for)\b[\s\S]*\bdo\b|\bwatch\b\s/i;

// parse the smallest `sleep <N>` in the command → seconds, or null if none.
// supports `sleep 60`, `sleep 5m`, `sleep 1h`, `sleep 0.5h`, `sleep 90s`.
function smallestSleepSeconds(cmd: string): number | null {
  const re = /\bsleep\s+([0-9]*\.?[0-9]+)\s*([smhd]?)/gi;
  let m: RegExpExecArray | null;
  let min: number | null = null;
  while ((m = re.exec(cmd))) {
    const n = parseFloat(m[1]);
    const unit = (m[2] || "s").toLowerCase();
    const sec = n * (unit === "m" ? 60 : unit === "h" ? 3600 : unit === "d" ? 86400 : 1);
    if (min === null || sec < min) min = sec;
  }
  return min;
}

// Returns a human label when the command is a short-interval poll loop over an
// external long-runner (c19 violation), or null.
export function detectShortPollLoop(rawCmd: string): string | null {
  const cmd = rawCmd;
  // a `watch -n <N>` is itself a poll loop with an interval flag
  const watch = /\bwatch\b[\s\S]*?-n\s*([0-9]*\.?[0-9]+)/i.exec(cmd);
  if (watch && EXTERNAL_LONGRUNNER.test(cmd)) {
    const sec = parseFloat(watch[1]);
    if (sec < MIN_POLL_SECONDS) return `\`watch -n ${watch[1]}\` poll of an external long-runner (interval < 30min)`;
  }

  if (!LOOP.test(cmd)) return null; // single command, not a poll loop → fine
  if (!EXTERNAL_LONGRUNNER.test(cmd)) return null; // local/CI fast wait → c19-exempt

  const sleepSec = smallestSleepSeconds(cmd);
  if (sleepSec === null) return null; // a loop with no sleep is a different problem (not ours)
  if (sleepSec >= MIN_POLL_SECONDS) return null; // already ≥30min → compliant

  return `poll loop over an external long-runner with sleep ${sleepSec}s (< 30min)`;
}
