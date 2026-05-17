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
| `wilson-guards` | `PreToolUse` (`Bash`·`Write`·`Edit`) | Deny dangerous-path / SSOT-append-only / domain-lint violations |
| `wilson-ssot` | `SessionStart` · `UserPromptSubmit` | Inject `AGENTS.md` walk-up SSOT as context (wilson `agents-md` equivalent) — **working** |
| `wilson-readme-format` | `PreToolUse` (`Write`·`Edit`) | Deny a repo-root `README.md` violating readme-format anti-patterns (emoji-in-prose / multi-glyph H1 / non-English At-a-glance / `####`) — standalone port of wilson `guard-readme-format`, **working** |

Roadmap candidates: `wilson-memory` (SessionStart/SessionEnd file memory),
`wilson-recap` (PreCompact/SessionEnd summarization).

## Install

```bash
/plugin marketplace add dancinlab/sidecar
/plugin install wilson-guards@sidecar
/plugin install wilson-ssot@sidecar
```

## Status

**v0.1.0 — first guard ported.** `wilson-ssot` (AGENTS.md walk-up) and
`wilson-readme-format` (4-lint README guard, faithful standalone port of
wilson's `guard-readme-format`) **work**. `wilson-guards` is still a **stub**
(passthrough — never fabricates fake blocks). Because wilson is a single static
binary (plugin dispatch is an internal ABI), the remaining `wilson-guards` port
path is one of two, to be decided:

1. **via harness-rpc** — a thin wrapper that calls wilson's `harness-rpc`
   (JSONL stdin/stdout) for a specific guard plugin action.
2. **standalone port** — re-implement the guard predicates (dangerous-path /
   SSOT append-only / domain-lint) here directly, with no wilson binary
   dependency (marketplace works on its own).

Until that is decided, the hook passes through without denying — it does **not
fabricate fake blocks** (honest by design).

## Repo layout

```
sidecar/
├── .claude-plugin/marketplace.json   # marketplace manifest
├── plugins/
│   ├── wilson-guards/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse wiring
│   │   └── bin/guard.sh              # stub (TODO: wilson port)
│   ├── wilson-ssot/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # SessionStart/UserPromptSubmit wiring
│   │   └── bin/_ssot.py              # AGENTS.md walk-up (working)
│   └── wilson-readme-format/
│       ├── .claude-plugin/plugin.json
│       ├── hooks/hooks.json          # PreToolUse (Write|Edit) wiring
│       └── bin/_readme_format.py     # 4-lint README guard (working)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) — the hexa-native AI coding agent. The original of the guards sidecar ports.

## License

MIT. See [LICENSE](LICENSE).
