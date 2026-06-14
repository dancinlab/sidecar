#!/usr/bin/env -S npx tsx
import { runPre } from "../modules/pre.ts";
import { postBash, postEdit } from "../modules/post.ts";
import { runPromptScan } from "../modules/prompt-scan.ts";
import { runLint } from "../modules/lint.ts";
import { runVerify } from "../modules/verify.ts";
import { runErrors } from "../modules/errors.ts";
import { runLedger } from "../modules/ledger.ts";
import { runBitterGate } from "../modules/bitter-gate.ts";
import { runAudit } from "../modules/audit.ts";
import { runHandoff } from "../modules/handoff.ts";
import { runGc } from "../modules/gc.ts";
import { runConvergence } from "../modules/convergence.ts";
import { runSync } from "../modules/sync.ts";
import { runInit } from "../modules/init.ts";
import { runFolders } from "../modules/folders.ts";
import { runPrefs } from "../modules/prefs.ts";
import { runEasy } from "../modules/easy.ts";
import { runRecommend } from "../modules/recommend.ts";
import { runSbs } from "../modules/sbs.ts";
import { runFanout } from "../modules/fanout.ts";

const HELP = `dancinlab/harness — project-agnostic AI coding harness

usage: harness <cmd> [args]

setup:
  init [--force] [--hooks] [--dry-run] [--hardcore]   scaffold config + .harness rules + gitignore + wrapper
                                         (--hardcore = strict profile: block-everything + branch protection + pre-push verify)

hook delegates (wire these into your agent's settings.json):
  pre bash                 PreToolUse(Bash)  — enforcement match → block/warn
  pre write                PreToolUse(Write/Edit) — path/content rules
  post bash <exit> [cmd]   PostToolUse(Bash) — record + route non-zero exits
  post edit <file>         PostToolUse(Write/Edit) — flag L0 edits
  prompt <text>            UserPromptSubmit  — keyword triggers + prompt hints
  prefs {show|code|docs|response <lang>|inject}   language prefs (3 axes) + UserPromptSubmit inject
  easy {show|inject}       inject the "easy" friendly-response style (lang from prefs.response)
  recommend {inject|show|get-default|set-default <m>|clear-default|resolve-mode <a>}   4-axis rubric + default mode
  sbs [auto[:<axis>]|manual] [<task>]   step-by-step plan-first runbook (mode via recommend resolve-mode)
  abg [labels]             all-bg-go — fan out prior-turn branches as parallel background Agents (runbook)
  afg [labels]             all-fg-go — run prior-turn branches sequentially in-session (runbook)

gates & ledgers:
  lint [all|fast|verbose]  staged-L0 + freshness + convergence checks
  verify [all|fast|list]   run configured verification commands in parallel
  errors {route|list|drain_check|mark_fixed}
  ledger {register|complete|list|gc|dup_check}
  bitter-gate audit [window]   rule-hit frequency → retire dormant rules

reports:
  audit [full|summary|json]    6-axis self-scorecard
  gc [scan|drift]              broken markdown links in guides
  folders [scan|scaffold <dir>]   per-subfolder CLAUDE.md coverage + scaffolding
  handoff [reason]             session snapshot → .harness/handoff/
  convergence {status|recompute|by-category}   optional incident tracker
  sync {run|diff}              run configured shared-file sync script

principles: quiet on success / loud on failure / never auto-fix / config-driven / AI-native JSONL
`;

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || ["-h", "--help", "help"].includes(argv[0])) {
    process.stdout.write(HELP);
    return 0;
  }
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case "init":
    case "install":
      return runInit(rest);
    case "pre":
      return runPre(rest);
    case "post":
      if (rest[0] === "bash") return postBash(rest.slice(1));
      if (rest[0] === "edit") return postEdit(rest.slice(1));
      process.stderr.write("usage: harness post {bash|edit} ...\n");
      return 1;
    case "prompt":
      return runPromptScan(rest);
    case "prefs":
      return runPrefs(rest);
    case "easy":
      return runEasy(rest);
    case "recommend":
      return runRecommend(rest);
    case "sbs":
    case "step-by-step":
      return runSbs(rest);
    case "abg":
    case "all-bg-go":
      return runFanout("abg", rest);
    case "afg":
    case "all-fg-go":
      return runFanout("afg", rest);
    case "lint":
      return runLint(rest);
    case "verify":
      return runVerify(rest);
    case "errors":
      return runErrors(rest);
    case "ledger":
      return runLedger(rest);
    case "bitter-gate":
      return runBitterGate(rest);
    case "audit":
      return runAudit(rest);
    case "gc":
      return runGc(rest);
    case "folders":
      return runFolders(rest);
    case "handoff":
      return runHandoff(rest);
    case "convergence":
      return runConvergence(rest);
    case "sync":
      return runSync(rest);
    default:
      process.stderr.write(`unknown cmd: ${cmd}\n\n${HELP}`);
      return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`\x1b[31m[fatal] ${err?.stack ?? err}\x1b[0m\n`);
    process.exit(2);
  });
