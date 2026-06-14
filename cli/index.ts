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
import { runUninstall } from "../modules/uninstall.ts";
import { runUpdate } from "../modules/update.ts";
import { runFleet } from "../modules/fleet.ts";
import { runPrCycle } from "../modules/pr-cycle.ts";
import { runPod, runDemi, runDojo } from "../modules/runbooks.ts";
import { runPool } from "../modules/pool.ts";
import { runIng } from "../modules/ing.ts";
import { runUpstream } from "../modules/upstream.ts";
import { runVerdict } from "../modules/verdict.ts";
import { runAtlas } from "../modules/atlas.ts";
import { runEnd } from "../modules/end.ts";
import { runSecret } from "../modules/secret.ts";
import { runLsp } from "../modules/lsp.ts";
import { runWorktree } from "../modules/worktree.ts";
import { runImagine } from "../modules/imagine.ts";
import { runFolders } from "../modules/folders.ts";
import { runPrefs } from "../modules/prefs.ts";
import { runEasy } from "../modules/easy.ts";
import { runRecommend } from "../modules/recommend.ts";
import { runSbs } from "../modules/sbs.ts";
import { runFanout } from "../modules/fanout.ts";
import { runDocs } from "../modules/docs.ts";

const HELP = `dancinlab/harness — project-agnostic AI coding harness

usage: harness <cmd> [args]

setup:
  init [--force] [--hooks] [--dry-run] [--hardcore]   scaffold config + .harness rules + gitignore + wrapper
                                         (--hardcore = strict profile: block-everything + branch protection + pre-push verify)
  uninstall [--dry-run] [--keep-logs]   remove harness-injected files (config/.harness/hooks/wrapper); keeps user content
  update [--hooks]         bump .harness-engine submodule to latest (adopt new engine features) + optional hook refresh

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
  fleet [name:goal,…|go|stop|status]   perpetual multi-lane orchestrator (runbook + roster)
  pr-cycle [gh flags]      push branch → open PR → self-merge (squash·admin·delete-branch)
  pod                      GPU cloud pod dispatch runbook (preflight→fire→poll→harvest→down · cost-gated)
  dojo [<slug>] [--lang]   cloud training-job scaffolder (runbook + exports/dojo/<slug>/ emit)
  demi                     design-architecture program runbook (7-verb spine)
  pool {list|add|rm|on|status}   host roster + remote exec (~/.harness/pool.json, global)
  secret <verb> [args]     passthrough to the secret CLI (Keychain creds · get/set/rotate/list/init/backup/sync)
                           ⚠ \`get\` exposes the value in context — prefer inline \`\$(secret get <k>)\` for tool args
  lsp {wire|status|rebuild <file>}   editor LSP wiring (.lsp.json; hexa-lang \`hexa lsp\` for .hexa by default)
                           + background rebuild of prebuilt hexa LSP binaries when their grammar source is edited
  imagine <prompt-file> <out.png> [-s size] [-b fal|openai] [-m model] | list | help
                           AI image generator (fal/openai · keys via secret · prompt from FILE · canonical sizes)

gates & ledgers:
  lint [all|fast|verbose]  staged-L0 + freshness + convergence checks
  verify [all|fast|list]   run configured verification commands in parallel
  errors {route|list|drain_check|mark_fixed}
  ledger {register|complete|list|gc|dup_check}
  bitter-gate audit [window]   rule-hit frequency → retire dormant rules

reports:
  audit [full|summary|json]    6-axis self-scorecard
  gc [scan|drift]              broken markdown links in guides
  docs [status|check|scratch [name]]   single-doc discipline (architecture SSOT + log + scratch + quickref)
  folders [scan|scaffold <dir>]   per-subfolder CLAUDE.md coverage + scaffolding
  handoff [reason]             session snapshot → .harness/handoff/
  end                          session-closure safety check (uncommitted·unpushed·stash·PRs·branches·worktrees)
  worktree {scan|gc|guard <cmd>}   no-pileup/no-stranded enforcement — flag stranded worktrees · auto-sweep merged
                           (SessionStart-wire \`worktree gc\`; \`scan\` exit 1 gates new work on abandoned worktrees)
  ing [show|add|done|next|pod ...]   in-progress board → ING.md (작업 · POD running · next)
  verdict {record <id> <cmd>|list|show <id>}   verification evidence ledger → .verdicts/ (PASS/FAIL)
  atlas {add <id> <claim>|link <id> <vid>|list}   claim registry → ATLAS.md (verified via PASS verdict)
  upstream {list|fix <name|repo>}   in-session upstream (hexa-lang…) fix runbook (no inbox-only defer)
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
    case "uninstall":
      return runUninstall(rest);
    case "update":
      return runUpdate(rest);
    case "fleet":
      return runFleet(rest);
    case "pr-cycle":
      return runPrCycle(rest);
    case "pod":
      return runPod(rest);
    case "dojo":
      return runDojo(rest);
    case "demi":
    case "demiurge":
      return runDemi(rest);
    case "pool":
      return runPool(rest);
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
    case "docs":
      return runDocs(rest);
    case "handoff":
      return runHandoff(rest);
    case "end":
      return runEnd(rest);
    case "secret":
      return runSecret(rest);
    case "lsp":
      return runLsp(rest);
    case "worktree":
      return runWorktree(rest);
    case "imagine":
      return runImagine(rest);
    case "ing":
      return runIng(rest);
    case "verdict":
      return runVerdict(rest);
    case "atlas":
      return runAtlas(rest);
    case "upstream":
      return runUpstream(rest);
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
