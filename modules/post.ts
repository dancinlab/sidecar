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
import { existsSync, statSync, readFileSync } from "node:fs";

export async function postBash(args: string[]): Promise<number> {
  const exit = parseInt(args[0] ?? "0", 10);
  const cmd = args.slice(1).join(" ");
  appendJsonl(LOGS.observations, { kind: "post_bash", exit, cmd_len: cmd.length });
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
