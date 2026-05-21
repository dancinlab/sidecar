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
├── hooks/                # PreToolUse · SessionStart · LSP auto-behavior plugins
├── commands/             # /slash-command invoked plugins
├── skills/               # Skill tool invocable plugins
├── .claude/skills/       # Spec Kit project-scope skills (tracked)
├── .specify/             # Spec Kit pipeline artifacts (constitution + templates + workflows)
├── archive/              # Deprecated artifacts (e.g. legacy .tape carriers) — kept for reference, not active
└── .claude-plugin/marketplace.json
```

## Plugins

| Name | Kind | Version | Summary |
|---|---|---|---|
| [`commons`](hooks/commons/) | hook | 0.3.8 | SessionStart + PreCompact hook — injects a cross-project `do` / `dont` layer above the per-project context. |
| [`git-guard`](hooks/git-guard/) | hook | 0.1.0 | PreToolUse(Bash) deny — blocks `git push --force(-with-lease)` · refspec-force · `git {commit,merge,rebase} --no-verify`. Opt out via `SIDECAR_NO_GIT_GUARD=1`. |
| [`hexa-lsp`](hooks/hexa-lsp/) | hook | 0.1.0 | Wire the hexa-lang LSP server for `.hexa` files. |
| [`inbox`](skills/inbox/) | skill + command | 0.1.0 | Cross-project handoff inbox. Natural-language trigger + `/inbox list` · `/inbox new <kind> <slug>`. |
| [`all-bg-go`](skills/all-bg-go/) | skill + command | 0.1.0 | Parallel fan-out trigger — when the previous turn offered multiple branches and the user says "all bg go", spawn one background Agent per branch in parallel. Also `/all-bg-go`. |

## Governance

The substantive constitution lives at `.specify/memory/constitution.md` (Spec Kit). Cross-project `do` / `dont` rules ride inside the `commons` hook plugin and are auto-injected at SessionStart + PreCompact. Local sidecar rules (concept separation, ship cycle, evidence-before-ship) are recorded in [`design.md`](design.md) as numbered decisions.

> Note: `.tape` carriers (e.g. legacy `commons.tape`, `AGENTS.tape`) are no longer the live source — they were retired into [`archive/`](archive/) on 2026-05-21. Active plugin logic lives in each plugin's `bin/` + `hooks/` directly.

## Reference

- [`gh-stack.md`](gh-stack.md) — stacked PR workflow notes (private preview status + manual fallback).

## License

MIT.
