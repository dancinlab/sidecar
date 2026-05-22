---
name: gh-stack
description: Stacked-PR workflow — split work into a chain of dependent PRs (each layer <200 lines, 1 concern, --base on the layer below). Uses `gh stack` where enabled, else the manual `gh pr create --base` fallback. Triggers — "split into stacked PRs", "stack these changes", "make a PR chain", "rebase the stack".
allowed-tools: Bash
---

@D gh-stack := "stacked-PR workflow" :: skill
  do   = "split into a chain — each layer <200 lines · 1 concern · --base on the layer below"
  dont = "one large multi-concern PR · skip the `gh pr create --base` fallback when `gh stack` is off"
