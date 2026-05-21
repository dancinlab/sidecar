# Changelog

Chronological log of notable changes. One section per ship batch, date-keyed. Per-plugin version bumps inline.

For the full audit trail, see `git log`.

---

## 2026-05-22

- **commons → 0.7.0** — granular `tape v1.4` form. The single `@D commons` block (which exceeded v1.2's 500-char/entry cap) is replaced by 17 typed `@D g1..g17` blocks — one rule per entry, each with its own `do` / `dont`. Rules that name a canonical CLI (`hexa verify`, `hexa cloud`, `pool`, `Monitor`, etc.) carry the new optional `tool` / `usage` fields introduced in [`tape v1.4 amendment`](https://github.com/dancinlab/tape/commit/2cfd0b8). Backwards-compatible — rules with no specific tool keep just `do` / `dont`.
- **research 0.1.0 — new skill + commands** — revives the pre-v2 `wilson-research` plugin (`0b4fa1a`). Two slash verbs: `/research:arxiv <query|id> [--n N]` (official arXiv API Atom feed → title · authors · date · categories · pdf · abstract) and `/research:yt <url-or-id> [lang]` (InnerTube ANDROID-client `player` API → caption-track XML → plaintext transcript). Pure Python stdlib (no pip deps, no API keys, no binaries). Natural-language trigger via SKILL.md.
- **commons → 0.6.2** — add `dont` entry: "touch project.tape unprompted (active project SSOT — read freely, but modify only on explicit user request)". Mirrors the existing AGENTS.tape dormant-carry rule for the active SSOT case.
- **all-bg-go → 0.2.0** — plan-then-fire flow. Before dispatching the N background Agents, the skill prints a compact plan table (`| # | label | subagent_type | iso | goal |`) so the parallel plan is visible to the user. Plan + dispatch stay in ONE message (no extra turn). The >8 cap now uses the plan table to make cost visible before confirming.

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
