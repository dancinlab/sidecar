<h1 align="center">🏍️ sidecar</h1>

<p align="center"><strong>Claude Code plugin pack — concept-separated guardrails, commands, and skills.</strong></p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Marketplace" src="https://img.shields.io/badge/claude--code-plugin_marketplace-informational">
</p>

---

## What is sidecar

A **Claude Code marketplace repo** that side-mounts guardrails, slash commands, and skills onto the host harness without modifying it. Strict concept separation: one plugin = one of `{hook, command, skill}`, no mixing.

## Layout

```
sidecar/
├── hooks/        # PreToolUse · SessionStart auto-behavior plugins
├── commands/     # /slash-command invoked plugins
├── skills/       # Skill tool invocable plugins
└── .claude-plugin/marketplace.json
```

## Governance

See `AGENTS.tape` (project-level governance, `CLAUDE.md` symlinks here):

- `g_concept_separation` — 1 plugin = exactly 1 of `{hook, command, skill}`
- `g_ship_syncs_install` — ship = push + immediate local install sync
- `g_evidence_before_ship` — new plugins require measurement + decision log

## License

MIT.
