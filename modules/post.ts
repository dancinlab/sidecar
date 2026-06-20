// harness post bash <exit> [cmd]  — record bash outcome; route non-zero exits
// harness post edit <file>        — flag L0 edits after a Write/Edit
import { appendJsonl } from "../lib/log.ts";
import { LOGS } from "../lib/paths.ts";
import { routeError } from "./errors.ts";
import { isL0 } from "../lib/lockdown.ts";
import { config } from "../lib/config.ts";
import { postEditNudge } from "./folders.ts";
import { codeLangViolation } from "./prefs.ts";
import { lspRebuildOnEdit } from "./lsp.ts";
import {
  markPollActivity,
  staleLongRunnerWarn,
  liveMarkerSet,
  activeAgentLabels,
  detectBackgroundLaunch,
  recordAutoRunner,
} from "./heartbeat-guard.ts";
import { liveLongRunnerLabels } from "./ing.ts";
import { bumpEditIfCode } from "./ing-staleness.ts";
import { resolveConvergenceDebtOnEdit } from "./convergence.ts";
import { existsSync, statSync, readFileSync } from "node:fs";

export async function postBash(args: string[]): Promise<number> {
  const exit = parseInt(args[0] ?? "0", 10);
  // command may arrive as positional args OR (more reliably) via the PostToolUse
  // tool-input env — fall back so the heartbeat stamp doesn't miss.
  let cmd = args.slice(1).join(" ");
  if (!cmd) {
    try {
      const raw = process.env.CLAUDE_TOOL_INPUT ?? process.env.CODEX_TOOL_INPUT ?? "";
      if (raw) cmd = String(JSON.parse(raw).command ?? "");
    } catch {
      /* no tool-input env */
    }
  }
  appendJsonl(LOGS.observations, { kind: "post_bash", exit, cmd_len: cmd.length });

  // c21 heartbeat — stamp on a status-check, then warn if a live long-runner has gone
  // unchecked past poll.maxSilenceSec. Perf gate: only read the (git-backed) ing pod
  // board when the .live-runner marker is set or a ledger agent is active.
  markPollActivity(cmd);
  // auto-track un-registered fire-and-forget launches (`&`/nohup over a long-runner)
  // so c21 nags even when `ing pod add`/ledger registration was skipped (#2 strong).
  const bgLabel = detectBackgroundLaunch(cmd);
  if (bgLabel) recordAutoRunner(bgLabel, Date.now());
  if (liveMarkerSet() || activeAgentLabels().length) {
    const pods = await liveLongRunnerLabels().catch(() => [] as string[]);
    const warnMsg = staleLongRunnerWarn(pods, config().poll.maxSilenceSec, Date.now());
    if (warnMsg) {
      process.stderr.write(`[harness warn POLL-HEARTBEAT] ${warnMsg}\n`);
      appendJsonl(LOGS.observations, { kind: "pre_warn", rule_id: "POLL-HEARTBEAT" });
    }
  }
  if (exit !== 0) {
    appendJsonl(LOGS.mistakes, { kind: "bash_fail", exit, cmd: cmd.slice(0, 200) });
    routeError({
      source: "post_bash",
      kind: "build_kind",
      code: "bash_nonzero",
      msg: `exit=${exit}`,
      file: "",
      line: 0,
    });
  }
  return 0;
}

export async function postEdit(args: string[]): Promise<number> {
  const file = args[0] ?? "";
  if (!file) return 0;
  appendJsonl(LOGS.observations, { kind: "post_edit", file });
  // c6 ing-staleness: a code edit bumps the "work moved, board untouched" counter.
  bumpEditIfCode(file);
  // c1 capture-token: an edit landing a well-formed @convergence marker resolves an
  // open recurrence debt (so the Stop hook stops nagging).
  resolveConvergenceDebtOnEdit(file);
  if (isL0(file)) {
    const reminder = config().lockdown.onEditReminder ?? "L0 file edited — handle deliberately.";
    process.stderr.write(`\x1b[31m⚠ L0 LOCKDOWN: ${file} — ${reminder}\x1b[0m\n`);
    appendJsonl(LOGS.mistakes, { kind: "l0_edit_warn", file });
  }
  if (existsSync(file)) {
    appendJsonl(LOGS.observations, { kind: "post_edit_stat", file, size: statSync(file).size });
    const v = codeLangViolation(file, readFileSync(file, "utf8"));
    if (v) {
      process.stderr.write(`\x1b[33m🌐 prefs: ${v}\x1b[0m\n`);
      appendJsonl(LOGS.observations, { kind: "prefs_lang_warn", file });
    }
  }
  postEditNudge(file);
  lspRebuildOnEdit(file);
  return 0;
}
