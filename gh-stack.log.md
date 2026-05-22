# gh-stack history

Chronological snapshots of `gh stack` enablement state for `dancinlab` repos.

## 2026-05-21 — pre-enablement baseline

| Layer | State |
|---|---|
| `gh` CLI | ✅ 2.92.0 |
| `gh stack` extension | ✅ installed (`gh extension install github/gh-stack`) |
| `gh-stack` agent skill | ✅ `~/.claude/skills/gh-stack/` (Claude Code recognizes stack tasks) |
| Repo enablement | ⏳ waitlist · https://gh.io/stacksbeta |
| Server-side stack tracking (UI map · cascade rebase · merge-multi) | ❌ blocked until enablement |

Forward-looking activation steps when waitlist clears (still pending):

1. Receive enable email for org `dancinlab` (or per-repo).
2. Confirm via `gh stack submit` on a test layer — should attach to a Stack on the PR page (otherwise treated as plain PR chain).
3. Update [`gh-stack.md`](gh-stack.md) when enablement lands.
4. Switch from manual `gh pr create --base previous-layer` to `gh stack` commands.
