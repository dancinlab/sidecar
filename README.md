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
└── .claude-plugin/marketplace.json
```

## Plugins

| Name | Kind | Version | Summary |
|---|---|---|---|
| [`commons`](hooks/commons/) | hook | 0.2.6 | SessionStart hook — injects a cross-project `do` / `dont` layer above the per-project context. |
| [`inbox`](skills/inbox/) | skill + command | 0.1.0 | Cross-project handoff inbox. Natural-language trigger + `/inbox list` · `/inbox new <kind> <slug>`. |
| [`hexa-lsp`](hooks/hexa-lsp/) | hook | 0.1.0 | Wire the hexa-lang LSP server for `.hexa` files. |

## Governance

The substantive constitution lives at `.specify/memory/constitution.md` (Spec Kit). Cross-project rules live in [`hooks/commons/commons.tape`](hooks/commons/commons.tape) and are auto-injected at SessionStart. Local sidecar rules (concept separation, ship cycle, evidence-before-ship) are recorded in [`design.md`](design.md) as numbered decisions.

## Reference

- [`gh-stack.md`](gh-stack.md) — stacked PR workflow notes (private preview status + manual fallback).

## License

MIT.
