---
description: /abg — 3-character alias for `/all-bg-go`. Fan-out trigger — print a parallel plan table, then spawn one background Agent per branch the previous assistant turn offered (same message). Optional argument restricts to specific branches (defaults to all). For a self-generating loop use /cycle.
argument-hint: "[branch-label, ...]"
allowed-tools: Agent, Bash, Read
---

`/abg` is the short alias for **`/all-bg-go`** — identical semantics.

Engage the `all-bg-go` skill: look at the immediately-preceding assistant turn, enumerate every distinct branch / option / direction it proposed to the user, then in ONE message:

1. Print a compact plan table — `| # | label | subagent_type | iso | goal |` — so the parallel plan is visible.
2. Issue N `Agent` tool calls right after the table — each `run_in_background: true`, `isolation: "worktree"` if it edits code, and a fully self-contained prompt.

REACTIVE only — fan out exactly what the prior turn offered. For a self-generating repeatable loop (enumerate next work → plan → fan-out → loop), the user wants `/cycle`, not this.

If `$ARGUMENTS` is non-empty, restrict the fan-out to the branches matching those labels; otherwise fan out everything. Follow the guardrails in SKILL.md (no destructive fan-out, no invented branches — point at `/cycle` if no prior-turn list, cap >8 with confirm, no nesting).

End the message with this exact shape:

```
N agents launched in parallel: <branch labels>

Next iteration: `all bg go` to fan out the next round of branches once results land.
```

The `Next iteration` line is intentional — it biases the TUI's prompt-suggestion-generator (ghost-text auto-suggest) toward proposing `all bg go` again.
