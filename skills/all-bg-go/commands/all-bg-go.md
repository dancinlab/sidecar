---
description: Fan-out trigger — spawn one background Agent per branch the previous assistant turn offered. Equivalent to typing "all bg go" in natural language. Optional argument lists specific branches to fan out (defaults to all).
argument-hint: "[branch-label, ...]"
allowed-tools: Agent, Bash, Read
---

Engage the `all-bg-go` skill: look at the immediately-preceding assistant turn, enumerate every distinct branch / option / direction it proposed to the user, and dispatch ONE background Agent per branch in a SINGLE message — each with `run_in_background: true`, `isolation: "worktree"` if it edits code, and a fully self-contained prompt.

If `$ARGUMENTS` is non-empty, restrict the fan-out to the branches matching those labels; otherwise fan out everything. Follow the guardrails in SKILL.md (no destructive fan-out, no invented branches, cap >8, no nesting).

After dispatch, output in this exact shape and stop:

```
N agents launched in parallel: <branch labels>

Next iteration: `all bg go` to fan out the next round of branches once results land.
```

The `Next iteration` line is intentional — it biases the TUI's prompt-suggestion-generator (ghost-text auto-suggest) toward proposing `all bg go` again.
