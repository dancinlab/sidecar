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
2026-05-24T17:40Z · feat(domain 0.8.4): NAME 분리자 - 만 허용 · _ 차단 (메타도메인 + 유지)

도메인 NAME 검증에서 언더스코어 거부. TTR-LM / TTR_LM 양쪽을 다 받아
같은 도메인이 두 갈래로 쪼개지는 걸 막고, 하이픈을 유일한 단어 구분자로
고정. +는 메타도메인(RTSC+HTS) 합성용으로 유지. 프로젝트 basename
fallback도 -를 _로 바꾸던 동작을 - 유지로 변경.
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
├── bin/sidecar               # CLI — `sidecar init` scaffolds project.tape + CLAUDE.md + LATTICE_POLICY.md
├── hooks/                    # PreToolUse · SessionStart · PreCompact · PostCompact · LSP plugins
├── commands/                 # /slash-command invoked plugins
├── skills/                   # Skill tool invocable plugins
├── project.tape              # sidecar's identity + governance (also linked as CLAUDE.md)
├── LATTICE_POLICY.md         # real-limits-first policy (→ hooks/commons/, dropped by `sidecar init`)
├── DESIGN.md                 # current design rules pointer (live spec)
├── DESIGN.log.md             # decision audit trail (one decision per gate)
├── CHANGELOG.md              # chronological ship log
└── .claude-plugin/marketplace.json
```

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

# ── Verify / help ───────────────────────────────────────────
/verify:verify <args>             hexa verify — tier rubric (🔵🟢🟡🟠🔴⚪)
/hexa-help:hexa-help [verb]       hexa --help (top-level catalog or per-verb signature)

# ── Research / generate ─────────────────────────────────────
/research:arxiv <q>               arXiv API search / id lookup
/research:yt <url>                YouTube caption transcript extract
/imagine:imagine <pf> <out>       AI image gen (fal backend · gpt-image-2 pinned)
/paper:paper <args>               arxiv LaTeX scaffolder (new·sample·fig·compile·lint·list)

# ── Session / meta ──────────────────────────────────────────
/inject:inject  (/inject:ij)      sidecar sync + inject commons.tape/project.tape THIS turn
/ship:ship -m "<msg>" …           atomic commit + push + sidecar sync
/prefs:prefs <axis> <lang>        language prefs (code · docs · response)
/secret:secret <args>             macOS Keychain-backed credential CLI
/easy:easy                        friendly 7-element response style
/check:check                      task dashboard (domain log · open PRs · git · merges)
/question:question (/question:q) <txt>  quick side-question, no task pivot (alias for /btw)

# ── Guard hooks (no command — fire automatically) ───────────
# hexa-native    .py/.sh write deny in project.tape repos
# plist-guard    .plist write deny (g37)
# cloud-guard    runpodctl/vastai exec/ssh deny → hexa cloud (g8)
# verify-guard   wolframscript / inline-sympy deny → hexa verify (g5)
# ai-api-guard   curl AI-hostname / inline AI-SDK deny → CLI wrapper (g50)
# pr-cycle       `gh pr create` → appends && gh pr merge + worktree clean (g47)
# pool-route     heavy Bash → ssh-route to a pool host
# git-guard      force-push deny
# sidecar-lint   git-commit lint (stale-history · hardpath · drift · CHANGELOG)
# tape-lint      .tape edit lint (fields · length · lang · @I siblings)
# inbox-log-lint INBOX.log.md pileup advisory (entries/resolved/size → archive)
# limit-guard    session-limit checkpoint directive
```

## Plugins

| Name | Kind | Version | Summary |
|---|---|---|---|
| [`commons`](hooks/commons/) | hook | 0.9.20 | UserPromptSubmit + SessionStart + PreCompact + PostCompact hook — injects a cross-project `do` / `dont` layer (from `commons.tape`, granular `@D g1..g31`) above the per-project context. UserPromptSubmit re-injects every turn so the layer never fades; PostCompact re-injects after the `※ recap` so it survives auto-compaction. Carries [`LATTICE_POLICY.md`](hooks/commons/LATTICE_POLICY.md) (real-limits-first SSOT). hexa-lang (`_commons.hexa`). |
| [`prefs`](hooks/prefs/) | hook + command | 0.3.0 | User language preferences — 3 axes (`code` authoring · `docs` authoring · `response` to user). UserPromptSubmit (every turn) + SessionStart + PreCompact + PostCompact hook auto-injects. `/prefs show` · `/prefs code <lang>` · `/prefs docs <lang>` · `/prefs response <lang>`. Defaults: code=english, docs=english, response=korean. SSOT for language preferences. hexa-lang (`_prefs.hexa`). |
| [`project-tape`](hooks/project-tape/) | hook | 0.2.0 | PreCompact + PostCompact hook — re-injects `<project-root>/project.tape` as `additionalContext` so the project's identity + governance survive auto-compaction. No-op when `project.tape` is absent. hexa-lang (`_project_tape.hexa`). |
| [`git-guard`](hooks/git-guard/) | hook | 0.4.0 | PreToolUse(Bash) deny — blocks force-type git push only: `git push --force` / `-f` · `--force-with-lease` · refspec-level force `+<ref>`. Hook-bypass (`--no-verify`) NOT blocked (left to user discipline). hexa-lang (`_git_guard.hexa`). NO opt-out by design. |
| [`sidecar-lint`](hooks/sidecar-lint/) | hook | 0.3.0 | PreToolUse(Bash) auto-lint that fires on `git commit` in any Claude Code marketplace plugin pack. Non-blocking findings: stale-history patterns in staged diff (commons `@D g15`) · hardcoded `/Users/` / `/home/` paths in staged diff (commons `@D g13` · sidecar `@D s3`) · `marketplace.json` ↔ each `plugin.json` version drift (commons `@D g22`) · `hooks/*/bin/*.sh` missing user-exec bit. hexa-lang (`_sidecar_lint.hexa`). NO opt-out by design. |
| [`tape-lint`](hooks/tape-lint/) | hook | 0.4.0 | PreToolUse(Edit\|Write) deny for `.tape` edits, implemented in **hexa-lang** (`_tape_lint.hexa` invoked via `hexa run` — no Python, no shell shim; first sidecar hook to land hexa-native). Three diff-aware checks: **(1) fields** — `@D` blocks accept only `do` / `dont`; new `why` · `tool` · `note` · `ref` · `ex` · ... refused (any `*.tape`). **(2) length cap** — `do` / `dont` value > 100 chars refused (`commons.tape` + `project.tape`). **(3) authoring-language** — when `sidecar prefs` `code` axis is `english`, newly-introduced non-Latin lines (Hangul · CJK · 仮名) refused (`commons.tape` + `project.tape`). Pre-existing violations grandfathered. NO opt-out by design. |
| [`hexa-native`](hooks/hexa-native/) | hook | 0.2.0 | **PreToolUse(Write\|Edit\|NotebookEdit) hard block** — `.py` / `.sh` writes are **denied** inside any project rooted at a directory containing a `project.tape` marker (sidecar's canonical project identity file). Reason message redirects the operator to `.hexa` (since `.py` / `.sh` are already supported as ai-native English elsewhere). Targets only `.py` / `.sh`; other extensions pass through. Projects without `project.tape` unaffected. hexa-lang (`_hexa_native.hexa`). **NO opt-out** by design — no env var, no config file, no exception list, no self-exclusion; uninstall the plugin if you need a way out. |
| [`pool-route`](hooks/pool-route/) | hook | 0.4.1 | PreToolUse(Bash) auto-router — when the `pool` CLI roster (`~/.pool/pool.json`) has a host and a command matches the heavy classifier (`make` · `cargo` · `pytest` · `go build` · `docker build` · `nvidia-smi` · `train` · …) or a root command, rewrite it via `updatedInput` to run on a pool host over ssh (`ssh <host> 'cd <wd> && <cmd>'`) — transparent dispatch, not a suggestion. OS-capability filter + round-robin; autosync rsync. Passes through when no roster / no match. hexa-lang (`_pool_route.hexa`). NO opt-out by design. |
| [`limit-guard`](hooks/limit-guard/) | hook | 0.1.1 | PostToolUse(Task) — detects a session/usage-limit signal in a subagent result and injects a checkpoint directive: report progress (committed SHAs vs uncommitted), commit + push uncommitted work, write a `.claude/RESUME.md` resume manifest, stop parallel fan-out. Non-blocking. hexa-lang (`_limit_guard.hexa`). NO opt-out by design. |
| [`hexa-lsp`](hooks/hexa-lsp/) | hook | 0.1.1 | Wire the hexa-lang LSP server (`hexa lsp`) for `.hexa` files via plugin-root `.lsp.json` (canonical Claude Code LSP filename, dot-prefixed). |
| [`tape-lsp`](hooks/tape-lsp/) | hook | 0.1.1 | Wire the `tape-lsp` server (canonical `.tape` v1.2 LSP — diagnostics + hover) for `.tape` files via plugin-root `.lsp.json` (dot-prefixed). Requires `tape-lsp` on PATH (`hx install tape`). |
| [`all-bg-go`](skills/all-bg-go/) | skill + command |  0.4.1  | Parallel fan-out trigger — "all bg go" → plan table + one background Agent per branch in the same message. **Reactive single fan-out** of what the prior turn offered. For a self-generating repeatable loop, use [`cycle`](skills/cycle/). Also `/all-bg-go`. |
| [`cycle`](skills/cycle/) | skill + command |  0.3.0  | **Autonomous work-loop driver** — four commands. `/cycle` runs next-list (self-enumerate next viable work from current context) → parallel-plan table → fan-out (one bg Agent per item, same message) → loop. `/cycle-full <seed>` precedes the next-list with a phase-0 depletion brainstorm (one-time per goal; subsequent rounds use plain `/cycle`). `/cycle-loop` hands `/cycle` off to the [`loop`](skills/loop/) skill (dynamic `ScheduleWakeup` pacing) so rounds fire automatically until ideas deplete or user halts. `/cycle-full-loop` runs `/cycle-full` once, then hands off to `/loop /cycle` for subsequent rounds. Distinct from `all-bg-go` (reactive fan-out of prior-turn branches; `/cycle` self-generates each round). NL: *"사이클"* · *"계속 진행"* · *"다음 라운드"* · *"keep cycling"*. |
| [`kick`](skills/kick/) | skill + command |  0.2.1  | `/kick <natural-language seed>` — wraps `hexa kick --seed "<seed>"` (hexa-lang gap-breakthrough / discovery engine). All args join into the seed. NL trigger (*"돌파해줘"*, *"kick this"*, *"discover for"*). Pairs with `commons g6`. |
| [`verify`](skills/verify/) | skill + command |  0.2.1  | `/verify <args>` — wraps `hexa verify "$@"` (TECS-L tier rubric — 🔵🟢🟡🟠🔴⚪). Forms: atlas-id · `--expr <fn> <n> <v>` · `--fence "<claim>"` · `rubric` · `list`. NL trigger (*"확인해"*, *"검증해"*, *"맞아?"*). Pairs with `commons g5`. |
| [`pool`](skills/pool/) | skill + command |  0.2.1  | `/pool <args>` — wraps the `pool` CLI (host roster + remote exec). Verbs: `list` · `add <host>` · `on <host> <cmd>` · `status` · `install tailscale` · `rm <host>`. NL trigger (*"pool 호스트"*, *"다른 호스트에서 돌려"*). Pairs with `commons g9` + `pool-route` hook. |
| [`cloud`](skills/cloud/) | skill + command |  0.3.1  | `/cloud <args>` — wraps `hexa cloud` (runpod dispatch · canonical subcommand form, structured argv — never raw ssh/scp). Subverbs: `run` · `nohup` · `poll` · `copy-to` · `copy-from`. Upstream gap (subcommand not yet registered — currently a separate `hexa-cloud` binary) tracked at `hexa-lang/INBOX.log.md`. NL trigger (*"GPU pod 에 돌려"*, *"runpod dispatch"*). Pairs with `commons g8` + `g55` (wall-time parallel fan-out). |
| [`hexa-help`](skills/hexa-help/) | skill + command |  0.2.1  | `/hexa-help [verb]` — wraps `hexa --help` (no arg, top-level catalog) or `hexa <verb> --help` (verb-specific). Per `commons g7`. NL trigger (*"hexa 뭐있어"*, *"hexa 사용법"*). |
| [`secret`](skills/secret/) | skill + command |  0.4.1  | `/secret <args>` — wraps the [`secret`](https://github.com/dancinlab/secret) CLI (macOS Keychain-backed credentials, 0.4.0, dual-channel sync). Verbs: `get` · `set` · `rotate` · `check` · `delete` · `list` · `service` · **`init [icloud\|github <url>]`** · **`backup [enable <url>\|disable\|status]`** · **`sync`** · `migrate`. Two independent sync channels (iCloud Drive primary + optional private GitHub mirror) push the same encrypted blob — master password is the only decryption secret. Auto-push ON by default once `backup enable` runs (opt out via `SECRET_BACKUP_AUTO=0`). High-value protection on `set` (BIP39 wordlist-validated · xprv/WIF/64-hex → refuse without `--allow-mnemonic` + stdin/tty). `rotate` emits sentinel only. ⚠ `/secret get` exposes value in conversation context — prefer inline `$(secret get <k>)`. NL trigger (*"키체인"*, *"토큰 저장"*, *"credential 가져와"*, *"백업 push"*). |
| [`gap`](commands/gap/) | command | 0.2.0 | `/gap` — multi-axis gap exploration. **42** breakthrough-strategy lenses · 8 families (F4 + F6 each have 6; `occams-razor` lives in both — hypothesis side and design side). Bare `/gap` = inline-triage all 42 + deep-dive only hot families (subagents). `/gap full` = exhaustive 8-subagent fan-out. `/gap <scope>` targets the sweep. `/gap list` prints the catalogue. Surfaces + prioritises gaps; never fixes. |
| [`step-by-step`](commands/step-by-step:step-by-step/) | command | 0.1.0 | `/step-by-step:step-by-step` (alias `/step-by-step:sbs`) — plan-first sequential runbook. Decomposes the task into a numbered, dependency-ordered plan, then auto-runs every step in order (no gates between steps): `▶ i/N` marker + `✅`/`⚠`/`❌` per step. Halts only on a step failure (reports step + verbatim error + un-run tail) or before an irreversible / outward-facing step (confirm-then-resume, same bar as `bypass`). The deliberate **sequential** counterpart to [`cycle`](skills/cycle/)'s parallel fan-out. |
| [`inject`](skills/inject/) | skill + command |  0.1.1  | `/inject` — runs `sidecar sync` (marketplace pull + cache copy + `installed_plugins.json` patch) AND prints the latest `commons.tape` + (cwd's) `project.tape` so the model picks them up THIS turn. For mid-session sidecar refresh without restarting Claude Code. |
| [`ship`](skills/ship/) | skill + command |  0.2.1  | `/ship -m "<msg>" <path>…` — atomic ship tail: stage explicit paths (never `-A`/`-u`) → credential-scan staged diff (`rpa_`·`sk-`·`hf_`·`AKIA`) → commit → push `origin/<branch>` → `sidecar sync`. Mechanical tail of `@D ship` / `commons g27`; the agent owns version bump + surface lockstep + message FIRST (per `g22`). NL trigger (*"ship"*, *"배포"*, *"출시"*). |
| [`domain`](skills/domain/) | skill + command |  0.4.1  | UPPERCASE `<NAME>.md` (current snapshot) + sister `<NAME>.log.md` (append-only **checkbox-task** log) at project root. **Auto-scaffolds** both; defaults NAME to uppercase basename of git root. Verbs: `/domain` (show) · `/domain <task>` (append `- [x]`) · `/domain todo <task>` (`- [ ]`) · `/domain done <match>` (flip `[ ]`→`[x]`) · `/domain new <header>`. Records progress as work proceeds. |
| [`bypass`](skills/bypass/) | skill |  0.2.1  | **Default-on anti-punt** — universal self-check before any move that hands control back to the user (interactive input · unauthorized destructive · external visible · explicit user-review request); if all NO, just execute. Extensible catalog of patterns: `next user action:` blocks · `Should I proceed?` · `Want me to check?` · option-trees w/ obvious default · over-clarification · defer-by-waiting · excessive recap. Cross-project always-on guard in `commons.tape` ≥ 0.7.3. |
| [`brainstorm`](skills/brainstorm/) | skill + command |  0.1.1  | Iterative brainstorming — given a seed, generates ideas in rounds and keeps going until depletion (no new distinct ideas vs prior rounds; hard cap 8 rounds). For breadth over selection. Natural language or `/brainstorm <seed>`. |
| [`easy`](skills/easy/) | skill + command |  0.1.1  | Friendly response style — 7-element pattern (icon · name · alias · plain-line · analogy · ASCII diagram · compare). Triggered by natural language ("친근하게" · "easy mode" · multilingual equivalents) or `/easy`. 5 language samples (en · ko · ja · zh · ru). |
| [`research`](skills/research/) | skill + commands |  0.2.2  | Research-fetch tools — `/research:arxiv <query\|id>` searches the official arXiv API (title · authors · abstract · pdf), `/research:yt <url-or-id>` extracts YouTube caption transcript via the InnerTube ANDROID client. Implemented in hexa-lang (`hexa run`); HTTP via curl, no API key. |
| [`gh-stack`](skills/gh-stack/) | skill |  0.1.1  | Stacked-PR workflow — proposes `gh stack` (enabled repos) or the manual `gh pr create --base previous-layer` fallback. Encodes sidecar's <200-lines-per-layer · 1-concern governance. Status in [`gh-stack.md`](gh-stack.md). |
| [`paper`](skills/paper/) | skill + command |  0.4.0  | `/paper <args>` — arxiv-style LaTeX paper scaffolder. Verbs: `new <slug>` (scaffold the minimal `template/` skeleton at `./<slug>/`), `sample <slug>` (copy the bundled demiurge `sample-nb-bcs-absorbed/` verbatim — ~14-page Nb BCS universal-gap-ratio attestation reference exhibit), `fig <size> <prompt> <out>` (delegates to sister [`imagine`](skills/imagine/) → fal.ai `openai/gpt-image-2`), `compile [dir]` (pdflatex × 3 + bibtex), `list`, `help`. |
| [`imagine`](skills/imagine/) | skill + command |  0.2.0  | `/imagine <prompt-file> <out.png> [-s size] [-b backend] [-m model]` — generic AI image generator. Two backends out of the box: `fal` (queue+poll fal.ai, default · `secret get fal.api_key` · model = `openai/gpt-image-2` firm-pinned) and `openai` (sync `/v1/images/generations` · `secret get openai.api_key` · `gpt-image-1`). Canonical fal-style sizes (`square_hd`/`landscape_16_9`/`portrait_16_9`/`square`) translate per-backend. Prompt always read from a file (provenance); payload JSON via mktemp (no argv leak). Plug in a new backend by dropping `_backends/<name>.hexa`. |

## Governance

Sidecar's own identity + governance lives in [`project.tape`](project.tape) (also reachable via `CLAUDE.md`). Cross-project `do` / `dont` rules ride inside the `commons` hook plugin and auto-inject at SessionStart + PreCompact + PostCompact. Local sidecar decisions (concept separation, ship cycle, evidence-before-ship, cross-project carrier) are recorded in [`DESIGN.log.md`](DESIGN.log.md) as numbered decisions; [`DESIGN.md`](DESIGN.md) is the live-rules pointer.

## Reference

- [`project.tape`](project.tape) — sidecar's identity + governance (linked as `CLAUDE.md`).
- [`DESIGN.md`](DESIGN.md) / [`DESIGN.log.md`](DESIGN.log.md) — live design-rules pointer + decision audit trail.
- [`CHANGELOG.md`](CHANGELOG.md) — chronological log of notable changes (one entry per ship batch).
- [`GH-STACK.md`](GH-STACK.md) / [`GH-STACK.log.md`](GH-STACK.log.md) — stacked PR workflow reference + enablement history.

## License

MIT.
