---
description: /cycle — autonomous work-loop driver: next-list (self-enumerate) → parallel-plan table → fan-out (one background Agent per item, same message) → loop. Repeat `/cycle` to march through a goal in parallel batches. Distinct from `all bg go` (that fans out PRIOR-turn branches; /cycle self-generates the next batch each round).
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read
---

Engage the `cycle` skill. In ONE message run all four stages:

1. **Next-list (self-enumerate)** — derive the next viable, DISJOINT work items from the current context (roadmap/todo · active-goal sub-tasks · obvious "what's next"). If `$ARGUMENTS` is non-empty, scope the enumeration to it. State in one line what you enumerated.
2. **Parallel-plan** — print a compact table `| # | item | subagent_type | iso | goal |` before dispatch.
3. **Fan-out** — issue M `Agent` tool calls right after the table — each `run_in_background: true`, `isolation: "worktree"` if it edits code, fully self-contained prompt.
4. **Loop bias** — end with:

```
M agents launched (cycle N): <item labels>

Next: `/cycle` to enumerate + fan out the next round once results land.
```

Guardrails (per SKILL.md): self-enumerate only when next work is genuinely inferable (else ask); disjoint items only; no destructive fan-out; cap >8 with confirm; no nesting.
