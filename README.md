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
| [`commons`](hooks/commons/) | hook | 0.6.1 | SessionStart + PreCompact + PostCompact hook — injects a cross-project `do` / `dont` layer (from `commons.tape`) above the per-project context. PostCompact re-injects after the `※ recap` so the layer survives auto-compaction. |
| [`project-tape`](hooks/project-tape/) | hook | 0.1.0 | PreCompact + PostCompact hook — re-injects `<project-root>/project.tape` as `additionalContext` so the project's identity + governance survive auto-compaction. No-op when `project.tape` is absent. |
| [`git-guard`](hooks/git-guard/) | hook | 0.1.0 | PreToolUse(Bash) deny — blocks `git push --force(-with-lease)` · refspec-force · `git {commit,merge,rebase} --no-verify`. Opt out via `SIDECAR_NO_GIT_GUARD=1`. |
| [`pool-route`](hooks/pool-route/) | hook | 0.1.0 | PreToolUse(Bash) suggestion — when a command is macOS-only (`swift` · `xcodebuild` · `xcrun` · `pod install`) or GPU-bound (`nvidia-smi` · `nvcc`), inject an `additionalContext` proposing `pool on <host> -- <cmd>`. Non-blocking. Opt out via `SIDECAR_NO_POOL_ROUTE=1`. |
| [`hexa-lsp`](hooks/hexa-lsp/) | hook | 0.1.0 | Wire the hexa-lang LSP server for `.hexa` files. |
| [`tape-lsp`](hooks/tape-lsp/) | hook | 0.1.0 | Wire the `tape-lsp` server (canonical `.tape` v1.2 LSP — diagnostics + hover) for `.tape` files. Requires `tape-lsp` on PATH (`hx install tape`). |
| [`inbox`](skills/inbox/) | skill + command | 0.1.0 | Cross-project handoff inbox. Natural-language trigger + `/inbox list` · `/inbox new <kind> <slug>`. |
| [`all-bg-go`](skills/all-bg-go/) | skill + command | 0.2.0 | Parallel fan-out trigger — when the previous turn offered multiple branches and the user says "all bg go", print a plan table first (branch · subagent_type · isolation · goal), then spawn one background Agent per branch in the same message. Also `/all-bg-go`. |
| [`easy`](skills/easy/) | skill + command | 0.1.0 | Friendly response style — 7-element pattern (icon · name · alias · plain-line · analogy · ASCII diagram · compare). Triggered by natural language ("친근하게" · "easy mode" · multilingual equivalents) or `/easy`. 5 language samples (en · ko · ja · zh · ru). |
| [`gh-stack`](skills/gh-stack/) | skill | 0.1.0 | Stacked-PR workflow — proposes `gh stack` (enabled repos) or the manual `gh pr create --base previous-layer` fallback. Encodes sidecar's <200-lines-per-layer · 1-concern governance. Status in [`gh-stack.md`](gh-stack.md). |

## Governance

Sidecar's own identity + governance lives in [`project.tape`](project.tape) (also reachable via `CLAUDE.md`). Cross-project `do` / `dont` rules ride inside the `commons` hook plugin and auto-inject at SessionStart + PreCompact + PostCompact. Local sidecar decisions (concept separation, ship cycle, evidence-before-ship, cross-project carrier) are recorded in [`design.md`](design.md) as numbered decisions.

## Reference

- [`project.tape`](project.tape) — sidecar's identity + governance (linked as `CLAUDE.md`).
- [`CHANGELOG.md`](CHANGELOG.md) — chronological log of notable changes (one entry per ship batch).
- [`gh-stack.md`](gh-stack.md) — stacked PR workflow notes (private preview status + manual fallback).

## License

MIT.
