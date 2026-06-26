#!/usr/bin/env -S npx tsx
import { runPre } from "../modules/pre.ts";
import { postBash, postEdit } from "../modules/post.ts";
import { runPromptScan } from "../modules/prompt-scan.ts";
import { runLint } from "../modules/lint.ts";
import { runCi } from "../modules/ci.ts";
import { runCiTrack } from "../modules/ci-track.ts";
import { runVerify } from "../modules/verify.ts";
import { runErrors } from "../modules/errors.ts";
import { runLedger } from "../modules/ledger.ts";
import { runBitterGate } from "../modules/bitter-gate.ts";
import { runAudit } from "../modules/audit.ts";
import { runGc } from "../modules/gc.ts";
import { runSync } from "../modules/sync.ts";
import { runInit } from "../modules/init.ts";
import { runInstall, runInstallHooks, runSelfUpdate } from "../modules/setup.ts";
import { runShadow } from "../modules/shadow.ts";
import { runUninstall } from "../modules/uninstall.ts";
import { runUpdate } from "../modules/update.ts";
import { runFleet } from "../modules/fleet.ts";
import { runPrCycle } from "../modules/pr-cycle.ts";
import { runShip } from "../modules/ship.ts";
import { runPod, runDemi, runDojo, runMicroExp, runBypass, runGo, runBrainstorm, runGap } from "../modules/runbooks.ts";
import { runPool } from "../modules/pool.ts";
import { runKick } from "../modules/kick.ts";
import { runIng } from "../modules/ing.ts";
import { runUpstream } from "../modules/upstream.ts";
import { runVerdict } from "../modules/verdict.ts";
import { runAtlas } from "../modules/atlas.ts";
import { runEnd } from "../modules/end.ts";
import { runSecret } from "../modules/secret.ts";
import { runLsp } from "../modules/lsp.ts";
import { runWorktree } from "../modules/worktree.ts";
import { runImagine } from "../modules/imagine.ts";
import { runEmail } from "../modules/email.ts";
import { runPaper } from "../modules/paper.ts";
import { runResearch } from "../modules/research.ts";
import { runToolkit } from "../modules/toolkit.ts";
import { runCompanions } from "../modules/companions.ts";
import { runWatch } from "../modules/watch.ts";
import { runFolders } from "../modules/folders.ts";
import { runNaming } from "../modules/naming.ts";
import { runPrefs } from "../modules/prefs.ts";
import { runEasy } from "../modules/easy.ts";
import { runLoad } from "../modules/load.ts";
import { runRecommend } from "../modules/recommend.ts";
import { runSbs } from "../modules/sbs.ts";
import { runFanout } from "../modules/fanout.ts";
import { runMemGuard } from "../modules/mem-guard.ts";
import { runDocs } from "../modules/docs.ts";
import { runLockdown } from "../modules/lockdown-cmd.ts";
import { runCommons } from "../modules/commons.ts";
import { runArchitecture } from "../modules/architecture.ts";
import { runGitContext } from "../modules/git-context.ts";
import { runClaudemd } from "../modules/claudemd.ts";

export const HELP = `dancinlab/sidecar — project-agnostic AI coding sidecar

usage: sidecar <cmd> [args]

setup:
  install [--no-hooks] [--ref main] [--dry-run]   COMMON/global setup — clone dancinlab/sidecar → ~/.sidecar/cli +
                                         a sidecar wrapper on ~/.local/bin + global hooks (idempotent). NOT a per-repo scaffold (that's init).
                                         curl one-liner: curl -fsSL https://raw.githubusercontent.com/dancinlab/sidecar/main/scripts/install.sh | bash
  init [--force] [--dry-run]   scaffold THIS repo: config + .harness rules + gitignore + wrapper (hooks are GLOBAL-ONLY → sidecar install)
                                         (strict by default: block-everything + branch protection + pre-push verify + single-doc scaffolds)
  uninstall [--dry-run] [--keep-logs]   remove sidecar-injected files (config/.harness/hooks/wrapper); keeps user content
  update [--hooks]         bump .harness-engine submodule to latest (adopt new engine features) + optional hook refresh
  install-hooks [--global]   merge sidecar hooks into the GLOBAL ~/.claude/settings.json (per-repo --repo is banned → double-inject)
  self-update              git-pull the sidecar CLI clone this binary runs from (e.g. ~/.sidecar/cli) to latest main
  shadow [plan|remove|--force]  mirror sidecar's own commands/ into ~/.claude/commands/ as bare /cmd delegators (marker-tracked · regenerable · --force heals pre-marker stale shadows from source)
  ship [--no-doc]          one-shot propagate to ALL surfaces: pr-cycle (verified merge) → self-update (global CLI) → shadow (slash mirror). Run after every implementation

hook delegates (wire these into your agent's settings.json):
  pre bash                 PreToolUse(Bash)  — enforcement match → block/warn
  pre write                PreToolUse(Write/Edit) — path/content rules
  pre askq                 PreToolUse(AskUserQuestion) — deny option-box → ask in plain chat (config.askqText)
  post bash <exit> [cmd]   PostToolUse(Bash) — record + route non-zero exits
  post edit <file>         PostToolUse(Write/Edit) — flag L0 edits
  prompt <text>            UserPromptSubmit  — keyword triggers + prompt hints
  commons {inject|show}    always-on cross-project governance SSOT (config/commons.md; repo override .harness/commons.md)
  architecture {inject|show|search <q>|lint|convergence ...}   surface repo-root ARCHITECTURE.json/.md (design SSOT) at SessionStart; search <q> = substring over slug/이름/역할/상세 → matching node slugs+breadcrumb; lint = c4 tree hygiene + slug presence/uniqueness; convergence {list|add|rm|edit} = 재발학습 store CRUD (id-keyed · add upsert · value/threshold '--value -'=stdin); convergence stop-check = Stop 훅 — 에이전트 출력의 재발-신호 키워드 스캔 → SSOT 기록 넛지(신호별 세션당 1회 · advisory · 패턴=config/convergence-triggers.json)
  git-context {inject|show}   SessionStart: warn when HEAD is BEHIND origin/<default> (stale-branch trap — reading pre-merge code as current)
  claudemd {inject|show}   re-inject repo-root CLAUDE.md (project rules) EACH UserPromptSubmit so they stay enforced (optional <!-- enforce:start/end --> block)
  toolkit {list|inject|json|write|check}   command catalog (SSOT = this HELP) — inject surfaces the WHOLE command surface at SessionStart so an agent knows every cmd; check gates TOOLKIT.jsonl drift
  companions {inject|list}   sibling-CLI command surface — inject runs each configured neighbour CLI's catalog (config \`companions\` + ~/.sidecar/companions.json · DOMAIN-AGNOSTIC, e.g. hexa) at SessionStart so the agent knows \`hexa cloud\` exists without probing
  prefs {show|code|docs|response <lang>|inject}   language prefs (3 axes) + UserPromptSubmit inject
  easy {show|inject|scaffold "<q>"|lint <file|->}
                           easy friendly-response style — inject (lang from prefs) · scaffold = empty 7-element round skeleton · lint = advisory axis score (no LLM)
  load {show|inject}       per-turn macOS resource readout (CPU load + RAM pressure/used% + swap, ⚠️ on danger) — UserPromptSubmit inject
  recommend {inject|show|get-default|set-default <m> [--global]|clear-default [--global]|resolve-mode <a>}
                           4-axis rubric + default mode (repo .harness > global ~/.sidecar > present; fixed axis = auto-pick)
  sbs [auto[:<axis>]|manual] [<task>]   plan-first runbook — resolver-first mode · chat-form 모호성→0 · plan.md handoff + auto-QA 4축 + 9-section dossier
  abg [labels]             all-bg-go — fan out prior-turn branches as parallel background Agents (runbook)
  afg [labels]             all-fg-go — run prior-turn branches sequentially in-session (runbook)
  fleet [name:goal,…|go|stop|status]   perpetual multi-lane orchestrator (runbook + roster)
  fleet lab [frontier:wall,…|go|…]      research-driven frontier lab (research-gate→implement→measure→SSOT→re-research; walls measured + reopenable)
  fleet abstract [layer:seed,…|go|…]    abstraction-driven layer dive (census LAWS→peel to shared trade-off/meta-law→invent escape→cast as falsifiable prediction; meta-laws reopenable · d6 honest)
  fleet full [frontier:goal,…|parallel|go|…]  full-stack campaign — ALL 3 phases in order per frontier (research→implement→abstract→falsify · implement NEVER skipped, weak lever still measures a wall before abstract) · SEQUENTIAL by default (afg-style; pass 'parallel' to fan out) · cheap implement auto, only paid gates (c14)
  pr-cycle [--no-reap] [gh flags]   push branch → open PR → self-merge (squash·admin·delete-branch) → reap stale open PRs (auto-merge mergeable · report conflicting · --no-reap skips)
  pod                      GPU cloud pod dispatch runbook (preflight→fire→poll→harvest→down · cost-gated)
  dojo [<slug>] [--lang]   cloud training-job scaffolder (runbook + exports/dojo/<slug>/ emit)
  micro-exp [<scope>]      context-driven micro-experiment sweep (infra-gate→budget→dispatch→monitor→absorb→ledger)
  bypass                   anti-punt self-check runbook (proceed on local+reversible; ask only when outward/decision)
  go                       continue the most-recently proposed action without re-confirming
  brainstorm               iterative ideation rounds until depletion (breadth over selection)
  demi                     design-architecture program runbook (7-verb spine)
  gap [full|list|<scope>]   multi-axis gap exploration — 40 breakthrough lenses (8 families) · triage→deepen runbook
  kick <seed…> | <flags>   wrap hexa kick --seed "<seed>" — hexa-lang gap-breakthrough/discovery engine (alias: drill; bare args→seed, leading flag→passthrough)
  pool {list|add|rm|on|status|specs}   host roster + remote exec + cores/mem/GPU probe (~/.sidecar/pool.json, global)
  mem-guard {status|check|install|uninstall}   OOM prevention — free-RAM preflight before bg-spawn + opt-in launchd notify watchdog
  secret <verb> [args]     passthrough to the secret CLI (Keychain creds · get/set/rotate/list/init/backup/sync)
                           ⚠ \`get\` exposes the value in context — prefer inline \`\$(secret get <k>)\` for tool args
  lsp {wire|status|rebuild <file>}   editor LSP wiring (.lsp.json; hexa-lang \`hexa lsp\` for .hexa by default)
                           + background rebuild of prebuilt hexa LSP binaries when their grammar source is edited
  research {arxiv <query|id> [--n N] [--sort relevance|date|updated] | yt <url|id> [lang] | web <query> [--n N] | fetch <url>}   arXiv / YouTube transcript / keyless web search (DuckDuckGo) / page fetch (no key)
  watch <url|path> [question] [flags]   download (yt-dlp) → frames (ffmpeg) + transcript (captions/Whisper) for the agent
  imagine <prompt-file> <out.png> [-s size] [-b fal|openai] [-m model] | list | help | history
                           AI image generator (fal/openai · keys via secret · prompt from FILE · canonical sizes)
  email send --to <a> --subject <s> [--from <a>] [--text <file>|-m <inline>] [--html <file>] [--cc][--bcc][--reply-to][--tag][--stream][--attach <f>]... [--dry]
                           transactional email via Postmark API (POST /email) — token from \`secret get postmark.server_token\` (curl -K · never in argv)
                           | history [--count N][--offset N][--tag t][--json][--local] | list | help
  paper <new|build|cover|list|publish|update|unpublish|status> [slug] [flags]   demiurge-house scientific paper: scaffold (emoji title ·
                           g5 tier badges · TikZ+pgfplots · fal.ai cover) → xelatex+bibtex×3 build → g51 ≥10-page gate
                           publish --to zenodo|arxiv|both [--sandbox][--source]: Zenodo REST lifecycle (DOI) · arXiv submission tarball+guide (no API)
                           update (Zenodo new-version) · unpublish (delete Zenodo draft) · status — keys via \`secret get zenodo.token\`

gates & ledgers:
  lint [all|fast|verbose]  staged-L0 + freshness + doc-gate checks
  naming audit [path] [--ing] [--gate]   repo-wide non-canonical name audit (version/copy/dup suffix backlog the write-guard never saw) · --ing = land summary on THIS repo's board · --gate = exit 1 on any hit
  ci [all|fast|list|scaffold [--force]]   run configured verification commands in parallel (was verify; config key stays verify.checks) · scaffold = emit a .github/workflows/ci.yml that runs 'sidecar ci' on config ci.{runner,setup,fallback,cachePaths} (init writes it too) · ci.fallback on = cost-free fast path (self-hosted pool then github-hosted fallback, probe-fail-safe, no Blacksmith) + cachePaths = warm actions/cache
  ci-track <pr|branch> [--watch] [--interval=60] [--timeout=1800] [--merge-on-green] [-R owner/repo]   track remote PR/CI checks (gh) → 🟢/🔴/🟡 verdict; --watch polls until terminal (no hand-rolled gh-poll loop)
  verify [rubric|fence "<claim>"]   tier-rubric claim verification (badges · no self-judge)
  errors {route|list|drain_check|mark_fixed}
  ledger {register|complete|list|gc|dup_check}
  bitter-gate audit [window]   rule-hit frequency → retire dormant rules

reports:
  audit [full|summary|json]    6-axis self-scorecard
  gc [scan|drift]              broken markdown links in guides
  docs [status|check|scratch [name]]   single-doc discipline (architecture SSOT + log + scratch + quickref)
                               write-time enforced in \`pre write\` (docs.enforce: warn[default]|block|off)
  lockdown {status|add <path...>|rm <path...>|check <path>}   manage L0 set (opt-in · none until designated)
                               add/rm mutate harness.config.json lockdown.files
  folders [scan|scaffold <dir>]   per-subfolder CLAUDE.md coverage + scaffolding (enforced: lint blocks FOLDER-GUIDE-MISSING for the folder of any staged file lacking a guide · commons folder-docs)
  end                          session-closure safety check (uncommitted·unpushed·stash·PRs·branches·worktrees)
  worktree {scan|gc|guard <cmd>}   no-pileup/no-stranded enforcement — flag stranded worktrees · auto-sweep merged([gone]) + aged(>maxAgeDays, tip→refs/reaped)
                           (SessionStart-wire \`worktree gc\`; \`scan\` exit 1 gates new work on abandoned worktrees)
  ing [show|add|done|next|pod ...|inject]   in-progress board → ING.jsonl (작업·POD·next · done=scrub · SessionStart inject · 내 repo 전용 — cross-repo 전달 폐기)
  verdict {record <id> <cmd>|list|show <id>}   verification evidence ledger → .verdicts/ (PASS/FAIL)
  atlas {add <id> <claim>|link <id> <vid>|list}   claim registry → ATLAS.md (verified via PASS verdict)
  upstream {list|fix <name|repo>}   in-session upstream (hexa-lang…) fix runbook (no inbox-only defer)
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
    case "install":
      return runInstall(rest);
    case "init":
      return runInit(rest);
    case "uninstall":
      return runUninstall(rest);
    case "update":
      return runUpdate(rest);
    case "install-hooks":
      return runInstallHooks(rest);
    case "self-update":
      return runSelfUpdate(rest);
    case "shadow":
      return runShadow(rest);
    case "fleet":
      return runFleet(rest);
    case "pr-cycle":
      return runPrCycle(rest);
    case "ship":
      return runShip(rest);
    case "pod":
      return runPod(rest);
    case "mem-guard":
    case "mem":
      return runMemGuard(rest);
    case "dojo":
      return runDojo(rest);
    case "micro-exp":
    case "micro":
      return runMicroExp(rest);
    case "bypass":
      return runBypass(rest);
    case "go":
      return runGo(rest);
    case "brainstorm":
      return runBrainstorm(rest);
    case "gap":
      return runGap(rest);
    case "kick":
    case "drill":
      return runKick(rest);
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
      process.stderr.write("usage: sidecar post {bash|edit} ...\n");
      return 1;
    case "prompt":
      return runPromptScan(rest);
    case "prefs":
      return runPrefs(rest);
    case "easy":
      return runEasy(rest);
    case "load":
      return runLoad(rest);
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
    case "ci":
      return runCi(rest);
    case "ci-track":
      return runCiTrack(rest);
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
    case "lockdown":
      return runLockdown(rest);
    case "commons":
      return runCommons(rest);
    case "architecture":
      return runArchitecture(rest);
    case "git-context":
      return runGitContext(rest);
    case "claudemd":
      return runClaudemd(rest);
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
    case "email":
    case "mail":
      return runEmail(rest);
    case "paper":
      return runPaper(rest);
    case "research":
      return runResearch(rest);
    case "toolkit":
      return runToolkit(rest);
    case "companions":
      return runCompanions(rest);
    case "watch":
      return runWatch(rest);
    case "ing":
      return runIng(rest);
    case "verdict":
      return runVerdict(rest);
    case "atlas":
      return runAtlas(rest);
    case "upstream":
      return runUpstream(rest);
    case "sync":
      return runSync(rest);
    case "naming":
      return runNaming(rest);
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
