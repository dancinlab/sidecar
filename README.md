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

```
hx install sidecar
```

Then in any project root:

```
sidecar init
```

`sidecar init` drops two files into the current directory:

- **`project.tape`** — the project's identity + governance carrier (`.tape` v1.2). Open it and fill in the placeholders:
  - `kind` — one line describing what the project is.
  - `brief` — 2–4 sentences on purpose · scope · why it exists.
  - `parent` — org / parent project (e.g. `dancinlab`).
  - `ssot` — canonical location (repo URL or `hx install <name>`).
  - `do` / `dont` — project-level governance bullets, `·` separated.
- **`CLAUDE.md → project.tape`** — symlink so the harness auto-loads project identity on SessionStart.

The [`project-tape`](hooks/project-tape/) hook re-injects `project.tape` on PreCompact + PostCompact so identity + governance survive auto-compaction.

## Layout

```
sidecar/
├── bin/sidecar               # CLI — `sidecar init` scaffolds project.tape + CLAUDE.md symlink
├── hooks/                    # PreToolUse · SessionStart · PreCompact · PostCompact · LSP plugins
├── commands/                 # /slash-command invoked plugins
├── skills/                   # Skill tool invocable plugins
├── project.tape              # sidecar's identity + governance (also linked as CLAUDE.md)
├── design.md                 # decision-log (one decision per gate)
├── CHANGELOG.md              # chronological ship log
└── .claude-plugin/marketplace.json
```

## Plugins

| Name | Kind | Version | Summary |
|---|---|---|---|
| [`commons`](hooks/commons/) | hook | 0.9.7 | SessionStart + PreCompact + PostCompact hook — injects a cross-project `do` / `dont` layer (from `commons.tape`, granular `@D g1..g25`) above the per-project context. PostCompact re-injects after the `※ recap` so the layer survives auto-compaction. |
| [`prefs`](hooks/prefs/) | hook + command | 0.1.0 | User language preferences — 3 axes (`code` authoring · `docs` authoring · `response` to user). SessionStart + PreCompact + PostCompact hook auto-injects. `/prefs show` · `/prefs code <lang>` · `/prefs docs <lang>` · `/prefs response <lang>`. Defaults: code=english, docs=english, response=korean. SSOT for language prefs (commons g2 removed in 0.9.0). |
| [`project-tape`](hooks/project-tape/) | hook | 0.1.0 | PreCompact + PostCompact hook — re-injects `<project-root>/project.tape` as `additionalContext` so the project's identity + governance survive auto-compaction. No-op when `project.tape` is absent. |
| [`git-guard`](hooks/git-guard/) | hook | 0.1.0 | PreToolUse(Bash) deny — blocks `git push --force(-with-lease)` · refspec-force · `git {commit,merge,rebase} --no-verify`. Opt out via `SIDECAR_NO_GIT_GUARD=1`. |
| [`pool-route`](hooks/pool-route/) | hook | 0.1.0 | PreToolUse(Bash) suggestion — when a command is macOS-only (`swift` · `xcodebuild` · `xcrun` · `pod install`) or GPU-bound (`nvidia-smi` · `nvcc`), inject an `additionalContext` proposing `pool on <host> -- <cmd>`. Non-blocking. Opt out via `SIDECAR_NO_POOL_ROUTE=1`. |
| [`hexa-lsp`](hooks/hexa-lsp/) | hook | 0.1.0 | Wire the hexa-lang LSP server for `.hexa` files. |
| [`tape-lsp`](hooks/tape-lsp/) | hook | 0.1.0 | Wire the `tape-lsp` server (canonical `.tape` v1.2 LSP — diagnostics + hover) for `.tape` files. Requires `tape-lsp` on PATH (`hx install tape`). |
| [`inbox`](skills/inbox/) | skill + command | 0.1.0 | Cross-project handoff inbox. Natural-language trigger + `/inbox list` · `/inbox new <kind> <slug>`. |
| [`all-bg-go`](skills/all-bg-go/) | skill + command | 0.4.0 | Parallel fan-out trigger — "all bg go" → plan table + one background Agent per branch in the same message. **Reactive single fan-out** of what the prior turn offered. For a self-generating repeatable loop, use [`cycle`](skills/cycle/). Also `/all-bg-go`. |
| [`cycle`](skills/cycle/) | skill + command | 0.1.0 | **Autonomous work-loop driver** — `/cycle` runs next-list (self-enumerate next viable work from current context) → parallel-plan table → fan-out (one bg Agent per item, same message) → loop. Repeat `/cycle` to march through a goal in parallel batches. Distinct from `all-bg-go` (reactive fan-out of prior-turn branches; `/cycle` self-generates each round). NL: *"사이클"* · *"계속 진행"* · *"다음 라운드"* · *"keep cycling"*. |
| [`kick`](skills/kick/) | skill + command | 0.1.0 | `/kick <natural-language seed>` — wraps `hexa kick --seed "<seed>"` (hexa-lang gap-breakthrough / discovery engine). All args join into the seed. NL trigger (*"돌파해줘"*, *"kick this"*, *"discover for"*). Pairs with `commons g6`. |
| [`verify`](skills/verify/) | skill + command | 0.1.0 | `/verify <args>` — wraps `hexa verify "$@"` (TECS-L tier rubric — 🔵🟢🟡🟠🔴⚪). Forms: atlas-id · `--expr <fn> <n> <v>` · `--fence "<claim>"` · `rubric` · `list`. NL trigger (*"확인해"*, *"검증해"*, *"맞아?"*). Pairs with `commons g5`. |
| [`pool`](skills/pool/) | skill + command | 0.1.0 | `/pool <args>` — wraps the `pool` CLI (host roster + remote exec). Verbs: `list` · `add <host>` · `on <host> <cmd>` · `status` · `install tailscale` · `rm <host>`. NL trigger (*"pool 호스트"*, *"다른 호스트에서 돌려"*). Pairs with `commons g9` + `pool-route` hook. |
| [`cloud`](skills/cloud/) | skill + command | 0.1.0 | `/cloud <args>` — wraps `hexa cloud` (runpod dispatch · canonical subcommand form, structured argv — never raw ssh/scp). Subverbs: `run` · `nohup` · `poll` · `copy-to` · `copy-from`. Upstream gap (subcommand not yet registered — currently a separate `hexa-cloud` binary) tracked at `hexa-lang/inbox/patches/hexa-cloud-subcommand.md`. NL trigger (*"GPU pod 에 돌려"*, *"runpod dispatch"*). Pairs with `commons g8` + `g12`. |
| [`hexa-help`](skills/hexa-help/) | skill + command | 0.1.0 | `/hexa-help [verb]` — wraps `hexa --help` (no arg, top-level catalog) or `hexa <verb> --help` (verb-specific). Per `commons g7`. NL trigger (*"hexa 뭐있어"*, *"hexa 사용법"*). |
| [`gap`](commands/gap/) | command | 0.2.0 | `/gap` — multi-axis gap exploration. **42** breakthrough-strategy lenses · 8 families (F4 + F6 each have 6; `occams-razor` lives in both — hypothesis side and design side). Bare `/gap` = inline-triage all 42 + deep-dive only hot families (subagents). `/gap full` = exhaustive 8-subagent fan-out. `/gap <scope>` targets the sweep. `/gap list` prints the catalogue. Surfaces + prioritises gaps; never fixes. |
| [`inject`](skills/inject/) | skill + command | 0.1.0 | `/inject` — runs `sidecar sync` (marketplace pull + cache copy + `installed_plugins.json` patch) AND prints the latest `commons.tape` + (cwd's) `project.tape` so the model picks them up THIS turn. For mid-session sidecar refresh without restarting Claude Code. |
| [`domain`](skills/domain/) | skill + command | 0.3.0 | UPPERCASE `<NAME>.md` (current snapshot) + sister `<NAME>.log.md` (append-only **checkbox-task** log) at project root. **Auto-scaffolds** both; defaults NAME to uppercase basename of git root. Verbs: `/domain` (show) · `/domain <task>` (append `- [x]`) · `/domain todo <task>` (`- [ ]`) · `/domain done <match>` (flip `[ ]`→`[x]`) · `/domain new <header>`. Records progress as work proceeds. |
| [`bypass`](skills/bypass/) | skill | 0.2.0 | **Default-on anti-punt** — universal self-check before any move that hands control back to the user (interactive input · unauthorized destructive · external visible · explicit user-review request); if all NO, just execute. Extensible catalog of patterns: `next user action:` blocks · `Should I proceed?` · `Want me to check?` · option-trees w/ obvious default · over-clarification · defer-by-waiting · excessive recap. Cross-project always-on guard in `commons.tape` ≥ 0.7.3. |
| [`brainstorm`](skills/brainstorm/) | skill + command | 0.1.0 | Iterative brainstorming — given a seed, generates ideas in rounds and keeps going until depletion (no new distinct ideas vs prior rounds; hard cap 8 rounds). For breadth over selection. Natural language or `/brainstorm <seed>`. |
| [`easy`](skills/easy/) | skill + command | 0.1.0 | Friendly response style — 7-element pattern (icon · name · alias · plain-line · analogy · ASCII diagram · compare). Triggered by natural language ("친근하게" · "easy mode" · multilingual equivalents) or `/easy`. 5 language samples (en · ko · ja · zh · ru). |
| [`research`](skills/research/) | skill + commands | 0.1.0 | Research-fetch tools — `/research:arxiv <query\|id>` searches the official arXiv API (title · authors · abstract · pdf), `/research:yt <url-or-id>` extracts YouTube caption transcript via the InnerTube ANDROID client. Pure Python stdlib — no pip deps, no API keys, no binaries. |
| [`gh-stack`](skills/gh-stack/) | skill | 0.1.0 | Stacked-PR workflow — proposes `gh stack` (enabled repos) or the manual `gh pr create --base previous-layer` fallback. Encodes sidecar's <200-lines-per-layer · 1-concern governance. Status in [`gh-stack.md`](gh-stack.md). |

## Governance

Sidecar's own identity + governance lives in [`project.tape`](project.tape) (also reachable via `CLAUDE.md`). Cross-project `do` / `dont` rules ride inside the `commons` hook plugin and auto-inject at SessionStart + PreCompact + PostCompact. Local sidecar decisions (concept separation, ship cycle, evidence-before-ship, cross-project carrier) are recorded in [`design.md`](design.md) as numbered decisions.

## Reference

- [`project.tape`](project.tape) — sidecar's identity + governance (linked as `CLAUDE.md`).
- [`CHANGELOG.md`](CHANGELOG.md) — chronological log of notable changes (one entry per ship batch).
- [`gh-stack.md`](gh-stack.md) — stacked PR workflow notes (private preview status + manual fallback).

## License

MIT.
