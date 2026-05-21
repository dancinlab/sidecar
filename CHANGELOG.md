# Changelog

Chronological log of notable changes. One section per ship batch, date-keyed. Per-plugin version bumps inline.

For the full audit trail, see `git log`.

---

## 2026-05-21

- **gh-stack 0.1.0 — new skill** — natural-language trigger that proposes the stacked-PR workflow. Two modes: `gh stack` commands (private-preview enabled repos) or the manual `gh pr create --base previous-layer` fallback. Encodes sidecar's <200-lines-per-layer · 1-concern governance. Per-org status tracked in `gh-stack.md`.
- **README — `sidecar init` walkthrough** — install section spells out the `project.tape` field placeholders (kind/brief/parent/ssot/do/dont) + the `CLAUDE.md → project.tape` symlink + project-tape re-injection. Install commands switched to bare names (`hx install sidecar`, `hx install tape`) since both resolve via the trimmed default org-probe.
- **Spec Kit removed** — `.specify/` (memory · scripts · templates · workflows · integrations · 001-ship-cycle spec) and `.claude/skills/speckit-*` deleted. `<root>/project.tape` is the substantive project SSOT (CLAUDE.md symlink + `project-tape` hook re-injects on PreCompact/PostCompact). `design.md` Decision 2 records the current SSOT shape.
- **sidecar project.tape — minimal Ⓑ shape** — `@V` + `@I` (kind/brief/parent/ssot) + `@D` (do/dont). Layout tree + named governance rules removed; their content is captured in `design.md` decisions and the README plugin table.
- **commons → 0.6.1** — strip 3 Spec Kit `do` entries (recognize `.specify/`, treat constitution.md as SSOT, use the Spec Kit pipeline) + 1 `dont` (skip Spec Kit pipeline for >200 lines). Carrier shape unchanged.
- **project-tape 0.1.0 — new** — PreCompact + PostCompact hook that re-injects `<project-root>/project.tape` as `additionalContext` so project identity + governance survive auto-compaction. SessionStart is intentionally skipped because the harness already loads `CLAUDE.md → project.tape` (symlink) at session bootstrap. No-op when `project.tape` is absent.
- **tape-lsp 0.1.0 — new** — wires the canonical `.tape` v1.2 LSP server (`tape-lsp` — see `dancinlab/tape`) into Claude Code. Diagnostics + hover. Requires `tape-lsp` on PATH (`hx install dancinlab/tape`).
- **sidecar CLI — new** — `bin/sidecar`, single verb `sidecar init` that scaffolds `project.tape` + `CLAUDE.md → project.tape` symlink in the current dir. Installable via `hx install dancinlab/sidecar`.
- **sidecar dogfood** — repo root now carries `project.tape` (identity + ship-cycle + cross-project-carrier governance in `.tape` v1.2 grammar) with `CLAUDE.md → project.tape` symlink.
- **commons → 0.6.0** — carrier reverted to `commons.tape` (single `@D commons :: governance` entry with `do` / `dont` fields). `bin/commons.sh` emits the tape verbatim as `additionalContext`; the JSON-render path is gone.
- **commons → 0.4.1** — added DO entry: use Claude Code's `Monitor` tool for streaming events from a background process (per-line stdout = notification), not `tail -f` / sleep-poll loops.
- **commons → 0.4.0** — carrier moved from `commons.tape` to `commons.json` (structured `{ "do": [...], "dont": [...] }`, rendered to markdown by `bin/commons.sh`). Added do/dont entries codifying the "docs in completed-form · history in CHANGELOG / archive/" rule.
- **all-bg-go 0.1.0 — new** — parallel fan-out trigger. When the prior assistant turn offered N branches and the user says "all bg go" (or 전부 병렬 발사 / fan it all out), spawn one background Agent per branch in a single message. Skill + `/all-bg-go` command.
- **git-guard 0.1.0 — new** — PreToolUse(Bash) deny for `git push --force(-with-lease)`, refspec-force `+<ref>`, and `git {commit,merge,rebase} --no-verify`. Opt out via `SIDECAR_NO_GIT_GUARD=1`.
- **`.tape` carriers retired** — `commons.tape` and `AGENTS.tape` moved into `archive/` (no live plugin reads `.tape` anymore).
- **Install cleanup** — 34 stale `wilson-*@sidecar` entries purged from `~/.claude/plugins/installed_plugins.json` + matching cache directories removed. Marketplace ↔ installed-plugins ↔ cache are now in agreement.
- **Spec Kit ship-cycle formalized** — `001-ship-cycle/spec.md` records `ship = commit + push + install + no-unshipped-diffs` as an invariant.
