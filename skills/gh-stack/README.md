# gh-stack

Skill that proposes the stacked-PR workflow when the user wants to split work into dependent PRs. Two modes: `gh stack` commands (private-preview enabled repos) or the manual `gh pr create --base previous-layer` fallback (pre-enablement). Encodes sidecar's governance: each layer < 200 lines, 1 logical concern.

## Trigger

Natural language only — phrases like *"split this into stacked PRs"*, *"stack these changes"*, *"make a PR chain"*, *"rebase the stack"*, *"open the next layer"*.

No slash command — `gh stack ...` and `gh pr create ...` are the literal mechanisms; this skill orchestrates which to use.

## Status

Per-org enablement tracked in [`gh-stack.md`](../../gh-stack.md) at the sidecar repo root.
