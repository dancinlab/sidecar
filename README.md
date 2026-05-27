<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>Claude Code plugin pack — concept-separated guardrails, commands, and skills.</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
</p>

---

## What is sidecar

A **Claude Code marketplace repo** that side-mounts guardrails, slash commands, and skills onto the host harness without modifying it. Strict concept separation: one plugin = one of `{hook, command, skill}`, no mixing. Project-level identity + governance lives in a single `project.tape` at the repo root (symlinked as `CLAUDE.md`); the cross-project `do` / `dont` layer rides inside the `commons` hook plugin.

## Install

```bash
# 1. Install hexa-lang (gives you `hexa` + `hx` package manager)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/dancinlab/hexa-lang/main/install.sh)"

# 2. Install sidecar
hx install sidecar
```

Then in any project root:

```
sidecar init
```

`sidecar init` drops three things into the current directory:

- **`project.tape`** — the project's identity + governance carrier (`.tape` v1.2). Open it and fill in the placeholders:
  - `kind` — one line describing what the project is.
  - `brief` — 2–4 sentences on purpose · scope · why it exists.
  - `parent` — org / parent project (e.g. `dancinlab`).
  - `ssot` — canonical location (repo URL or `hx install <name>`).
  - `do` / `dont` — project-level governance bullets, `·` separated.
- **`CLAUDE.md → project.tape`** — symlink so the harness auto-loads project identity on SessionStart.
- **`LATTICE_POLICY.md`** — the cross-project real-limits-first verification policy, carried by sidecar. Skipped if one already exists.

The [`project-tape`](hooks/project-tape/) hook re-injects `project.tape` on PreCompact + PostCompact so identity + governance survive auto-compaction.

## Layout

```
sidecar/
├── bin/sidecar               # CLI — init · sync · mirror · sign · profile · enable · disable · reset · master
├── bin/_overrides.hexa       # per-plugin enable-override store (~/.sidecar/plugin-overrides.json)
├── install.hexa              # hx build hook — clone marketplace · cache · enable per active profile
├── hooks/                    # PreToolUse · SessionStart · PreCompact · PostCompact · LSP plugins
├── commands/                 # /slash-command invoked plugins
├── skills/                   # Skill tool invocable plugins
├── project.tape              # sidecar's identity + governance (also linked as CLAUDE.md)
├── LATTICE_POLICY.md         # real-limits-first policy (→ hooks/commons/, dropped by `sidecar init`)
├── CLOSURE_POLICY.md         # closure-honesty policy (SSOT freshness + perpetual domains)
├── DESIGN.md / DESIGN.log.md # live design-rules pointer + decision audit trail
├── CHANGELOG.md              # chronological ship log
└── .claude-plugin/
    ├── marketplace.json      # plugin manifest (name · source · version)
    └── profiles.json         # enable-profile tiers (core · hexa · personal · master[creator-only])
```

## Profiles

sidecar ships an opinionated stack. A **profile** picks which plugins to enable so you don't inherit the whole personal layer — pick one after install:

| Profile | Enables | For |
|---|---|---|
| `minimal` | `core` only | general use — universal safety · QoL · workflow |
| `hexa` | `core` + `hexa` | + the hexa-lang toolchain (`hexa` CLI · `.hexa` / `.tape`) |
| `full` *(default)* | `core` + `hexa` + `personal` | the complete dancinlab setup |
| `master` | + `master` tier | **creator-only** — gated by the `~/.sidecar/master` marker |

```
sidecar profile minimal     # set the profile (re-applies the install)
sidecar profile             # show the active profile + any per-plugin overrides
sidecar enable  <plugin>    # force one plugin ON  — overrides the profile
sidecar disable <plugin>    # force one plugin OFF
sidecar reset   <plugin>    # drop the override → follow the profile again
sidecar master on|off|status   # mint/remove the creator marker (~/.sidecar/master)
```

Each plugin's tier is the **Tier** column below; the classification SSOT is [`.claude-plugin/profiles.json`](.claude-plugin/profiles.json). This rides on Claude Code's own plugin enable/disable — **not** an in-guard opt-out — so an enabled guard stays unconditional (`@D s11`). State lives in `~/.sidecar/profile` + `~/.sidecar/plugin-overrides.json`; `sidecar-lint` flags any plugin missing a tier so the classification stays complete (`@D s7`).

### `master` tier — creator-only

The `personal` tier is dancinlab-specific but anyone can opt in via `full`. The **`master` tier is genuinely creator-only**: a `master`-tier plugin enables **only while the `~/.sidecar/master` marker exists** — force-disabled otherwise, *even under the `full`/`master` profile* (a per-plugin `enable` override still escapes it). The marker isn't shipped, so public installs never get `master` plugins; the creator runs `sidecar master on` once to mint it. Current `master`-tier members: `stdlib-ssot-guard` (PreToolUse advisory) + `stdlib` (`/stdlib check`·`promote` skill) — together the g61 cross-repo SSOT enforcement pair, dancinlab workflow only.

## Commands

All slash commands at a glance, grouped by purpose. Each is backed by a plugin in the table below.

```
# ── Discovery ───────────────────────────────────────────────
/kick:kick <seed>                 hexa kick — gap-breakthrough / discovery engine
/gap:gap [scope|full]             42-lens multi-axis gap sweep (8 families)
/brainstorm:brainstorm <seed>     width-first idea exhaustion (rounds until depletion)

# ── Fan-out / loop ──────────────────────────────────────────
/cycle:cycle                      autonomous loop: self-enumerate (empty → seed from `## deferred`) → plan → fan-out → auto-continue to depletion
/cycle:cycle-full <goal>          /cycle:cycle + a one-time phase-0 depletion brainstorm, then auto-continue to depletion
/cycle:cycle-loop                 /cycle:cycle via the /loop skill — explicit continuous-intent pacing surface (same depletion end-state)
/cycle:cycle-full-loop            /cycle:cycle-full once, then /loop /cycle:cycle — drains to the same depletion condition
/step-by-step:step-by-step <task>  sequential runbook: plan → auto-run steps in order (alias /step-by-step:sbs)

# ── Dispatch ────────────────────────────────────────────────
/pool:pool <args>                 host roster + remote exec on sidekick hosts
/cloud:cloud <args>               hexa cloud — rented-GPU pod dispatch (runpod / vast.ai)
/micro-exp:micro-exp [scope]      context-driven micro-experiment sweep (pods → monitor → parse → atlas auto-fold)

# ── Cross-project ───────────────────────────────────────────
/domain:domain <task>             <NAME>.md snapshot + <NAME>.log.md checkbox-task log
/domain:domain list               repo-wide domain index — DOMAINS.tape roster (NAME→path, domains anywhere)
/domain:domain list --sync        reconcile DOMAINS.tape with disk (bootstraps the roster)
#                                 cross-repo handoff → `cd <target> && /domain:domain set INBOX`

# ── Verify / atlas / help ───────────────────────────────────
/verify:verify <args>             hexa verify — tier rubric (🔵🟢🟡🟠🔴⚪)
/atlas:atlas <args>               hexa atlas — SSOT surface (lookup · stats · register, PR-only landing)
/hexa-help:hexa-help [verb]       hexa --help (top-level catalog or per-verb signature)

# ── Research / generate ─────────────────────────────────────
/research:arxiv <q>               arXiv API search / id lookup
/research:yt <url>                YouTube caption transcript extract
/imagine:imagine <pf> <out>       AI image gen (fal backend · gpt-image-2 pinned)
/paper:paper <args>               arxiv LaTeX scaffolder (new·sample·fig·compile·lint·list)

# ── Account / credentials ───────────────────────────────────
/quota:quota [verb]               Claude 5h/7d usage + multi-account registry · switch · nicknames
/secret:secret <args>             macOS Keychain-backed credential CLI (dual-channel sync)

# ── Session / meta ──────────────────────────────────────────
/inject:inject  (/inject:ij)      sidecar sync + inject commons.tape/project.tape THIS turn
/ship:ship -m "<msg>" …           atomic commit + push + sidecar sync
/sidecar:sidecar <verb>           marketplace CLI — init · sync · sign · profile · enable · disable · reset
/prefs:prefs <axis> <lang>        language prefs (code · docs · response)
/easy:easy                        friendly 7-element response style
/check:check                      task dashboard (domain log · open PRs · git · merges)
/end:end                          session-closure safety check (dangling-residue dashboard)
/question:question (/question:q) <txt>  quick side-question, no task pivot (alias for /btw)

# ── Auto-fire hooks (no command) ────────────────────────────
# DENY (hard block):
#   hexa-native    .py/.sh writes in project.tape repos → re-issue as .hexa
#   plist-guard    .plist writes
#   cloud-guard    runpodctl/vastai exec/ssh → hexa cloud (g8)
#   verify-guard   wolframscript / inline-sympy → hexa verify (g5)
#   ai-api-guard   curl AI-host / inline AI-SDK → the CLI wrapper (g50)
#   sign-guard     edits to commons.tape/project.tape/.gitignore until `sidecar sign` (s13)
#   git-guard      force-push (+ stale-base push & merge advisory)
#   tape-lint      .tape edits (fields · length · authoring-language)
# REWRITE / ROUTE:
#   pool-route     heavy Bash → ssh to a pool host
#   pr-cycle       `gh pr create` → appends && gh pr merge + worktree clean (g47); DENIES auto-merge on mass-deletion outlier (deletion-sanity gate, anima #1105)
#   output-trim    >8000-char Bash stdout → dedup + truncate
# ADVISORY (non-blocking additionalContext):
#   sidecar-lint   git-commit: stale-history · hardpath · version drift · CHANGELOG · profiles tier · mcp-ban
#   workdir-guard  working tree shared by ≥2 agents → use a worktree (s-shared)
#   memory-lint    MEMORY.md pileup / long lines → archive
#   inbox-log-lint INBOX.log.md pileup → archive
#   limit-guard    subagent session-limit → checkpoint directive
#   monitor-guard  bg/long shell launch → detach + log + Monitor (g10, rate-limit survival)
#   pod-monitor    GPU pod fire → SAVE_POD / detach reminders (g57)
#   s9-guard       Mac load-check cmds → exclude claude PIDs (s9)
# SESSION lifecycle:
#   easy-auto · quota-autoadd · worktree-gc · sidecar-auto-sync · subagent-route[POC]
```

## Plugins

64 plugins across `{hook · command · skill}` — one concept each (29 `core` · 17 `hexa` · 18 `personal`). The **Tier** column is the [enable profile](#profiles) a plugin belongs to.

| Name | Kind | Tier | Version | Summary |
|---|---|---|---|---|
| [`brainstorm`](skills/brainstorm/) | command + skill | `core` | 0.1.1 | Iterative brainstorming |
| [`bypass`](skills/bypass/) | skill | `core` | 0.2.1 | Anti-punt |
| [`check`](skills/check/) | command + skill | `core` | 0.1.0 | Task dashboard skill |
| [`cycle`](skills/cycle/) | command + skill | `core` | 0.9.1 | Autonomous work-loop driver (whole family auto-drains to depletion) · 7 commands: /cycle · /cycle-full · /cycle-loop · /cycle-full-loop · /cycle-all (no cap + no recommend gate) · **/cycle-fg + /cycle-bg (0.9.1 — STICKY execution-mode toggle** via `~/.sidecar/cycle-mode`: fg=in-session sequential one-at-a-time·halt on failure, bg=background parallel fan-out·auto-continue. Once set, subsequent bare /cycle keeps that mode — fg for debugging/review, bg (default) for parallel bursts) |
| [`domain`](skills/domain/) | command + skill | `core` | 0.8.7 | Maintain UPPERCASE <NAME>.md (snapshot = final-goal milestone checkboxes) + sister <NAME>.log.md (append-only step log) · `/domain list` repo-wide index (DOMAINS.tape roster — domains at any path)… |
| [`draft`](skills/draft/) | command + skill | `core` | 0.2.0 | Ephemeral scratchpad — `/draft <slug>` scaffolds `drafts/<slug>.md`; `add <slug> <content>` appends timestamped bullet; `rm <slug>` deletes one; `drafts/` auto-gitignored; LLM AUTO-REGISTERS on natural-language register/jot/note signals (any language) by picking a slug from context and running `/draft add`; symmetric delete-that-note triggers map to `/draft rm` |
| [`end`](skills/end/) | command + skill | `core` | 0.2.0 | Session closure safety check |
| [`matrix`](skills/matrix/) | command + skill | `core` | 0.1.0 | Axis cross-product coverage tracker — `/matrix` manages an axis × axis grid via cwd-local `MATRIX.tape` (SQUARE: one axis set, pairs · RECTANGULAR: `rows` × `cols`); `done <i> <j>` toggles a cell, bare renders the grid (small) or per-row coverage bars (large) + coverage % + next unfilled cells |
| [`trail`](skills/trail/) | command + skill | `core` | 0.1.0 | Main-flow return stack (LIFO) — `/trail push <target>` records where to climb back when deviating into ANY side-task (intra-repo tangent/sub-fix OR cross-repo/upstream fix — not only cross-repo); `pop` closes the top detour + shows what to resume; bare renders the ladder (deepest = ★ NOW); HOME-global `~/.sidecar/trail.tape` (one stack for the current dive, survives `cd`); LLM auto-uses per commons g74 |
| [`gap`](commands/gap/) | command | `core` | 0.2.0 | multi-axis gap exploration |
| [`gh-stack`](skills/gh-stack/) | skill | `core` | 0.1.1 | Stacked-PR workflow skill |
| [`git-guard`](hooks/git-guard/) | hook | `core` | 0.6.0 | PreToolUse(Bash) git-push safety guard, in hexa-lang (`_git_guard.hexa`, via `hexa run`); 0.6.0 adds a non-blocking stale-base MERGE advisory (warns when a `gh pr merge` lands a branch >= 20 commits behind origin/main — anima #1105 stale-base path) |
| [`limit-guard`](hooks/limit-guard/) | hook | `core` | 0.1.3 | PostToolUse(Task) hook, implemented in hexa-lang (`_limit_guard.hexa`, invoked via `hexa run`) |
| [`memory-lint`](hooks/memory-lint/) | hook | `core` | 0.1.0 | PostToolUse(Write\|Edit) advisory for the auto-memory index file (`memory/MEMORY.md`), implemented in hexa-lang (`_memo… |
| [`drift-guard`](hooks/drift-guard/) | hook | `core` | 0.1.1 | PostToolUse(Write\|Edit) advisory — design-drift → memory sync; 0.1.1 limits sentinel scan to source-code extensions + skips sidecar repo's own `/hooks/drift-guard/` tree (kills self-trigger noise from prose docs that documented the marker) |
| [`throttle-guard`](hooks/throttle-guard/) | hook | `core` | 0.1.0 | PostToolUse(Task\|Agent) cross-session transient-throttle coordinator — shared cooldown marker + jitter backoff + WIDTH cut (distinct from limit-guard's usage cap) |
| [`monitor-guard`](hooks/monitor-guard/) | hook | `core` | 0.1.5 | PreToolUse(Bash) advisory for bg/long shell launches — detach + log + Monitor-on-log (commons @D g10); 0.1.5 — `has_log` token-position via `_has_log_pos`+`_redirect_targets` (quote-aware `>`/`>>` target + `tee` file-arg + `<<` heredoc) — commands merely mentioning `.log` no longer satisfy the sink check, finishing the substring → token-position sweep |
| [`output-trim`](hooks/output-trim/) | hook | `core` | 0.1.3 | PreToolUse(Bash) stdout trimmer |
| [`pool`](skills/pool/) | command + skill | `core` | 0.2.2 | wraps the `pool` CLI (host roster + remote exec |
| [`prefs`](commands/prefs/) | command | `core` | 0.4.0 | /prefs view/set language prefs (code · docs · response) — writes the fixed prefs.json SSOT |
| [`prefs-hook`](hooks/prefs-hook/) | hook | `core` | 0.1.0 | UserPromptSubmit+SessionStart+PreCompact+PostCompact — injects language prefs from the fixed SSOT (prefs split) |
| [`question`](skills/question/) | command + skill | `core` | 0.2.0 | Quick side-question alias for Claude Code's built-in `/btw` |
| [`quota`](skills/quota/) | command + skill | `core` | 0.10.0 | Claude account 5h/7d usage limits + multi-account registry + live credential swap + per-account nicknames |
| [`quota-autoadd`](hooks/quota-autoadd/) | hook | `core` | 0.1.1 | SessionStart hook |
| [`research`](skills/research/) | command + skill | `core` | 0.2.4 | Research-fetch tools |
| [`roi`](skills/roi/) | command + skill | `core` | 0.1.0 | /roi [scope] — LOSSLESS perf/resource/speed improvement candidates as a ranked TODO. Scope bare=active-domain/cwd · `/roi <message>`=file/dir/feature scope. risk=low ONLY (no functional regression). Categories ⚡speed · 🧠perf · 💾resource · 🔋efficiency. Sorted by impact/effort ratio; benchable items grounded via @D bench_kernel_choices |
| [`secret`](skills/secret/) | command + skill | `core` | 0.4.1 | wraps the `secret` CLI (macOS Keychain-backed credentials, dancinlab/secret 0.4.0, dual-channel sync) |
| [`sidecar`](commands/sidecar/) | command | `core` | 0.6.0 | thin wrapper over the `sidecar` marketplace CLI (host-local, on PATH via `hx install sidecar`). **0.6.0 adds `sidecar paths`** — manage the LOCAL-EXECUTION WHITELIST `~/.sidecar/local-paths` (pool-route 0.10.0 reads it). `paths` (list) · `paths add` (register cwd) · `paths add <dir>` (abs-resolved dir, refuses non-existent / already-present) · `paths rm <prefix>`. Seeded on first use with `~/.claude/plugins/cache/sidecar/` + `~/core/sidecar/`. Atomic writes (tmp+mv); whitelist itself IS the opt-in — no env opt-out (@D s11). |
| [`step-by-step`](commands/step-by-step/) | command + alias `/sbs` | `core` | 0.6.0 | plan-first sequential runbook · **TWO modes** + **0.6.0 자동 QA 4축**: **MANUAL (default)** — chat-form disambiguation (1Q/round, easy-mode 7-element scaffold — icon·name·alias·plain-line·analogy·ASCII·compare-table·recommendation; free-form answers OK) until ambiguity=0, then `🎯 합의된 결정셋` ASCII tree pause (user `go` or `Qn=<other>` to flip just that one), then write `drafts/<slug>-plan.md` (gitignored) + **launch background Agent** that runs end-to-end including ship + **auto-QA 4축** — user can leave · **AUTO** same chat-form scaffold rendered but each question AUTO-PICKED by 4-axis weighted average (완성도·단순·안전(blast radius)·표준(sidecar pattern); default 1:1:1:1, inline override `/sbs auto:safety <task>` or `/sbs auto:complete=2,simple=3 <task>`) — still pauses at agreement screen. **0.6.0 자동 QA 4축** (handoff agent ship 직후) — functional (새 endpoint 응답) · visible (URL/path 노출) · conformance (locked decision ↔ 코드 1:1) · regression (기존 surface 미손상). Hybrid fail: regression FAIL → `git revert <SHA>` 자동 + banner; 나머지 FAIL → ship 유지 + plan.md `## qa-deferred` + banner; SKIP=PASS-equivalent. `legacy-manual` = the prior per-step pause behavior (1-version deprecation banner). (`go` is a separate command, not a mode) |
| [`workdir-guard`](hooks/workdir-guard/) | hook | `core` | 0.1.0 | SessionStart advisory (hexa-lang `_workdir_guard.hexa`, via `hexa run`) that fires once per session, and only when the… |
| [`worktree-guard`](hooks/worktree-guard/) | hook | `core` | 0.2.0 | PreToolUse(Bash) advisory on `git worktree add` — durable-worktree drill: commit+push promptly, a sibling prune / sync / tmp-reaper can delete the worktree + uncommitted edits; 0.2.0 adds a branch-reuse advisory (`add -b <br>` reusing an existing/local-only-stale branch — anima #1105 stale-base risk) |
| [`worktree-gc`](hooks/worktree-gc/) | hook | `core` | 0.2.0 | SessionStart hook that prunes merged-but-undeleted LINKED git worktrees (hexa-lang `_worktree_gc.hexa`). Prunes only when HEAD truly landed on origin/main; FOUR live-work guards (dirty · recent-mtime <1h · cwd-in-use · HEAD-ancestor) + atomic prune so an active worktree is never wiped mid-task |
| [`atlas`](skills/atlas/) | command + skill | `hexa` | 0.1.1 | wraps `hexa atlas` (atlas SSOT surface) |
| [`cloud`](skills/cloud/) | command + skill | `hexa` | 0.4.0 | wraps `hexa cloud` (runpod / vast.ai dispatch). 0.4.0 surfaces **`cloud pods` / `cloud dispatch [tree\|active\|add\|verdict\|rm]`** — per-project active pod/job work manifest at cwd's `./pods.json` (one file per repo · update-form · distinct from global `~/.hexa-cloud/pods.jsonl` orphan/billing registry; hexa-lang PR #1699). 0.3.5 atomic `cloud fire` + `__MONITOR_HANDLE__` JSON-line contract (hexa-lang PR #1306 + #1309). |
| [`cloud-guard`](hooks/cloud-guard/) | hook | `hexa` | 0.2.2 | PreToolUse(Bash) hard block for raw rented-GPU pod dispatch (commons @D g8) |
| [`hexa-help`](skills/hexa-help/) | command + skill | `hexa` | 0.2.1 | wraps `hexa --help` (no arg, top-level catalog) or `hexa <verb> --help` (verb-specific) |
| [`hexa-lsp`](hooks/hexa-lsp/) | hook | `hexa` | 0.1.1 | Wire the hexa-lang LSP server (`hexa lsp`) for `.hexa` files |
| [`hexa-native`](hooks/hexa-native/) | hook | `hexa` | 0.3.2 | PreToolUse(Write\|Edit\|NotebookEdit\|Bash) hard block for `.py` / `.sh` writes inside any project rooted at a directory… |
| [`hxc-lsp`](hooks/hxc-lsp/) | hook | `hexa` | 0.1.0 | Wire `hxc-lsp` (HXC hexa-canonical wire/storage format LSP — diagnostics + hover) for `.hxc` files |
| [`kick`](skills/kick/) | command + skill | `hexa` | 0.2.1 | runs `hexa kick --seed "<seed>"` (hexa-lang gap-breakthrough / discovery engine, aliased to `hexa drill`) |
| [`kosmos-lsp`](hooks/kosmos-lsp/) | hook | `hexa` | 0.1.0 | Wire `kosmos-lsp` (kosmos multimodal knowledge-anchor manifest LSP — diagnostics + hover) for `.kosmos` files |
| [`micro-exp`](skills/micro-exp/) | command + skill | `hexa` | 0.2.0 | context-driven micro-experiment sweep orchestrator (self-enumerate → pod budget → monitor → parse → atlas auto-fold) |
| [`mining`](skills/mining/) | command + skill | `core` | 0.3.0 | /mining — lens-driven DIVERGENCE (leaves) + connect-driven CONVERGENCE (edges) + tidy-driven ORGANIZE (phase regroup) workflow, 3rd pillar of /domain. `<NAME>.mining.md` (## cycles · ## leaves · ## edges, append-only) + `<NAME>.mining.tape` (idea cart). THREE workflows — **lens** (divergence; deplete at 0 new leaves) · **connect** (convergence; deplete at 0 new edges in a full pass) · **tidy** (organize; reorganize cycles into PHASE groups divergence/analysis/convergence/external + chronological cycle-index table — LOSSLESS, index preserves order). Bundled lenses: **same-formula** · **ouroboros** (goal closure) · **dimensional** · **tension** · **combinatorial** · **custom**. Verbs (12): bare (status + auto-suggest tidy at ≥10 cycles & ≥500 lines) · `<lens>` (round) · `append` · `cycle new` · `depletion` · `tree` · `connect`/`edges` · `connect <a> <b>` · `graph` · `saturate` · `tidy`/`consolidate` [`--depth=light\|full`] · `squash` (cosmetic dup-header dedup). Active-domain only (commons @D g58) |
| [`n6-lsp`](hooks/n6-lsp/) | hook | `hexa` | 0.1.0 | Wire `n6-lsp` (NEXUS-6 knowledge-atlas grammar LSP — diagnostics + hover) for `.n6` files |
| [`paper`](skills/paper/) | command + skill | `hexa` | 0.11.0 | arxiv-style LaTeX paper scaffolder. 0.11.0 fixes 3 verbs (INBOX #112): `pr-roll` early-reject bare repo + jq `\\\\#` escape · `atoms` `LC_ALL=C` + lowercase compare + fn-dispatch match · `arxiv-prep` absolute tar path |
| [`pod-monitor`](hooks/pod-monitor/) | hook | `hexa` | 0.1.3 | PreToolUse(Bash) advisory hook for GPU pod fires (`hexa cloud nohup` / `fire` / `run`); 0.1.3 token-position match (no longer fires on commit/grep mentions) |
| [`tape-lint`](hooks/tape-lint/) | hook | `hexa` | 0.5.1 | PreToolUse(Edit\|Write) deny for `.tape` edits, implemented in hexa-lang (`_tape_lint.hexa`, invoked via `hexa run` |
| [`tape-lsp`](hooks/tape-lsp/) | hook | `hexa` | 0.1.1 | Wire `tape-lsp` (canonical .tape v1.2 LSP |
| [`verify`](skills/verify/) | command + skill | `hexa` | 0.2.1 | runs `hexa verify "$@"` (cross-project tier rubric, TECS-L-aligned) |
| [`verify-guard`](hooks/verify-guard/) | hook | `hexa` | 0.1.2 | PreToolUse(Bash) hard block for raw verification-tool usage cited as primary evidence, implemented in hexa-lang (`_ver… |
| [`ai-api-guard`](hooks/ai-api-guard/) | hook | `personal` | 0.1.3 | PreToolUse(Bash) hard block for raw AI-API calls when a sidecar CLI wraps the same operation, implemented in hexa-lang… |
| [`commons`](hooks/commons/) | hook | `personal` | 0.10.14 | UserPromptSubmit + SessionStart + PreCompact + PostCompact hook |
| [`easy`](skills/easy/) | command + skill | `personal` | 0.1.2 | Easy (friendly) response style |
| [`easy-auto`](hooks/easy-auto/) | hook | `personal` | 0.2.0 | SessionStart + UserPromptSubmit + PreCompact + PostCompact hook; 0.2.0 adds 한국어 substring NL 트리거 '설명'/'쉽게' (UserPromptSubmit · verb/noun/adverb 어형 catch) + 발동 시 1줄 banner emit (always-on inject는 그대로) |
| [`go`](skills/go/) | command + skill | `core` | 0.1.0 | /go [hint] — proceed with most-recently proposed action / continue paused flow without further confirmation. Bare "go" single-word message catches as NL alias. Stateless continuation token (not a runbook). Optional hint: `retry`/`skip`/`all`/host-name |
| [`imagine`](skills/imagine/) | command + skill | `personal` | 0.2.3 | generic AI image generator |
| [`inbox-guard`](hooks/inbox-guard/) | hook | `personal` | 0.1.0 | PreToolUse(Write\|Edit\|NotebookEdit) hard block for any write into an `inbox/` folder — the canonical handoff SSOT is `INBOX.md` (single file + sibling `INBOX.log.md`); folder-style `inbox/<kind>/<slug>.md` fragments active state and is refused. No opt-out by design. Companion: legacy `inbox` skill retired |
| [`inbox-log-lint`](hooks/inbox-log-lint/) | hook | `personal` | 0.1.0 | PostToolUse(Write\|Edit) advisory for the INBOX domain log (`INBOX.log.md`) |
| [`inject`](skills/inject/) | command + skill | `personal` | 0.2.0 | Immediately inject the latest sidecar commons.tape + project.tape into the CURRENT session and sync the local install… |
| [`plist-guard`](hooks/plist-guard/) | hook | `personal` | 0.1.2 | PreToolUse(Write\|Edit\|NotebookEdit) hard block for `.plist` writes, implemented in hexa-lang (`_plist_guard.hexa`, inv… |
| [`pool-route`](hooks/pool-route/) | hook | `personal` | 0.10.0 | PreToolUse(Bash) pool auto-router + sign-local single-gate. **0.10.0 SIDECAR PATH-PREFIX WHITELIST** — a new permanent LOCAL-EXECUTION layer reads `~/.sidecar/local-paths` (USER-managed via the new `sidecar paths {bare|add|rm}` CLI verb). Any Bash cmd whose argv contains a `/`-prefixed absolute-path token that starts with a registered prefix is **forced LOCAL** (skip pool routing) — the PERMANENT counterpart to the runtime `sign-local` token (which is one-shot 30-min). Hook scans ALL argv tokens, tolerates a missing file (no fail-closed), skips blank + `#` comment lines. Seeded on first use with sidecar's own cache + repo paths (`~/.claude/plugins/cache/sidecar/` + `~/core/sidecar/`) so sidecar's own hexa hooks/commands stop bouncing into the pool. Sits between host-introspection and the heavy classifier; emits a one-line `pool-route: local (sidecar path whitelist · prefix=<matched>)` on hit. The whitelist itself IS the opt-in — no env opt-out (@D s11). **0.9.3 DATA-LOCALITY PIN + SIGN-LOCAL TTL 30min** (anima PURE F-CURRICULA-1) — a local-data-dependent `hexa run` was blocked on both paths: **(a)** a hexa exec with a data-INPUT flag (`--corpus-path`/`--corpus`/`--data`/`--data-path`/`--dataset`/`--input`/`--train-data`/`--eval-data`/`--weights`/`--ckpt`/`--checkpoint`) pointing at a LOCAL-ONLY path (NOT under a synced `~/core/` workdir) now **pins local** — the peer has no copy of that data, so routing reproduced `… --corpus-path /Users/…/c.jsonl` → ubu-2 → compile-stage `source not found` (data-absence misread as code error); synced `~/core` data still routes. **(b)** sign-local TTL **5min→30min** (`LOCAL_SIGN_TTL=1800`) — a real local build runs 10-20min, exceeding the old 5min window so a mid-build `hexa run` re-tripped the fork-storm gate; trade-off (6× longer guard window) accepted — the `local` token is explicit/user-minted/single-key/clearable. INDEPENDENT of the governance sign TTL (`SIGN_TTL=300`, stays 5min). **0.9.0 POLICY INVERSION** — user directive "everything to pool · only the whitelist may stay local": default = **POOL** (the `light_allowed` fallthrough is REMOVED). Only LOCAL-EXECUTION WHITELIST hits stay local — additions sign-gated (project.tape s13 / TUI `!`). Whitelist members: $CLAUDE_PLUGIN_ROOT/DATA · hexa cloud · hexa atlas register · git/gh/pool · /Users//home abs-path (sign-gated) · ~/. dotstate · npm/pnpm/yarn · **0.9.0 host-introspection** (ps/top/uptime/w/who/df/du/free/vmstat/iostat/uname/sysctl/launchctl/systemctl/pgrep/pkill/kill/killall/stat/lsof/netstat/ifconfig/ip/arp/route/dscl/scutil/sw_vers — these MEASURE THIS host's state; routing returns peer state, semantically broken; first-token basename match) · `! sidecar sign local` 5min runtime token. Pre-0.9.0 heavy classifier kept only for OS-capability hints (is_macos/is_linux). The `find /` root-tree case (anima 100%+ CPU 2:44+ on Mac) now routes by default. SSH overhead accepted by policy. **0.8.3 pool-canonical `~/.hx/canon`** — pool dispatch pins hexa to pool-owned origin/main checkout via `HEXA_REAL_BIN` + `HEXA_LANG=$HOME/.hx/canon` + `HEXA_DAEMON=0` (bootstrap via `~/.hx/canon-update.sh`) |
| [`pr-cycle`](commands/pr-cycle/) | command | `personal` | 0.4.0 | /pr-cycle one-shot PR cycle (push + create; the pr-cycle-hook plugin appends merge + worktree-clean) |
| [`pr-cycle-hook`](hooks/pr-cycle-hook/) | hook | `personal` | 0.2.0 | PreToolUse(Bash) router — appends merge + worktree/branch cleanup to `gh pr create` (commons @D g47; pr-cycle split); 0.2.0 adds a deletion-sanity gate that DENIES the auto-merge on a mass-deletion outlier (D>50 or deletions >= 10x additions — anima #1105's 35190-file stale-base regression) |
| [`project-tape`](hooks/project-tape/) | hook | `personal` | 0.2.1 | PreCompact + PostCompact hook |
| [`s9-guard`](hooks/s9-guard/) | hook | `personal` | 0.1.0 | PreToolUse(Bash) advisory hook for load-assessment commands (project.tape @D s9) |
| [`ship`](skills/ship/) | command + skill | `personal` | 0.3.2 | Atomic ship tail for sidecar plugin changes |
| [`sidecar-auto-sync`](hooks/sidecar-auto-sync/) | hook | `personal` | 0.2.0 | SessionStart hook that runs `sidecar sync` once per Claude Code session, implemented in hexa-lang (`_sidecar_auto_sync… |
| [`sidecar-lint`](hooks/sidecar-lint/) | hook | `personal` | 0.7.0 | PreToolUse(Bash) auto-lint that fires on `git commit` in any Claude Code marketplace plugin pack (any repo with .claud… |
| [`sign-guard`](hooks/sign-guard/) | hook | `personal` | 0.1.6 | PreToolUse(Write\|Edit\|NotebookEdit\|Bash) sign-gate for sign-gated files (commons.tape · project.tape · .gitignore), in hexa-lang — agent edits need a fresh `sidecar sign <key>` token; hard-denies self-mint |
| [`subagent-route`](hooks/subagent-route/) | hook | `personal` | 0.1.0 | [POC] PreToolUse(Task\|Agent) observation hook + SessionStart observation-log snapshot, implemented in hexa-lang (`_sub… |

## Governance

Sidecar's own identity + governance lives in [`project.tape`](project.tape) (also reachable via `CLAUDE.md`). Cross-project `do` / `dont` rules ride inside the `commons` hook plugin and auto-inject at SessionStart + PreCompact + PostCompact. Local sidecar decisions (concept separation, ship cycle, evidence-before-ship, cross-project carrier) are recorded in [`DESIGN.log.md`](DESIGN.log.md) as numbered decisions; [`DESIGN.md`](DESIGN.md) is the live-rules pointer.

## Policies

Two honesty policies — cross-cutting rules that stop autonomous work from making *false claims*. Both share the same form: "claim X must be proven; it is not the default."

| Policy | Honesty of what | One-liner |
|---|---|---|
| [`LATTICE_POLICY.md`](LATTICE_POLICY.md) | *limit* claims | a ceiling must be a real physics/math limit (no convenience numbers) — commons `g25`·`g26` |
| [`CLOSURE_POLICY.md`](CLOSURE_POLICY.md) | *closure* claims | a domain is "done" ONLY when judged from a fresh·live SSOT · perpetual domains never terminate — cycle `@D ssot_freshness`·`perpetual_domain` + domain stale-guard |

`CLOSURE_POLICY` was derived from the incident where anima's `LIFE` domain wrongly declared `✅ 100% depleted` due to a stale untracked copy + perpetual misclassification (enforced by cycle 0.7.7 + domain 0.8.8).

## Reference

- [`project.tape`](project.tape) — sidecar's identity + governance (linked as `CLAUDE.md`).
- [`DESIGN.md`](DESIGN.md) / [`DESIGN.log.md`](DESIGN.log.md) — live design-rules pointer + decision audit trail.
- [`LATTICE_POLICY.md`](LATTICE_POLICY.md) / [`CLOSURE_POLICY.md`](CLOSURE_POLICY.md) — honesty policies (limit-claim · closure-claim) — see [Policies](#policies).
- [`CHANGELOG.md`](CHANGELOG.md) — chronological log of notable changes (one entry per ship batch).
- [`GH-STACK.md`](GH-STACK.md) / [`GH-STACK.log.md`](GH-STACK.log.md) — stacked PR workflow reference + enablement history.

## License

MIT.
