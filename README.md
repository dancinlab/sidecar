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
| `wilson-hexa-verify` | `PreToolUse` (`Bash`) | Deny Bash invocations of non-hexa verifiers (sympy / PyPhi / wolframscript / mathematica) → redirect to the hexa CLI — standalone port of wilson `guard-hexa-verify`, **working**. ⚠ INERT unless `hexa` is on PATH |
| `wilson-prefs` | `/wilson-prefs:prefs` command + `SessionStart`·`UserPromptSubmit` | Set reply language / code language / response style; persisted to plugin data, injected as context. Standalone port of wilson `prefs` — **working** (injects nothing until you set one) |
| `wilson-output-trim` | `PreToolUse` (`Bash`) | Rewrites a Bash command (`updatedInput`) so stdout passes a TF-IDF salience + MinHash near-dup filter before the model ingests it — spirit-port of wilson `compaction-prefilter`, **working** (small output verbatim; exit code preserved via `pipefail`) |
| `wilson-pool` | `/wilson-pool:pool` command + `PreToolUse` (`Bash`) + `SessionStart`·`UserPromptSubmit` | Route heavy Bash commands to a remote host via ssh — spirit-port of wilson `pool`, **working**. ⚠ OFF until host+workdir set; only Bash is routed; **you** keep the remote workdir synced (a CC hook can't mount the fs like wilson's 9P/sshfs) |
| `wilson-lsp` | `.lsp.json` LSP servers (not a hook) | Wires `.hexa` → `hexa lsp` and `.tape`·`.n6`·`.hxc`·`.kosmos` → the canonical per-repo servers (`tape-lsp`/`n6-lsp`/`hxc-lsp`/`kosmos-lsp`, shipped in `github.com/dancinlab/{tape,n6,hxc,kosmos}`). Graceful — a server not on PATH just shows in `/plugin` Errors. LSP lifecycle is CC-managed (toggle via `/plugin`, not `/sidecar`) |
| `sidecar` | `/sidecar` command (control) | Runtime on/off for the other plugins — `/sidecar status\|on\|off <name>` (names: ssot readme-format hexa-verify prefs output-trim pool guards, or `all`). Shared `~/.claude/sidecar/disabled.json` each plugin's hook checks; persists across sessions; complements the native `/plugin` manager |

Roadmap candidates: `wilson-memory` (SessionStart/SessionEnd file memory),
`wilson-recap` (PreCompact/SessionEnd summarization).

## Install

```bash
/plugin marketplace add dancinlab/sidecar
/plugin install wilson-guards@sidecar
/plugin install wilson-ssot@sidecar
```

## Status

**v0.1.0 — six plugins working.** `wilson-ssot` (AGENTS.md walk-up),
`wilson-readme-format` (4-lint README guard, faithful standalone port of
wilson's `guard-readme-format`), `wilson-hexa-verify` (non-hexa-verifier
Bash guard, inert without `hexa`), `wilson-prefs` (`/wilson-prefs:prefs`
slash command → persisted language/style, injected as context),
`wilson-output-trim` (Bash stdout → TF-IDF/MinHash salience filter via
`PreToolUse updatedInput`), and `wilson-pool` (heavy Bash → remote ssh,
user-synced workdir) **work**, plus `wilson-lsp` (wires LSP — `.hexa`
via `hexa lsp`; `.tape`/`.n6`/`.hxc`/`.kosmos` via the canonical per-repo
servers) and the `sidecar` **control plugin**
(`/sidecar off <name>` toggles any of them at runtime, persists,
complements `/plugin`). `wilson-guards` is still a **stub**
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
│   ├── wilson-readme-format/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Write|Edit) wiring
│   │   └── bin/_readme_format.py     # 4-lint README guard (working)
│   ├── wilson-hexa-verify/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── hooks/hooks.json          # PreToolUse (Bash) wiring
│   │   └── bin/_hexa_verify.py       # non-hexa-verifier guard (working)
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
│   │   ├── commands/pool.md          # /wilson-pool:pool slash command
│   │   ├── hooks/hooks.json          # PreToolUse(Bash)+SessionStart wiring
│   │   ├── bin/_route.py             # heavy cmd → ssh rewrite (working)
│   │   └── bin/_inject.py            # ## Pool block (working)
│   ├── wilson-lsp/
│   │   ├── .claude-plugin/plugin.json
│   │   └── .lsp.json                 # wires hexa lsp + tape/n6/hxc/kosmos repo LSPs
│   └── sidecar/                      # control plugin
│       ├── commands/sidecar.md       # /sidecar status|on|off <name>
│       └── bin/_sidecar.py           # writes shared disabled.json (working)
└── LICENSE
```

## Sibling

- 🐦 [`dancinlab/wilson`](https://github.com/dancinlab/wilson) — the hexa-native AI coding agent. The original of the guards sidecar ports.

## License

MIT. See [LICENSE](LICENSE).
