---
name: cycle
description: |
  Autonomous work-loop driver: next-list → parallel-plan → fan-out →
  loop. Invoke when the user wants to march through a goal in parallel
  batches without hand-holding each round. Each `/cycle` (1) enumerates
  the next viable work items from the current context ITSELF, (2) prints
  a parallel-plan table, (3) fans out one background Agent per item in
  the SAME message, (4) biases the next `/cycle`. Repeating `/cycle`
  re-enters the loop. Triggers on "/cycle", "사이클", "계속 진행",
  "다음 라운드 진행", "keep cycling", "march on", "next round".
  Distinct from `all bg go` — that fans out branches the PRIOR turn
  offered; `/cycle` self-generates the next batch every round.
allowed-tools: Agent, Bash, Read
---

# cycle — next-list → parallel-plan → fan-out → loop

## The loop (4 stages, one message per round)

```
next-list  →  parallel-plan  →  fan-out  →  loop
   │              │               │           │
   │              │               │           └ "/cycle" again → next round
   │              │               └ N background Agents, one per item, ONE message
   │              └ print the plan table (item · type · iso · goal) BEFORE dispatch
   └ SELF-enumerate the next viable work from current context
     (roadmap/todo · active-goal sub-tasks · "what's next" set)
```

## Distinct from `all bg go`

| | trigger source | when |
|---|---|---|
| `all bg go` | branches the PRIOR turn offered (reactive) | the last turn presented options and you want them all |
| `/cycle` | SELF-enumerated next work (proactive) | you want the agent to figure out + fan out the next batch, repeatedly |

`/cycle` is the loop driver — keep saying it to march through a whole goal in parallel batches. `all bg go` is a single reactive fan-out.

## How each round runs (one message)

1. **Next-list (self-enumerate).** Derive the next viable, DISJOINT work items from the current context — open roadmap/todo entries, independent sub-tasks of the active goal, the obvious "what's next" set. Keep them parallelizable (no shared-file clashes). State in one line what you enumerated so the user can redirect.

2. **Parallel-plan.** Print a compact markdown table BEFORE dispatch:

   ```
   Cycle N — M items:

   | # | item | subagent_type | iso | goal |
   |---|---|---|---|---|
   | 1 | …   | general-purpose | wt | <one-line goal> |
   | 2 | …   | Explore         | —  | <one-line goal> |
   ```

   `iso`: `wt` = worktree (edits files), `—` = read-only.

3. **Fan-out.** Right after the table, issue M `Agent` tool calls in ONE message — each `run_in_background: true`, `isolation: "worktree"` if it edits code, fully self-contained prompt (goal + context + paths + done-state; the sub-agent sees none of this conversation).

4. **Loop bias.** End with exactly:

   ```
   M agents launched (cycle N): <item labels>

   Next: `/cycle` to enumerate + fan out the next round once results land.
   ```

   The trailing line biases the TUI ghost-text toward `/cycle` again, closing the loop.

   Do NOT poll or sleep — the harness notifies on completion.

## Guardrails

- **Self-enumerate only when next work is genuinely inferable.** Derive from concrete context (roadmap · todo · active goal). If state is ambiguous (no active goal, nothing obviously next), ask what to cycle on — don't fabricate filler items.
- **Disjoint items only.** Each item must be parallelizable — no two items editing the same file. If items share state, sequence them across rounds instead.
- **No destructive fan-out.** Force-push · prod deploy · external messages · data drops are NEVER fanned silently — surface and confirm first.
- **Cap at reasonable M.** If >8 next items, print the plan and confirm before launching all.
- **No nesting.** Sub-agents must not invoke `/cycle` or `all bg go`.
- **Research domains** — per `commons.tape g24`, `/cycle` is the natural driver: all viable disjoint research paths fan out each round.

## Related

- `all-bg-go` — reactive single fan-out of prior-turn branches (the non-loop sibling).
- `commons.tape g24` — research/experiment = explore all viable paths in parallel (cycle is the loop form).
- `commons.tape g12` — fan out up to 8 parallel pods when wall time shrinks.
