<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>Battle-tested guardrails for Claude Code — ported from a hexa-native agent.</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Status" src="https://img.shields.io/badge/status-v0.1.0-orange">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
  <img alt="Sibling" src="https://img.shields.io/badge/sibling-wilson-blueviolet">
</p>

<p align="center">
  <strong>English</strong> · <a href="README.zh.md">中文</a> · <a href="README.ru.md">Русский</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a>
</p>

---

> **A sidecar that bolts guardrails onto Claude Code without touching the host.**
> Not hand-rolled hook snippets — the guard set proven in production by the
> hexa-native agent [`wilson`](https://github.com/dancinlab/wilson), ported to
> the Claude Code plugin marketplace.

`sidecar` is a **plugin marketplace repo** that side-mounts governance onto the
host harness (Claude Code) without modifying it. It maps the value of wilson's
`governance` / `guard-*` / `agents-md` plugins onto Claude Code's hook
primitives 1:1.

## Why sidecar?

- **Ported, proven guards** — not an ad-hoc dotfiles hook pile, but denial
  rules battle-tested in the wilson bundle (dangerous-path, SSOT append-only,
  domain-lint).
- **Non-invasive to the host** — no edits to Claude Code config or core.
  Install / enable / disable from the marketplace only.
- **A wilson on-ramp** — taste wilson's governance inside Claude Code, then
  graduate to full `wilson` (hexa-native, plugin-everything).

## Plugins

| Plugin | CC hook | Behavior |
|---|---|---|
| `wilson-guards` | `PreToolUse` (`Write`·`Edit`·`MultiEdit`) | Three dancinlab-workflow guards in one bundle — `ssot-lock` (deny editing a file matched by an `ssot-lock:` bullet in the nearest `AGENTS.md ## Governance`), `tape-append-only` (a `.log.tape` event history is append-only — deny a rewriting Edit / overwriting Write; per the tape v1.2 architecture-vs-history split a plain `.tape` is editable architecture, so the guard is inert for it), `domain-lint` (a root `UPPERCASE.md` topic roadmap must be `Head + --- + ## Log`) — standalone port, **working**; each guard inert unless its convention is present (opt out: `SIDECAR_NO_GUARDS=1`) |
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | Inject `AGENTS.md` walk-up SSOT as context (wilson `agents-md` equivalent) — **working** |
| `wilson-readme-format` | `PreToolUse` (`Write`·`Edit`) | Deny a repo-root `README.md` violating readme-format anti-patterns (emoji-in-prose / multi-glyph H1 / non-English At-a-glance / `####`) — standalone port of wilson `guard-readme-format`, **working** |
| `wilson-hexa-verify` | `PreToolUse` + `PostToolUse` (`Bash`) | PreToolUse: deny Bash invocations of non-hexa verifiers (sympy / PyPhi / wolframscript / mathematica) → redirect to the hexa CLI. PostToolUse: when `hexa verify` reports a new SUPPORTED equation (🔵/🟢), **opens a PR** to `dancinlab/hexa-lang` baking the equation into the binary built-in atlas (fills `hexa atlas promote`'s stubbed `pr` step; PR left for human review, never auto-merged) — falls back to prompting the `worktree-pr` workflow if the autonomous PR isn't possible. Standalone port + extension of wilson `guard-hexa-verify`, **working**. ⚠ INERT unless `hexa` is on PATH |
| `wilson-dangerous-path` | `PreToolUse` (`Write`·`Edit`) | Deny Write/Edit/MultiEdit targeting a protected system path (`/etc` `/usr` `/bin` `/sbin` `/System` `/.git` `/.gnupg`) or a credential path (`~/.ssh`, `~/.aws`, gh config, keychain, credentials) — standalone port of wilson `guard-dangerous-path`, **working** |
| `wilson-git-guard` | `PreToolUse` (`Bash`) | Deny force-push — a `git push` carrying `--force` / `-f` / a `+refspec` (and `--force-with-lease` unless `SIDECAR_ALLOW_FORCE_WITH_LEASE=1`) is blocked — standalone port of wilson `git-guard`, **working** |
| `wilson-secret-guard` | `PreToolUse` (`Write`/`Edit`/`MultiEdit`) + `UserPromptSubmit` | Deny writing a real `.env` file or content carrying a high-confidence credential (AWS / GitHub / GitLab / Anthropic / OpenAI / Slack / Google / Stripe tokens, PEM private keys); block a prompt that pastes one — high-confidence patterns only, near-zero false positives, **working** (opt out: `SIDECAR_NO_SECRET_GUARD=1`) |
| `wilson-bash-guard` | `PreToolUse` (`Bash`) | Deny catastrophic shell commands — pipe-to-shell (`curl … \| sh`), `rm -rf` of a root/home path, fork bombs, disk destroyers (`dd of=/dev/disk`, `mkfs`, `>/dev/sd*`), recursive `chmod`/`chown` on `/` `~` `.` — high-confidence destructive patterns only, near-zero false positives, **working** (opt out: `SIDECAR_NO_BASH_GUARD=1`) |
| `wilson-prefs` | `/wilson-prefs:prefs` command + `SessionStart`·`UserPromptSubmit` | Set reply language / code language / response style — language values accept `auto` (mirror the language the user writes in); persisted to plugin data, injected as context. Standalone port of wilson `prefs` — **working** (injects nothing until you set one) |
| `wilson-output-trim` | `PreToolUse` (`Bash`) | Rewrites a Bash command (`updatedInput`) so stdout passes a TF-IDF salience + MinHash near-dup filter before the model ingests it — spirit-port of wilson `compaction-prefilter`, **working** (small output verbatim; exit code preserved via `pipefail`) |
| `wilson-pool` | `/wilson-pool:pool` command + `PreToolUse` (`Bash`) + `SessionStart`·`UserPromptSubmit` | Route heavy Bash commands to a remote **host roster** via ssh — each host is platform-tagged, so a macOS-only / Linux-only command goes to a host of that platform and the rest is round-robined — spirit-port of wilson's `pool` roster, **working**. ⚠ OFF until the roster has ≥1 host + workdir set (`workdir auto` mirrors the current project across hosts); only Bash is routed; **you** keep the remote workdir synced on every host (a CC hook can't mount the fs like wilson's 9P/sshfs) |
| `wilson-checkpoint` | `Stop`·`PreCompact`·`SessionEnd`·`SessionStart` | Never lose work to a usage limit / crash — every turn, `git stash create` snapshots WIP (a dangling commit; working tree / index / branches untouched), pinned under `refs/wilson-checkpoint/`, + a resume note; `SessionStart` re-injects an unconsumed snapshot. `/wilson-checkpoint:checkpoint` to status/restore/clear (restore is printed, never auto-applied) — **working**, git-only, debounced (opt out: `SIDECAR_NO_CHECKPOINT=1`) |
| `wilson-gpu` | `/wilson-gpu` command + `SessionStart` | Rented-GPU cost guardrail for RunPod / Vast.ai — `SessionStart` surfaces every still-billing instance (uptime + ~cost so far) so a forgotten pod never leaks money; `down` is the kill switch, `attach` wires an instance into the `wilson-pool` roster. Strategies `watch`/`budget`/`idle-reaper`/`ephemeral`; money & auto-down are double-gated by separate off-by-default switches (`provisioning`+`--yes` for `up`, `reaping` for auto-stop); `fanout` = cost-tolerance decision aid for shardable jobs. **working**, inert unless `runpodctl`/`vastai` on PATH (opt out: `SIDECAR_NO_GPU=1`) |
| `wilson-decision-gate` | `SessionStart` · `UserPromptSubmit` + `/wilson-decision-gate` | Step-by-step decision gate — multi-decision work is **one user-confirmation gate per decision, never batched** (options + recommendation + 3+ rationale → wait for the pick → next), logged as a `### Decision N` block in `design.md`. Standalone port of wilson's `step-by-step-decision-gate` (text-only, like wilson). `SessionStart` injects the principle once; `UserPromptSubmit` adds a short reminder **only on branch-point-looking prompts** (not every prompt). `/wilson-decision-gate decide\|log\|on\|off\|sample`; ships a 5-language canonical sample — **working**, default ON (opt out: `SIDECAR_NO_DECISION_GATE=1`) |
| `wilson-fire-gate` | `SessionStart`·`PostCompact` · `UserPromptSubmit` + `/wilson-fire-gate` | Instrument-first decision gate — **measure over predict**. A *fire* = running one real measurement (benchmark / profile / probe) instead of predicting its outcome. At a measure-vs-predict fork: predict first with the most faithful model (prior measurements, roofline limits, documented walls); fire only when genuinely uncertain; never re-fire a settled result (resolve analytically, $0); `cost-no-object` frees a *needed* fire, it doesn't license firing a known answer. Each fork is gated and logged as a `### Fire-decision N` block in `design.md`. `SessionStart`/`PostCompact` inject the principle; `UserPromptSubmit` reminds only on measurement-looking prompts. Companion to `wilson-decision-gate` (generic gate) — this one is measurement-specialized — **working**, default ON (opt out: `SIDECAR_NO_FIRE_GATE=1`) |
| `wilson-tape-recorder` | `SessionStart`·`UserPromptSubmit`·`PreToolUse`·`PostToolUse`·`SessionEnd` + `/wilson-tape-recorder` | Records the Claude Code session as a `.tape` v1.2 execution trace (the dancinlab `tape` format) — one file per session under `<DATA>/sessions/<id>.tape`: SessionStart `@S start` · UserPromptSubmit `@U` · PreToolUse `@T` · PostToolUse `@R` · SessionEnd `@S end`. Honest subset of the 17-type alphabet — only what CC hooks actually deliver (no `@A` assistant text, no `@K` cost — those signals aren't exposed). Pairs with `wilson-guards/tape-append-only` (the recorder **produces** `.tape`, the guard **protects** it). `/wilson-tape-recorder status\|ls\|tail\|cat\|on\|off` — **working**, default ON (opt out: `SIDECAR_NO_TAPE_RECORDER=1`) |
| `wilson-goal` | `SessionStart`·`UserPromptSubmit` + `/wilson-goal` | Session goal persistence + re-injection — keep the high-level objective alive across a long session and context compaction. Goal lives on disk at `<DATA>/goal.json` (outside the transcript that gets compacted), restored at every `SessionStart` and re-asserted as a one-line reminder on each `UserPromptSubmit` (≤ 180 B). A project-local `GOAL.md` is used as the default when no user goal is set. `/wilson-goal set\|status\|show\|clear\|path` — **working**, default ON. **Honest gap vs wilson `loop`**: only goal-persistence half is portable; autonomous continuation (wilson's `loop_tick`+QUEUE) needs no CC hook (opt out: `SIDECAR_NO_GOAL=1`) |
| `wilson-resume` | `Stop`·`SessionStart` + `/wilson-resume` | Persistence + re-arm companion for Claude Code's **native `/goal`** command (CC v2.1.139+). Native `/goal` is session-scoped with **no disk persistence** — a hard interruption (usage limit / crash / a closed terminal never cleanly `--resume`d) loses the completion condition, and the next session has no idea a goal was active. `wilson-resume` is the small cog that closes that gap: every `Stop` scans the transcript for the most recent `/goal` command and persists the condition to a per-project file; a bare `/goal` (the native clear) drops it. `SessionStart` (startup / clear — `resume` carries the native goal over) injects a `## Goal — interrupted` block with the exact `/goal <condition>` line to re-arm. Inert unless a `/goal` was used — **working**, default ON (opt out: `SIDECAR_NO_RESUME=1`) |
| `wilson-inbox` | `SessionStart` + `/wilson-inbox:inbox` | Cross-project handoff inbox — when a gap or request affects another SSOT repo, file it there as a structured `inbox/<kind>/<slug>.md` entry (kind: `notes`/`patches`/`poc`/`rfc_drafts`) instead of silently working around it downstream. `/wilson-inbox:inbox` scaffolds and manages entries — `add`/`list`/`show`/`path`/`verify`/`apply`/`archive`/`rm`; target repo is `--to <name>` (`~/core/<name>`) or the nearest `.git` from the cwd. Light-mode is folder + entries; heavy-mode adds `inbox/PATCHES.yaml` with a status lifecycle `apply`/`archive` transition. `SessionStart` surfaces the current repo's inbox entries so a handoff is never forgotten — **working**, inert unless the repo has an `inbox/` (opt out: `SIDECAR_NO_INBOX=1`) |
| `wilson-lsp` | `.lsp.json` LSP servers (not a hook) | Wires `.hexa` → `hexa lsp` and `.tape`·`.n6`·`.hxc`·`.kosmos` → the canonical per-repo servers (`tape-lsp`/`n6-lsp`/`hxc-lsp`/`kosmos-lsp`, shipped in `github.com/dancinlab/{tape,n6,hxc,kosmos}`). Graceful — a server not on PATH just shows in `/plugin` Errors. LSP lifecycle is CC-managed (toggle via `/plugin`, not `/sidecar`) |
| `sidecar` | `/sidecar` command (control) | Runtime on/off for the other plugins — `/sidecar status\|on\|off <name>` (names: ssot readme-format hexa-verify dangerous-path git-guard secret-guard bash-guard prefs output-trim pool checkpoint gpu decision-gate tape-recorder goal resume inbox guards fire-gate, or `all`). Shared `~/.claude/sidecar/disabled.json` each plugin's hook checks; persists across sessions; complements the native `/plugin` manager |
| `worktree-pr` | `/worktree-pr:wt` command (workflow) | Safe **worktree → PR → merge → cleanup** workflow — `start <name>` (isolated worktree+branch off origin's default), `ship <name> "<title>"` (push + open PR), `finish <name>` (merge PR + remove worktree + delete branch + refresh base), `status`, `abort`. Never touches the main working tree or a concurrent session's branch |
| `wilson-gap` | `/gap` command (model-facing) | Multi-axis gap exploration — `/gap` sweeps the current work through **40 breakthrough-strategy lenses** in 8 families, curated from the archived `hive` repo's `state/*_audit` catalogue (each lens = one probing one-liner). Bare `/gap` = mode C (inline-triage all 40 → deep-dive subagent only for each family that surfaced a gap; zero gaps spawns nothing); `/gap full` = mode A (fan-out one subagent per family, no triage); `/gap <text>` scopes the sweep; `/gap list` prints the catalogue. Surfaces and prioritises gaps only — never fixes. No hook, no bin script — pure model-facing command |
| `wilson-schedule` | `SessionStart`·`PostCompact`·`UserPromptSubmit` + `/wilson-schedule:schedule` | Global daily-routine task list whose `run` **fans every pending task out to a background subagent in parallel** — `add "<task>"` registers a free-text task; `run` (or typing the phrase `스케쥴 진행`, caught by `UserPromptSubmit`) dispatches **all** pending tasks at once as background agents (one `Agent` per task, `run_in_background`), `running`/`done` move state and capture a one-line result, `rm`/`clear` prune. A CC hook/bin can't call the `Agent` tool, so `run` only **emits a dispatch directive** — the bin owns state, the model owns the fan-out. State is `~/SCHEDULE.json` (one global JSON file at the home root); `SessionStart` surfaces a pending count. Not remote cron (that's the built-in `/schedule`) — a local immediate parallel executor — **working**, default ON (opt out: `SIDECAR_NO_SCHEDULE=1`) |

Roadmap candidates: `wilson-memory` (SessionStart/SessionEnd file memory),
`wilson-recap` (PreCompact/SessionEnd summarization).

## Install

```bash
# 1. register the marketplace
/plugin marketplace add dancinlab/sidecar

# 2. install the plugins you want — each is independent
/plugin install wilson-secret-guard@sidecar     # block live secrets / .env writes
/plugin install wilson-bash-guard@sidecar       # block catastrophic Bash commands
/plugin install wilson-dangerous-path@sidecar   # protect system / credential paths
/plugin install wilson-git-guard@sidecar        # block force-push
/plugin install wilson-readme-format@sidecar    # repo-root README lint guard
/plugin install wilson-hexa-verify@sidecar      # redirect non-hexa verifiers to hexa
/plugin install wilson-guards@sidecar           # ssot-lock / tape / domain-lint bundle
/plugin install wilson-ssot@sidecar             # AGENTS.md SSOT injection
/plugin install wilson-prefs@sidecar            # reply-language / code / style prefs
/plugin install wilson-output-trim@sidecar      # Bash stdout salience filter
/plugin install wilson-pool@sidecar             # route heavy Bash to a remote host
/plugin install wilson-checkpoint@sidecar       # WIP snapshot every turn (limit/crash safe)
/plugin install wilson-gpu@sidecar              # RunPod/Vast cost guardrail + kill switch
/plugin install wilson-decision-gate@sidecar    # step-by-step decision gate + design.md ledger
/plugin install wilson-fire-gate@sidecar        # instrument-first gate — measure over predict
/plugin install wilson-tape-recorder@sidecar    # record the session as a .tape v1.2 trace
/plugin install wilson-goal@sidecar             # session goal persistence (survives compaction)
/plugin install wilson-resume@sidecar           # persist + re-arm the native /goal across an abrupt end
/plugin install wilson-inbox@sidecar            # cross-project handoff inbox (inbox/<kind>/<slug>.md)
/plugin install wilson-lsp@sidecar              # LSP for .hexa / .tape / .n6 / .hxc / .kosmos
/plugin install worktree-pr@sidecar             # /worktree-pr:wt workflow command
/plugin install wilson-gap@sidecar              # /gap multi-axis gap exploration (40 strategy lenses)
/plugin install wilson-schedule@sidecar         # daily task list — run fans pending tasks to bg subagents
/plugin install sidecar@sidecar                 # /sidecar runtime on/off control
```

Browse or toggle plugins anytime with `/plugin`. After a new release, upgrade with:

```bash
/plugin marketplace update sidecar
/plugin update
```

### Enable everything at once

Rather than running `/plugin install` per plugin, declare the marketplace and
the plugins in `settings.json` (`~/.claude/settings.json` for every project, or
`.claude/settings.json` for one) — Claude Code installs and enables every listed
plugin on the next start:

```json
{
  "extraKnownMarketplaces": {
    "sidecar": { "source": { "source": "github", "repo": "dancinlab/sidecar" } }
  },
  "enabledPlugins": {
    "wilson-secret-guard@sidecar": true,
    "wilson-bash-guard@sidecar": true,
    "wilson-dangerous-path@sidecar": true,
    "wilson-git-guard@sidecar": true,
    "wilson-readme-format@sidecar": true,
    "wilson-hexa-verify@sidecar": true,
    "wilson-guards@sidecar": true,
    "wilson-ssot@sidecar": true,
    "wilson-prefs@sidecar": true,
    "wilson-output-trim@sidecar": true,
    "wilson-pool@sidecar": true,
    "wilson-checkpoint@sidecar": true,
    "wilson-gpu@sidecar": true,
    "wilson-decision-gate@sidecar": true,
    "wilson-fire-gate@sidecar": true,
    "wilson-tape-recorder@sidecar": true,
    "wilson-goal@sidecar": true,
    "wilson-resume@sidecar": true,
    "wilson-inbox@sidecar": true,
    "wilson-lsp@sidecar": true,
    "worktree-pr@sidecar": true,
    "sidecar@sidecar": true
  }
}
```

## Status

**v0.1.0 — seventeen plugins working.** `wilson-guards` (ssot-lock /
tape-append-only / domain-lint bundle, inert unless its convention is
present), `wilson-ssot` (AGENTS.md walk-up),
`wilson-readme-format` (4-lint README guard, faithful standalone port of
wilson's `guard-readme-format`), `wilson-hexa-verify` (non-hexa-verifier
Bash guard, inert without `hexa`), `wilson-dangerous-path` (protected
system / credential path guard), `wilson-git-guard` (force-push guard),
`wilson-secret-guard` (block live secrets / `.env` writes / pasted
credentials), `wilson-bash-guard` (deny pipe-to-shell, `rm -rf /`, fork
bombs, disk destroyers), `wilson-prefs` (`/wilson-prefs:prefs`
slash command → persisted language/style, injected as context),
`wilson-output-trim` (Bash stdout → TF-IDF/MinHash salience filter via
`PreToolUse updatedInput`), `wilson-pool` (heavy Bash → a
platform-tagged remote host roster, user-synced workdir), and
`wilson-checkpoint` (every-turn `git stash create` WIP snapshot so a
usage limit / crash never loses work), and `wilson-gpu` (RunPod/Vast
rented-GPU cost guardrail + kill switch; provisioning behind a separate
off-by-default switch), and `wilson-decision-gate` (step-by-step
decision gate — one user-confirmation gate per decision, never batched;
`design.md` ledger; default ON, quiet), and `wilson-tape-recorder`
(records each session as a `.tape` v1.2 execution trace — `@S`/`@U`/`@T`
/`@R` — pairs with `wilson-guards/tape-append-only`), and `wilson-goal`
(persist the session's high-level objective on disk so it survives
compaction; re-injected at SessionStart, re-asserted compactly on each
prompt; project `GOAL.md` as default), and `wilson-inbox` (cross-project
handoff inbox — scaffold `inbox/<kind>/<slug>.md` entries in any SSOT
repo, `SessionStart` surfaces pending ones) **work**, plus
`wilson-lsp` (wires LSP — `.hexa`
via `hexa lsp`; `.tape`/`.n6`/`.hxc`/`.kosmos` via the canonical per-repo
servers) and the `sidecar` **control plugin**
(`/sidecar off <name>` toggles any of them at runtime, persists,
complements `/plugin`). `wilson-guards` is now a **standalone port** —
its three guards (`ssot-lock` / `tape-append-only` / `domain-lint`)
re-implement the wilson predicates directly, with no wilson binary
dependency. Each guard is **inert unless its convention is present** in
the project (no `ssot-lock:` bullet / no `.tape` file / no root topic
roadmap → zero behaviour), so the bundle is safe for general use and is
only meaningful inside a dancinlab-style workflow.

## Repo layout

```
sidecar/
├── .claude-plugin/marketplace.json   # marketplace manifest
├── plugins/
│   ├── wilson-guards/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) wiring
│   │   ├── bin/guard.sh              # hook wrapper
│   │   └── bin/_guards.py            # ssot-lock + tape-append-only + domain-lint (working)
│   ├── wilson-ssot/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # SessionStart/UserPromptSubmit wiring
│   │   └── bin/_ssot.py              # AGENTS.md walk-up (working)
│   ├── wilson-readme-format/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) wiring
│   │   └── bin/_readme_format.py     # 4-lint README guard (working)
│   ├── wilson-hexa-verify/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse + PostToolUse (Bash) wiring
│   │   ├── bin/_hexa_verify.py       # non-hexa-verifier guard (working)
│   │   └── bin/_verify_watch.py      # new-equation → hexa-lang PR trigger (working)
│   ├── wilson-dangerous-path/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) wiring
│   │   └── bin/_dangerous_path.py    # protected-path guard (working)
│   ├── wilson-git-guard/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) wiring
│   │   └── bin/_git_guard.py         # force-push guard (working)
│   ├── wilson-secret-guard/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse(Write|Edit)+UserPromptSubmit
│   │   ├── bin/secret-guard.sh       # hook wrapper
│   │   └── bin/_secret_guard.py      # .env + credential-token guard (working)
│   ├── wilson-bash-guard/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) wiring
│   │   ├── bin/bash-guard.sh         # hook wrapper
│   │   └── bin/_bash_guard.py        # catastrophic-command guard (working)
│   ├── wilson-prefs/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/prefs.md         # /wilson-prefs:prefs slash command
│   │   ├── hooks/hooks.json          # SessionStart/UserPromptSubmit wiring
│   │   ├── bin/_prefs.py             # set/show prefs (working)
│   │   ├── bin/_inject.py            # inject prefs as context (working)
│   │   └── styles/friendly.{md,*.md} # response-style samples (5 languages)
│   ├── wilson-output-trim/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) wiring
│   │   ├── bin/_trim.py              # rewrites cmd via updatedInput (working)
│   │   └── bin/_salience.py          # TF-IDF + MinHash filter (working)
│   ├── wilson-pool/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/pool.md          # /wilson-pool:pool slash command
│   │   ├── hooks/hooks.json          # PreToolUse(Bash)+SessionStart wiring
│   │   ├── bin/_pool.py              # host roster / workdir config (working)
│   │   ├── bin/_route.py             # platform-routed ssh rewrite (working)
│   │   └── bin/_inject.py            # ## Pool block (working)
│   ├── wilson-checkpoint/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/checkpoint.md    # /wilson-checkpoint:checkpoint
│   │   ├── hooks/hooks.json          # Stop·PreCompact·SessionEnd·SessionStart
│   │   ├── bin/checkpoint.sh         # hook + command entrypoint
│   │   └── bin/_checkpoint.py        # git-stash WIP snapshot/restore (working)
│   ├── wilson-gpu/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/gpu.md           # /wilson-gpu
│   │   ├── hooks/hooks.json          # SessionStart (cost guardrail)
│   │   ├── bin/gpu.sh                # hook + command entrypoint
│   │   └── bin/_gpu.py               # RunPod/Vast adapters + guardrail (working)
│   ├── wilson-decision-gate/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/decision-gate.md # /wilson-decision-gate
│   │   ├── hooks/hooks.json          # SessionStart + UserPromptSubmit
│   │   ├── bin/dg.sh                 # hook + command entrypoint
│   │   ├── bin/_dg.py                # principle inject + design.md ledger (working)
│   │   └── samples/step-by-step-decision-gate.{md,ko,ja,zh,ru}.md
│   ├── wilson-fire-gate/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/fire-gate.md     # /wilson-fire-gate
│   │   ├── hooks/hooks.json          # SessionStart·PostCompact·UserPromptSubmit
│   │   ├── bin/fg.sh                 # hook + command entrypoint
│   │   ├── bin/_fg.py                # instrument-first inject + Fire-decision ledger (working)
│   │   └── samples/instrument-first.md
│   ├── wilson-tape-recorder/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/tape-recorder.md # /wilson-tape-recorder
│   │   ├── hooks/hooks.json          # SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/SessionEnd
│   │   ├── bin/tr.sh                 # hook + command entrypoint
│   │   └── bin/_tr.py                # .tape v1.2 emitter (@S/@U/@T/@R) (working)
│   ├── wilson-goal/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/goal.md          # /wilson-goal
│   │   ├── hooks/hooks.json          # SessionStart + UserPromptSubmit
│   │   ├── bin/g.sh                  # hook + command entrypoint
│   │   └── bin/_g.py                 # goal persistence + re-injection (working)
│   ├── wilson-resume/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/resume.md        # /wilson-resume
│   │   ├── hooks/hooks.json          # Stop·SessionStart
│   │   ├── bin/r.sh                  # hook + command entrypoint
│   │   └── bin/_r.py                 # native /goal persist + re-arm (working)
│   ├── wilson-inbox/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── commands/inbox.md         # /wilson-inbox:inbox
│   │   ├── hooks/hooks.json          # SessionStart
│   │   ├── bin/inbox.sh              # hook + command entrypoint
│   │   └── bin/_inbox.py             # inbox scaffold + lifecycle (8 verbs) (working)
│   ├── wilson-lsp/
│   │   ├── .claude-plugin/plugin.json
│   │   └── .lsp.json                 # wires hexa lsp + tape/n6/hxc/kosmos repo LSPs
│   ├── sidecar/                      # control plugin
│   │   ├── commands/sidecar.md       # /sidecar status|on|off <name>
│   │   └── bin/_sidecar.py           # writes shared disabled.json (working)
│   └── worktree-pr/
│       ├── commands/wt.md            # /worktree-pr:wt start|ship|finish|...
│       └── bin/worktree-pr.sh        # worktree → PR → merge → cleanup (working)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) — the hexa-native AI coding agent. The original of the guards sidecar ports.

## License

MIT. See [LICENSE](LICENSE).
