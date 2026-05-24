<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>Claude Code plugin pack — concept-separated guardrails, commands, and skills.</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
</p>

---

## What is sidecar

A **Claude Code marketplace repo** that side-mounts guardrails, slash commands, and skills onto the host harness without modifying it. Strict concept separation: one plugin = one of `{hook, command, skill}`, no mixing. Project-level identity + governance lives in a single `project.tape` at the repo root (symlinked as `CLAUDE.md`); the cross-project `do` / `dont` layer rides inside the `commons` hook plugin.

## Latest ship

<!-- LATEST-SHIP -->
2026-05-24T19:10Z · feat(sidecar-lint 0.5.0): profiles.json tier 누락 검사 — s7 갭 닫음 (PR3)

프로파일(PR1·PR2)의 enforcement. 검사 (6): .claude-plugin/profiles.json이
있는 레포에서 marketplace.json 플러그인이 tiers에 미분류면 non-blocking
finding. 미분류 플러그인은 조용히 personal로 빠져 minimal/hexa에서 사라지므로
(s7: 거버넌스는 enforcement와 함께 ship), 태깅하라고 advisory로 알림.

sidecar 전용: profiles.json 없는 타 플러그인팩은 skip. guards-narrow-scope
원칙대로 deny 아닌 advisory.

검증: hexa parse · true-positive(temp 레포 미분류 beta만 플래그, tagged alpha
제외) · false-positive 가드(이 레포 55개 전부 tagged → 무음).
<!-- /LATEST-SHIP -->

## Install

```
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
├── bin/sidecar               # CLI — init · sync · sign · profile · enable · disable · reset
├── bin/_overrides.hexa       # per-plugin enable-override store (~/.sidecar/plugin-overrides.json)
├── install.hexa              # hx build hook — clone marketplace · cache · enable per active profile
├── hooks/                    # PreToolUse · SessionStart · PreCompact · PostCompact · LSP plugins
├── commands/                 # /slash-command invoked plugins
├── skills/                   # Skill tool invocable plugins
├── mcps/                     # MCP server plugins (pool-mcp)
├── project.tape              # sidecar's identity + governance (also linked as CLAUDE.md)
├── LATTICE_POLICY.md         # real-limits-first policy (→ hooks/commons/, dropped by `sidecar init`)
├── DESIGN.md / DESIGN.log.md # live design-rules pointer + decision audit trail
├── CHANGELOG.md              # chronological ship log
└── .claude-plugin/
    ├── marketplace.json      # plugin manifest (name · source · version)
    └── profiles.json         # enable-profile tiers (core · hexa · personal)
```

## Profiles

sidecar ships an opinionated stack. A **profile** picks which plugins to enable so you don't inherit the whole personal layer — pick one after install:

| Profile | Enables | For |
|---|---|---|
| `minimal` | `core` only | general use — universal safety · QoL · workflow |
| `hexa` | `core` + `hexa` | + the hexa-lang toolchain (`hexa` CLI · `.hexa` / `.tape`) |
| `full` *(default)* | everything | the complete dancinlab setup |

```
sidecar profile minimal     # set the profile (re-applies the install)
sidecar profile             # show the active profile + any per-plugin overrides
sidecar enable  <plugin>    # force one plugin ON  — overrides the profile
sidecar disable <plugin>    # force one plugin OFF
sidecar reset   <plugin>    # drop the override → follow the profile again
```

Each plugin's tier is the **Tier** column below; the classification SSOT is [`.claude-plugin/profiles.json`](.claude-plugin/profiles.json). This rides on Claude Code's own plugin enable/disable — **not** an in-guard opt-out — so an enabled guard stays unconditional (`@D s11`). State lives in `~/.sidecar/profile` + `~/.sidecar/plugin-overrides.json`; `sidecar-lint` flags any plugin missing a tier so the classification stays complete (`@D s7`).

## Commands

All slash commands at a glance, grouped by purpose. Each is backed by a plugin in the table below.

```
# ── Discovery ───────────────────────────────────────────────
/kick:kick <seed>                 hexa kick — gap-breakthrough / discovery engine
/gap:gap [scope|full]             42-lens multi-axis gap sweep (8 families)
/brainstorm:brainstorm <seed>     width-first idea exhaustion (rounds until depletion)

# ── Fan-out / loop ──────────────────────────────────────────
/all-bg-go:all-bg-go              reactive single fan-out of the prior turn's branches
/cycle:cycle                      autonomous loop: self-enumerate → plan → fan-out → loop
/cycle:cycle-full <goal>          /cycle:cycle preceded by a phase-0 depletion brainstorm
/cycle:cycle-loop                 /cycle:cycle handed off to /loop — rounds fire automatically
/cycle:cycle-full-loop            /cycle:cycle-full once, then /loop /cycle:cycle for subsequent rounds
/step-by-step:step-by-step <task>  sequential runbook: plan → auto-run steps in order (alias /step-by-step:sbs)

# ── Dispatch ────────────────────────────────────────────────
/pool:pool <args>                 host roster + remote exec on sidekick hosts
/cloud:cloud <args>               hexa cloud — rented-GPU pod dispatch (runpod / vast.ai)

# ── Cross-project ───────────────────────────────────────────
/domain:domain <task>             <NAME>.md snapshot + <NAME>.log.md checkbox-task log
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
#   sign-guard     edits to commons.tape/project.tape until `sidecar sign` (s13)
#   git-guard      force-push (+ stale-base push advisory)
#   tape-lint      .tape edits (fields · length · authoring-language)
# REWRITE / ROUTE:
#   pool-route     heavy Bash → ssh to a pool host
#   pr-cycle       `gh pr create` → appends && gh pr merge + worktree clean (g47)
#   output-trim    >8000-char Bash stdout → dedup + truncate
# ADVISORY (non-blocking additionalContext):
#   sidecar-lint   git-commit: stale-history · hardpath · version drift · CHANGELOG · profiles tier
#   workdir-guard  working tree shared by ≥2 agents → use a worktree (s-shared)
#   memory-lint    MEMORY.md pileup / long lines → archive
#   inbox-log-lint INBOX.log.md pileup → archive
#   limit-guard    subagent session-limit → checkpoint directive
#   pod-monitor    GPU pod fire → SAVE_POD / detach reminders (g57)
#   s9-guard       Mac load-check cmds → exclude claude PIDs (s9)
# SESSION lifecycle:
#   easy-auto · quota-autoadd · worktree-gc · sidecar-auto-sync · subagent-route[POC]
```

## Plugins

55 plugins across `{hook · command · skill · mcp}` — one concept each (25 `core` · 13 `hexa` · 17 `personal`). The **Tier** column is the [enable profile](#profiles) a plugin belongs to.

| Name | Kind | Tier | Version | Summary |
|---|---|---|---|---|
| [`all-bg-go`](skills/all-bg-go/) | command + skill | `core` | 0.4.1 | Parallel fan-out trigger |
| [`brainstorm`](skills/brainstorm/) | command + skill | `core` | 0.1.1 | Iterative brainstorming |
| [`bypass`](skills/bypass/) | skill | `core` | 0.2.1 | Anti-punt |
| [`check`](skills/check/) | command + skill | `core` | 0.1.0 | Task dashboard skill |
| [`cycle`](skills/cycle/) | command + skill | `core` | 0.5.2 | Autonomous work-loop driver |
| [`domain`](skills/domain/) | command + skill | `core` | 0.8.4 | Maintain UPPERCASE <NAME>.md (snapshot = final-goal milestone checkboxes) + sister <NAME>.log.md (append-only step log… |
| [`end`](skills/end/) | command + skill | `core` | 0.2.0 | Session closure safety check |
| [`gap`](commands/gap/) | command | `core` | 0.2.0 | multi-axis gap exploration |
| [`gh-stack`](skills/gh-stack/) | skill | `core` | 0.1.1 | Stacked-PR workflow skill |
| [`git-guard`](hooks/git-guard/) | hook | `core` | 0.5.0 | PreToolUse(Bash) git-push safety guard, in hexa-lang (`_git_guard.hexa`, via `hexa run`) |
| [`limit-guard`](hooks/limit-guard/) | hook | `core` | 0.1.3 | PostToolUse(Task) hook, implemented in hexa-lang (`_limit_guard.hexa`, invoked via `hexa run`) |
| [`memory-lint`](hooks/memory-lint/) | hook | `core` | 0.1.0 | PostToolUse(Write\|Edit) advisory for the auto-memory index file (`memory/MEMORY.md`), implemented in hexa-lang (`_memo… |
| [`output-trim`](hooks/output-trim/) | hook | `core` | 0.1.3 | PreToolUse(Bash) stdout trimmer |
| [`pool`](skills/pool/) | command + skill | `core` | 0.2.2 | wraps the `pool` CLI (host roster + remote exec |
| [`pool-mcp`](mcps/pool-mcp/) | mcp | `core` | 0.1.1 | stdio MCP server exposing pool hosts as Claude Code MCP tools |
| [`prefs`](hooks/prefs/) | hook + command | `core` | 0.3.3 | User language preferences |
| [`question`](skills/question/) | command + skill | `core` | 0.2.0 | Quick side-question alias for Claude Code's built-in `/btw` |
| [`quota`](skills/quota/) | command + skill | `core` | 0.10.0 | Claude account 5h/7d usage limits + multi-account registry + live credential swap + per-account nicknames |
| [`quota-autoadd`](hooks/quota-autoadd/) | hook | `core` | 0.1.1 | SessionStart hook |
| [`research`](skills/research/) | command + skill | `core` | 0.2.4 | Research-fetch tools |
| [`secret`](skills/secret/) | command + skill | `core` | 0.4.1 | wraps the `secret` CLI (macOS Keychain-backed credentials, dancinlab/secret 0.4.0, dual-channel sync) |
| [`sidecar`](commands/sidecar/) | command | `core` | 0.2.0 | thin wrapper over the `sidecar` marketplace CLI (host-local, on PATH via `hx install sidecar`) |
| [`step-by-step`](commands/step-by-step/) | command | `core` | 0.1.0 | plan-first sequential runbook |
| [`workdir-guard`](hooks/workdir-guard/) | hook | `core` | 0.1.0 | SessionStart advisory (hexa-lang `_workdir_guard.hexa`, via `hexa run`) that fires once per session, and only when the… |
| [`worktree-gc`](hooks/worktree-gc/) | hook | `core` | 0.1.0 | SessionStart hook that prunes merged-but-undeleted LINKED git worktrees in the cwd repo, implemented in hexa-lang (`_w… |
| [`atlas`](skills/atlas/) | command + skill | `hexa` | 0.1.1 | wraps `hexa atlas` (atlas SSOT surface) |
| [`cloud`](skills/cloud/) | command + skill | `hexa` | 0.3.2 | wraps `hexa cloud` (runpod / vast.ai dispatch · canonical subcommand form, structured argv |
| [`cloud-guard`](hooks/cloud-guard/) | hook | `hexa` | 0.2.2 | PreToolUse(Bash) hard block for raw rented-GPU pod dispatch (commons @D g8) |
| [`hexa-help`](skills/hexa-help/) | command + skill | `hexa` | 0.2.1 | wraps `hexa --help` (no arg, top-level catalog) or `hexa <verb> --help` (verb-specific) |
| [`hexa-lsp`](hooks/hexa-lsp/) | hook | `hexa` | 0.1.1 | Wire the hexa-lang LSP server (`hexa lsp`) for `.hexa` files |
| [`hexa-native`](hooks/hexa-native/) | hook | `hexa` | 0.3.2 | PreToolUse(Write\|Edit\|NotebookEdit\|Bash) hard block for `.py` / `.sh` writes inside any project rooted at a directory… |
| [`kick`](skills/kick/) | command + skill | `hexa` | 0.2.1 | runs `hexa kick --seed "<seed>"` (hexa-lang gap-breakthrough / discovery engine, aliased to `hexa drill`) |
| [`paper`](skills/paper/) | command + skill | `hexa` | 0.5.3 | arxiv-style LaTeX paper scaffolder |
| [`pod-monitor`](hooks/pod-monitor/) | hook | `hexa` | 0.1.2 | PreToolUse(Bash) advisory hook for GPU pod fires (`hexa cloud nohup` / `hexa cloud run`) |
| [`tape-lint`](hooks/tape-lint/) | hook | `hexa` | 0.5.1 | PreToolUse(Edit\|Write) deny for `.tape` edits, implemented in hexa-lang (`_tape_lint.hexa`, invoked via `hexa run` |
| [`tape-lsp`](hooks/tape-lsp/) | hook | `hexa` | 0.1.1 | Wire `tape-lsp` (canonical .tape v1.2 LSP |
| [`verify`](skills/verify/) | command + skill | `hexa` | 0.2.1 | runs `hexa verify "$@"` (cross-project tier rubric, TECS-L-aligned) |
| [`verify-guard`](hooks/verify-guard/) | hook | `hexa` | 0.1.2 | PreToolUse(Bash) hard block for raw verification-tool usage cited as primary evidence, implemented in hexa-lang (`_ver… |
| [`ai-api-guard`](hooks/ai-api-guard/) | hook | `personal` | 0.1.3 | PreToolUse(Bash) hard block for raw AI-API calls when a sidecar CLI wraps the same operation, implemented in hexa-lang… |
| [`commons`](hooks/commons/) | hook | `personal` | 0.10.4 | UserPromptSubmit + SessionStart + PreCompact + PostCompact hook |
| [`easy`](skills/easy/) | command + skill | `personal` | 0.1.1 | Easy (friendly) response style |
| [`easy-auto`](hooks/easy-auto/) | hook | `personal` | 0.1.2 | SessionStart + UserPromptSubmit + PreCompact + PostCompact hook |
| [`imagine`](skills/imagine/) | command + skill | `personal` | 0.2.3 | generic AI image generator |
| [`inbox-log-lint`](hooks/inbox-log-lint/) | hook | `personal` | 0.1.0 | PostToolUse(Write\|Edit) advisory for the INBOX domain log (`INBOX.log.md`) |
| [`inject`](skills/inject/) | command + skill | `personal` | 0.2.0 | Immediately inject the latest sidecar commons.tape + project.tape into the CURRENT session and sync the local install… |
| [`plist-guard`](hooks/plist-guard/) | hook | `personal` | 0.1.2 | PreToolUse(Write\|Edit\|NotebookEdit) hard block for `.plist` writes, implemented in hexa-lang (`_plist_guard.hexa`, inv… |
| [`pool-route`](hooks/pool-route/) | hook | `personal` | 0.6.3 | PreToolUse(Bash) pool auto-router + SessionStart routing-log snapshot, implemented in hexa-lang (`_pool_route.hexa`, i… |
| [`pr-cycle`](hooks/pr-cycle/) | hook + command | `personal` | 0.3.6 | PreToolUse(Bash) PR full-cycle router for `gh pr create`, implemented in hexa-lang (`_pr_cycle.hexa`, invoked via `hex… |
| [`project-tape`](hooks/project-tape/) | hook | `personal` | 0.2.1 | PreCompact + PostCompact hook |
| [`s9-guard`](hooks/s9-guard/) | hook | `personal` | 0.1.0 | PreToolUse(Bash) advisory hook for load-assessment commands (project.tape @D s9) |
| [`ship`](skills/ship/) | command + skill | `personal` | 0.3.2 | Atomic ship tail for sidecar plugin changes |
| [`sidecar-auto-sync`](hooks/sidecar-auto-sync/) | hook | `personal` | 0.2.0 | SessionStart hook that runs `sidecar sync` once per Claude Code session, implemented in hexa-lang (`_sidecar_auto_sync… |
| [`sidecar-lint`](hooks/sidecar-lint/) | hook | `personal` | 0.5.0 | PreToolUse(Bash) auto-lint that fires on `git commit` in any Claude Code marketplace plugin pack (any repo with .claud… |
| [`sign-guard`](hooks/sign-guard/) | hook | `personal` | 0.1.4 | PreToolUse(Write\|Edit\|NotebookEdit\|Bash) sign-gate for governance-SSOT files, implemented in hexa-lang (`_sign_guard.h… |
| [`subagent-route`](hooks/subagent-route/) | hook | `personal` | 0.1.0 | [POC] PreToolUse(Task\|Agent) observation hook + SessionStart observation-log snapshot, implemented in hexa-lang (`_sub… |

## Governance

Sidecar's own identity + governance lives in [`project.tape`](project.tape) (also reachable via `CLAUDE.md`). Cross-project `do` / `dont` rules ride inside the `commons` hook plugin and auto-inject at SessionStart + PreCompact + PostCompact. Local sidecar decisions (concept separation, ship cycle, evidence-before-ship, cross-project carrier) are recorded in [`DESIGN.log.md`](DESIGN.log.md) as numbered decisions; [`DESIGN.md`](DESIGN.md) is the live-rules pointer.

## Reference

- [`project.tape`](project.tape) — sidecar's identity + governance (linked as `CLAUDE.md`).
- [`DESIGN.md`](DESIGN.md) / [`DESIGN.log.md`](DESIGN.log.md) — live design-rules pointer + decision audit trail.
- [`CHANGELOG.md`](CHANGELOG.md) — chronological log of notable changes (one entry per ship batch).
- [`GH-STACK.md`](GH-STACK.md) / [`GH-STACK.log.md`](GH-STACK.log.md) — stacked PR workflow reference + enablement history.

## License

MIT.
