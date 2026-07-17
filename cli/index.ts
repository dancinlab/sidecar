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
import { runLab } from "../modules/lab.ts";
import { runInstall, runInstallHooks, runSelfUpdate } from "../modules/setup.ts";
import { runShadow } from "../modules/shadow.ts";
import { runUninstall } from "../modules/uninstall.ts";
import { runUpdate } from "../modules/update.ts";
import { runFleet } from "../modules/fleet.ts";
import { runPrCycle } from "../modules/pr-cycle.ts";
import { runReap } from "../modules/reap.ts";
import { runShip } from "../modules/ship.ts";
import { runDemi, runDojo, runMicroExp, runBypass, runGo, runBrainstorm, runGap } from "../modules/runbooks.ts";
import { runPool } from "../modules/pool.ts";
import { runIng } from "../modules/ing.ts";
import { runFrontier } from "../modules/frontier.ts";
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
import { runLabMode } from "../modules/lab-mode.ts";
import { runLoad } from "../modules/load.ts";
import { runRecommend } from "../modules/recommend.ts";
import { runGoalGuard } from "../modules/goal-guard.ts";
import { runSbs } from "../modules/sbs.ts";
import { runFanout } from "../modules/fanout.ts";
import { runMemGuard } from "../modules/mem-guard.ts";
import { runDocs } from "../modules/docs.ts";
import { runLockdown } from "../modules/lockdown-cmd.ts";
import { runCommons } from "../modules/commons.ts";
import { runArchitecture } from "../modules/architecture.ts";
import { runTurnClose } from "../modules/turn-close.ts";
import { runChangelog } from "../modules/changelog.ts";
import { runGitContext } from "../modules/git-context.ts";
import { runClaudemd } from "../modules/claudemd.ts";
import { runPi } from "../modules/pi.ts";
import { runInjects } from "../modules/injects.ts";
import { runHypotheses } from "../modules/hypotheses.ts";

export const HELP = `dancinlab/sidecar — project-agnostic AI coding sidecar

usage: sidecar <cmd> [args]

setup:
  install [--no-hooks] [--ref main] [--dry-run]   COMMON/global setup — clone dancinlab/sidecar → ~/.sidecar/cli + a sidecar wrapper on ~/.local/bin + global hooks (idempotent)
                                         NOT a per-repo scaffold (that's init).
                                         curl one-liner: curl -fsSL https://raw.githubusercontent.com/dancinlab/sidecar/main/scripts/install.sh | bash
  init [--force] [--dry-run]   scaffold THIS repo: config + .harness rules + gitignore + wrapper (hooks are GLOBAL-ONLY → sidecar install)
                                         (strict by default: block-everything + branch protection + pre-push verify + single-doc scaffolds)
  lab <fable|sol|full> [flags] <prompt...> | --file <f> | -   model-delegation hub — 1 instruction/call to a frontier model — fable=Claude Fable 5 · sol=Codex 5.6 · full=BOTH parallel (session backend untouched):
                                         fable = Claude Fable 5 (headless 'claude -p' · default -m claude-fable-5 · opus fallback FORBIDDEN) · sol = OpenAI Codex 5.6 ('codex exec' · default -m gpt-5.6-sol) · full = BOTH in parallel (── fable ── / ── sol ── sections)
                                         · prompt from argv words/--file/stdin, sent via child stdin — no argv leak/quoting · --json = machine-clean answer on stdout · --dry = print resolved argv · --cwd <dir> · --timeout <s> (default UNLIMITED, exit 124)
                                         · --write = IMPLEMENT tier (fable: bypassPermissions · sol: -s workspace-write); DEFAULT is INVESTIGATE (fable: Write/Edit/NotebookEdit denied · sol: -s read-only) · -c/--continue · -r/--resume <id> · --sources <l> (fable only) · flags after -- go to the backend CLI verbatim
                                         · --bg = fire-and-forget (detached → prints a job id); collect with 'sidecar lab result <id>' (RUNNING=exit3) / 'tail <id>' / 'wait <id> [--timeout s]' / 'list' (~/.sidecar/lab-jobs)
  uninstall [--dry-run] [--keep-logs]   remove sidecar-injected files (config/.harness/hooks/wrapper); keeps user content
  update [--hooks]         bump .harness-engine submodule to latest (adopt new engine features) + optional hook refresh
  install-hooks [--global]   merge sidecar hooks into the GLOBAL ~/.claude/settings.json (per-repo --repo is banned → double-inject)
  pi {install|status|remove}   wire sidecar into the Pi coding agent — symlink the bridge extension (pi/sidecar.ts) into
                                         ~/.pi/agent/extensions/ + add ~/.claude/skills to Pi settings. Same engine as the CC plugin; governance parity (Stop-gates CC-only)
  self-update              git-pull the sidecar CLI clone this binary runs from (e.g. ~/.sidecar/cli) to latest main
  shadow [plan|remove|--force]  mirror sidecar's own commands/ into ~/.claude/commands/ as bare /cmd delegators (marker-tracked · regenerable · --force heals pre-marker stale shadows from source)
  ship [--no-doc]          SIDECAR-REPO ONLY — propagate sidecar's OWN change across its install surfaces: inject-bloat guard (context-rot) → pr-cycle → self-update (global CLI) → shadow (slash mirror)
                                         Other repos use pr-cycle for a plain verified merge

hook delegates (wire these into your agent's settings.json):
  pre bash                 PreToolUse(Bash)  — enforcement match → block/warn
  pre write                PreToolUse(Write/Edit) — path/content rules
  pre askq                 PreToolUse(AskUserQuestion) — deny option-box → ask in plain chat (config.askqText)
  pre tool                 PreToolUse(mcp__.*) — annotation-guard: classify MCP tool vs config registry → warn/block (Rule-of-Two)
  post bash <exit> [cmd]   PostToolUse(Bash) — record + route non-zero exits
  post edit <file>         PostToolUse(Write/Edit) — flag L0 edits
  prompt <text>            UserPromptSubmit  — keyword triggers + prompt hints
  commons {inject|show}    always-on cross-project governance SSOT (config/commons.md; repo override .harness/commons.md)
  architecture {inject|show|search <q>|lint|convergence ...|result ...}   surface repo-root ARCHITECTURE.json/.md (design SSOT) at SessionStart · verbs: inject · show · search · lint · convergence · result
                                         search <q> = substring over id/name/role/detail → matching node ids+breadcrumb; lint = c4 tree hygiene + id presence/uniqueness; convergence {list|for|add|rm|edit} = 재발학습 store CRUD (id-keyed · add upsert · value/threshold '--value -'=stdin)
                                         result = DISCARDED (실험 verdict 는 별도 store 아님 → ARCHITECTURE type:\"gate\" 노드 verdict 직접 update-in-place · 턴 마감 트리오의 🏛️ 줄이 강제). 재발-신호/게이트-신호 키워드 스캐너(stop-check · gate-stop-check · convergence stop-check)는 폐기 → turn-close check 로 통합
  turn-close {check|inject}   턴 마감 트리오 게이트 — 매 응답 끝에 🔄 ING · 🏛️ ARCHITECTURE · 🧬 CONVERGENCE 세 줄 강제 (Stop 훅 · 누락/위조 = decision:block 1회)
                                         갱신/기록 주장은 검증된다: ING = ing ref 전진 · ARCHITECTURE = 파일 diff(working·staged·직전 커밋) · CONVERGENCE = records[] id + diff (마커만 쓰는 자기보고 위조 차단) · stop_hook_active anti-wedge
                                         활성 leg 이 없으면(설계트리·보드 둘 다 없음) 완전 무음. inject = 매턴 트리오 지시 주입 + ing ref 베이스라인 스냅샷. 키워드 스캔 방식 전면 폐기(신호 난입 → 결정적 트리오)
  changelog {add "<title>"|list [N]|render [N]|prune --keep N|--older-than D|autoprune|migrate}   append-only history as CHANGELOG.jsonl (newest-first JSONL · ts+title+body)
                                         add appends(body via stdin) + auto-trims to keep-N(config lint.changelog.keep, default 30), prune deletes old entries(keep-N or age), autoprune = SessionStart-wired trim to keep-N (silent under cap · history stays in git)
                                         render = markdown view, migrate = one-shot CHANGELOG.md→.jsonl. The CHANGELOG-MISSING gate now wants CHANGELOG.jsonl staged
  git-context {inject|show}   SessionStart + per-turn-when-stale: warn when HEAD is BEHIND origin/<default> (stale-branch trap — reading pre-merge code as current). Silent on a clean on-default checkout.
  claudemd {inject|show}   re-inject repo-root CLAUDE.md (project rules) EACH UserPromptSubmit so they stay enforced (optional <!-- enforce:start/end --> block)
  toolkit {list|inject|json|write|check}   command catalog (SSOT = this HELP) — inject surfaces the WHOLE command surface at SessionStart so an agent knows every cmd; check gates TOOLKIT.jsonl drift
  companions {inject|list}   sibling-CLI command surface — inject runs each configured neighbour CLI's catalog at SessionStart so the agent knows \`hexa cloud\` exists without probing
                                         config \`companions\` + ~/.sidecar/companions.json · DOMAIN-AGNOSTIC, e.g. hexa
  prefs {show|code|docs|response <lang>|inject}   language prefs (3 axes) + UserPromptSubmit inject
  easy {show|inject|scaffold "<q>"|lint <file|->}
                           easy friendly-response style — inject (lang from prefs) · scaffold = empty 7-element round skeleton · lint = advisory axis score (no LLM)
  lab-mode {on [fable|sol|full]|off|status|inject} [--repo]   session-scoped toggle — ON splits per-turn work: DESIGN/ANALYSIS/난제 delegated to the lab target, IMPLEMENTATION done locally
                                         target (default fable) = the flag file's content · full = both models, caller reconciles
                                         scope: repo .harness > host ~/.sidecar (repo target wins); default host-wide · OFF emits nothing
  load {show|inject}       per-turn macOS resource readout (CPU load + RAM pressure/used% + swap, ⚠️ on danger) — UserPromptSubmit inject
  recommend {inject|show|get-default|set-default <present|auto|axis|axis+axis…> [--global]|clear-default [--global]|resolve-mode <a>}
                           4-axis rubric + default mode (repo .harness > global ~/.sidecar > present; fixed axis = auto-pick)
  goal-guard stop-check    Stop gate — blocks a reply that PUNTS the work: defers to a future session ('다음 세션에…'/'next session', tail-precise)
                           OR reports live '잔여' (leftover work, negation-aware) — so the agent finishes now; single-fire (stop_hook_active), genuine blocker passes on re-stop (session-terminal)
  sbs [auto[:<axis>]|manual] [<task>]   plan-first runbook — resolver-first mode · chat-form 모호성→0 · plan.md handoff + auto-QA 4축 + 9-section dossier
  abg [labels]             all-bg-go — fan out prior-turn branches as parallel background Agents (runbook)
  afg [labels]             all-fg-go — run prior-turn branches sequentially in-session (runbook)
  fleet [name:goal,…|go|stop|status]   perpetual multi-lane orchestrator (runbook + roster)
  fleet lab [frontier:wall,…|go|…]      research-driven frontier lab (research-gate→implement→measure→SSOT→re-research; walls measured + reopenable)
  fleet abstract [layer:seed,…|go|…]    abstraction-driven layer dive (census LAWS→peel to shared trade-off/meta-law→invent escape→cast as falsifiable prediction; meta-laws reopenable · d6 honest)
  fleet full [frontier:goal,…|parallel|go|…]  full-stack campaign — ALL 3 phases in order per frontier (research→implement→abstract→falsify · implement NEVER skipped)
                                         weak lever still measures a wall before abstract · SEQUENTIAL by default (afg-style; pass 'parallel' to fan out) · cheap implement auto, only paid gates (c14)
  pr-cycle [--no-reap] [gh flags]   push branch → open PR → self-merge (squash·admin·delete-branch) → reap stale open PRs (--no-reap skips)
  reap [--max-refresh N] [--no-close] [--dry-run] [--artifact RE]   drain stale open PRs: merge MERGEABLE (no-admin) · refresh-merge CONFLICTING (doc-files auto-resolved, code conflicts abort) · ≥7d code-conflict PRs closed with branch preserved · cron-able
  dojo [<slug>] [--lang]   cloud training-job scaffolder (runbook + exports/dojo/<slug>/ emit)
  micro-exp [<scope>]      context-driven micro-experiment sweep (infra-gate→budget→dispatch→monitor→absorb→ledger)
  bypass                   anti-punt self-check runbook (proceed on local+reversible; ask only when outward/decision)
  go                       continue the most-recently proposed action without re-confirming
  brainstorm               iterative ideation rounds until depletion (breadth over selection)
  demi                     design-architecture program runbook (7-verb spine)
  gap [full|list|<scope>]   multi-axis gap exploration — 40 breakthrough lenses (8 families) · triage→deepen runbook
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
  paper <new|build|cover|list|publish|update|unpublish|status> [slug] [flags]   demiurge-house scientific paper — scaffold (emoji title · g5 badges · TikZ+pgfplots · fal.ai cover) → xelatex+bibtex×3 build → g51 ≥10-page gate
                           publish --to zenodo|arxiv|both [--sandbox][--source]: Zenodo REST lifecycle (DOI) · arXiv submission tarball+guide (no API)
                           update (Zenodo new-version) · unpublish (delete Zenodo draft) · status — keys via \`secret get zenodo.token\`

gates & ledgers:
  lint [all|fast|verbose]  staged-L0 + freshness + doc-gate checks
  naming audit [path] [--ing] [--gate]   repo-wide non-canonical name audit (version/copy/dup suffix backlog the write-guard never saw) · --ing = land summary on THIS repo's board · --gate = exit 1 on any hit
  hypotheses {check [--gate]|migrate <dir>|scaffold|show}   enforce ONE canonical hypothesis folder (config hypotheses.dir, default HYPOTHESES/) for
                           pre-register->falsify->run->verdict work. The pre write/bash guards block NEW strays (a configured hypotheses.alias, e.g.
                           anima UNIVERSE, or the built-in hypothes*/가설* pattern); check audits the backlog (--gate exits 1), migrate = history-preserving
                           git mv <dir> -> HYPOTHESES/ (merges if it exists), scaffold = create the skeleton, show = active dir + aliases
  ci [all|fast|list|scaffold [--force]]   run configured verification commands in parallel (was verify; config key stays verify.checks)
                                         scaffold = emit a .github/workflows/ci.yml that runs 'sidecar ci' on config ci.{runner,setup,fallback,cachePaths} (init writes it too)
                                         ci.fallback on = cost-free fast path (self-hosted pool then github-hosted fallback, probe-fail-safe, no Blacksmith) + cachePaths = warm actions/cache
  ci-track <pr|branch> [--watch] [--interval=60] [--timeout=1800] [--merge-on-green] [-R owner/repo]   track remote PR/CI checks (gh) → 🟢/🔴/🟡 verdict; --watch polls until terminal (no hand-rolled gh-poll loop)
  verify [rubric|fence "<claim>"]   tier-rubric claim verification (badges · no self-judge)
  errors {route|list|drain_check|mark_fixed}   error-signal ledger — classify by (kind,code) → severity via a pluggable map, queue to append-only JSONL, gate on backlog (drain_check)
  ledger {register|complete|list|gc|dup_check}   background-agent task ledger — dedupe register so parallel fan-outs don't double-spawn work in the same area
  bitter-gate audit [window]   rule-hit frequency → retire dormant rules

reports:
  audit [full|summary|json]    6-axis self-scorecard
  gc [scan|drift]              broken markdown links in guides
  injects                  per-turn inject footprint report (per-source bytes/tokens + aggregate vs injectBudgetBytes) — context-rot visibility
  docs [status|check|scratch [name]]   single-doc discipline (architecture SSOT + log + scratch + quickref)
                               write-time enforced in \`pre write\` (docs.enforce: warn[default]|block|off)
  lockdown {status|add <path...>|rm <path...>|check <path>}   manage L0 set (opt-in · none until designated)
                               add/rm mutate harness.config.json lockdown.files
  folders [scan|scaffold <dir>]   per-subfolder CLAUDE.md coverage + scaffolding (enforced: lint blocks FOLDER-GUIDE-MISSING for the folder of any staged file lacking a guide · commons folder-docs)
  end                          session-closure safety check (uncommitted·unpushed·stash·PRs·branches·worktrees)
  worktree {scan|gc|inject|stop-check|guard <cmd>}   no-pileup/no-stranded enforcement — flag stranded worktrees · auto-sweep merged([gone]) + aged(>maxAgeDays, tip→refs/reaped)
                           (\`inject\`=SessionStart/Compact WARN surfacing stranded worktrees+no-worktree branches+refs/reaped (+ING task link) · \`stop-check\`=Stop-time WARN for committed-but-unpushed worktree work (keyed dedup·never blocks) · \`scan\` exit 1 gates new work · \`gc\` auto-sweep)
  ing [show|add|done|next|inject]   in-progress board → ING.jsonl (작업·next · done=scrub · SessionStart inject · 내 repo 전용)
  frontier [show|set <목표>|go [노트]|swap <새목표>|clear|inject]   single north-star objective (최전선) → FRONTIER.jsonl on a dedicated 'frontier' git ref (single-slot · unlike ing's multi-item board)
                                         지정=set(clobber 거부 → swap) · 진행=go(push-now directive + 진행노트) · 교체=swap(은퇴→CHANGELOG) · 해제=clear · 한글 별칭 허용 · inject surfaces it (silent when unset)
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
    case "lab":
      return runLab(rest);
    case "uninstall":
      return runUninstall(rest);
    case "update":
      return runUpdate(rest);
    case "install-hooks":
      return runInstallHooks(rest);
    case "pi":
      return runPi(rest);
    case "self-update":
      return runSelfUpdate(rest);
    case "hypotheses":
      return runHypotheses(rest);
    case "shadow":
      return runShadow(rest);
    case "fleet":
      return runFleet(rest);
    case "pr-cycle":
      return runPrCycle(rest);
    case "reap":
      return runReap(rest);
    case "ship":
      return runShip(rest);
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
    case "lab-mode":
      return runLabMode(rest);
    case "load":
      return runLoad(rest);
    case "recommend":
      return runRecommend(rest);
    case "goal-guard":
      return runGoalGuard(rest);
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
    case "injects":
      return runInjects(rest);
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
    case "turn-close":
      return runTurnClose(rest);
    case "changelog":
      return runChangelog(rest);
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
    case "frontier":
      return runFrontier(rest);
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
