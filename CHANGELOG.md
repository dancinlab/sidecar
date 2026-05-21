# Changelog

Chronological log of notable changes. One section per ship batch, date-keyed. Per-plugin version bumps inline.

For dead-artifact retention (prior carriers, retired plugin shapes), see [`archive/`](archive/). For the full audit trail, see `git log`.

---

## 2026-05-21

- **commons → 0.4.1** — added DO entry: use Claude Code's `Monitor` tool for streaming events from a background process (per-line stdout = notification), not `tail -f` / sleep-poll loops.
- **commons → 0.4.0** — carrier moved from `commons.tape` to `commons.json` (structured `{ "do": [...], "dont": [...] }`, rendered to markdown by `bin/commons.sh`). Added do/dont entries codifying the "docs in completed-form · history in CHANGELOG / archive/" rule.
- **all-bg-go 0.1.0 — new** — parallel fan-out trigger. When the prior assistant turn offered N branches and the user says "all bg go" (or 전부 병렬 발사 / fan it all out), spawn one background Agent per branch in a single message. Skill + `/all-bg-go` command.
- **git-guard 0.1.0 — new** — PreToolUse(Bash) deny for `git push --force(-with-lease)`, refspec-force `+<ref>`, and `git {commit,merge,rebase} --no-verify`. Opt out via `SIDECAR_NO_GIT_GUARD=1`.
- **`.tape` carriers retired** — `commons.tape` and `AGENTS.tape` moved into `archive/` (no live plugin reads `.tape` anymore).
- **Install cleanup** — 34 stale `wilson-*@sidecar` entries purged from `~/.claude/plugins/installed_plugins.json` + matching cache directories removed. Marketplace ↔ installed-plugins ↔ cache are now in agreement.
- **Spec Kit ship-cycle formalized** — `001-ship-cycle/spec.md` records `ship = commit + push + install + no-unshipped-diffs` as an invariant.
