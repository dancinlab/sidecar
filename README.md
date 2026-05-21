<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>Claude Code plugin pack — concept-separated guardrails, commands, and skills.</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
  <img alt="Spec Kit" src="https://img.shields.io/badge/spec--kit-integrated-9cf">
</p>

---

## What is sidecar

A **Claude Code marketplace repo** that side-mounts guardrails, slash commands, and skills onto the host harness without modifying it. Strict concept separation: one plugin = one of `{hook, command, skill}`, no mixing. Project-level workflow runs on [GitHub Spec Kit](https://github.com/github/spec-kit); `.specify/memory/constitution.md` is the substantive SSOT.

## Layout

```
sidecar/
├── hooks/                # PreToolUse · SessionStart · PreCompact · PostCompact · LSP plugins
├── commands/             # /slash-command invoked plugins
├── skills/               # Skill tool invocable plugins
├── .claude/skills/       # Spec Kit project-scope skills (tracked)
├── .specify/             # Spec Kit pipeline artifacts (constitution + templates + workflows)
└── .claude-plugin/marketplace.json
```

## Plugins

| Name | Kind | Version | Summary |
|---|---|---|---|
| [`commons`](hooks/commons/) | hook | 0.6.0 | SessionStart + PreCompact + PostCompact hook — injects a cross-project `do` / `dont` layer (from `commons.tape`) above the per-project context. PostCompact re-injects after the `※ recap` so the layer survives auto-compaction. |
| [`git-guard`](hooks/git-guard/) | hook | 0.1.0 | PreToolUse(Bash) deny — blocks `git push --force(-with-lease)` · refspec-force · `git {commit,merge,rebase} --no-verify`. Opt out via `SIDECAR_NO_GIT_GUARD=1`. |
| [`pool-route`](hooks/pool-route/) | hook | 0.1.0 | PreToolUse(Bash) suggestion — when a command is macOS-only (`swift` · `xcodebuild` · `xcrun` · `pod install`) or GPU-bound (`nvidia-smi` · `nvcc`), inject an `additionalContext` proposing `pool on <host> -- <cmd>`. Non-blocking. Opt out via `SIDECAR_NO_POOL_ROUTE=1`. |
| [`hexa-lsp`](hooks/hexa-lsp/) | hook | 0.1.0 | Wire the hexa-lang LSP server for `.hexa` files. |
| [`inbox`](skills/inbox/) | skill + command | 0.1.0 | Cross-project handoff inbox. Natural-language trigger + `/inbox list` · `/inbox new <kind> <slug>`. |
| [`all-bg-go`](skills/all-bg-go/) | skill + command | 0.1.1 | Parallel fan-out trigger — when the previous turn offered multiple branches and the user says "all bg go", spawn one background Agent per branch in parallel. Also `/all-bg-go`. |
| [`easy`](skills/easy/) | skill + command | 0.1.0 | Friendly response style — 7-element pattern (icon · name · alias · plain-line · analogy · ASCII diagram · compare). Triggered by natural language ("친근하게" · "easy mode" · multilingual equivalents) or `/easy`. 5 language samples (en · ko · ja · zh · ru). |

## Governance

The substantive constitution lives at `.specify/memory/constitution.md` (Spec Kit). Cross-project `do` / `dont` rules ride inside the `commons` hook plugin and are auto-injected at SessionStart + PreCompact + PostCompact. Local sidecar rules (concept separation, ship cycle, evidence-before-ship, cross-project carrier) are recorded in [`design.md`](design.md) as numbered decisions.

## Reference

- [GitHub Spec Kit](https://github.com/github/spec-kit) — upstream of the `/speckit-*` skill set bundled under `.claude/skills/` and the `.specify/` pipeline (`constitution → specify → clarify → plan → tasks → analyze → implement`).
- [`.specify/memory/constitution.md`](.specify/memory/constitution.md) — sidecar's project constitution (Spec Kit format).
- [`CHANGELOG.md`](CHANGELOG.md) — chronological log of notable changes (one entry per ship batch).
- [`gh-stack.md`](gh-stack.md) — stacked PR workflow notes (private preview status + manual fallback).

## License

MIT.
