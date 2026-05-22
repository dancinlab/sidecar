---
description: Fan-out trigger — print a parallel plan table, then spawn one background Agent per branch the previous assistant turn offered (same message). Equivalent to "all bg go" in natural language. Optional argument lists specific branches to fan out (defaults to all).
argument-hint: "[branch-label, ...]"
allowed-tools: Agent, Bash, Read
---

Engage the `all-bg-go` skill. Enumerate branches, then in ONE message print a plan table + fan out:

1. **Enumerate** — prior-turn mode: every distinct branch / option / direction the immediately-preceding assistant turn proposed. Self-enumerate mode (prior turn had no branches): derive the next viable work items from the current context yourself (roadmap/todo entries · independent sub-tasks of the active goal · obvious "what's next" set) — keep disjoint, note in one line that you self-enumerated.
2. Print a compact plan table — `| # | label | subagent_type | iso | goal |` — so the parallel plan is visible.
3. Issue N `Agent` tool calls right after the table — each `run_in_background: true`, `isolation: "worktree"` if it edits code, and a fully self-contained prompt.

If `$ARGUMENTS` is non-empty, restrict the fan-out to the branches matching those labels; otherwise fan out everything. Follow the guardrails in SKILL.md (no destructive fan-out; self-enumerate only when next work is genuinely inferable; cap >8 with confirm; no nesting).

End the message with this exact shape:

```
N agents launched in parallel: <branch labels>

Next iteration: `all bg go` to fan out the next round of branches once results land.
```

The `Next iteration` line is intentional — it biases the TUI's prompt-suggestion-generator (ghost-text auto-suggest) toward proposing `all bg go` again.
