---
description: /cycle-full — depletion brainstorm before cycle. Runs iterative brainstorm rounds on `$ARGUMENTS` until ideas deplete (cap 8 rounds), takes the deduplicated inventory as the next-list, then fans out one background Agent per item — same plan-table → fan-out → loop tail as /cycle. Use when the goal needs width-first exhaustion before parallel execution; /cycle alone derives next-list from current context only.
argument-hint: "<seed-or-goal>"
allowed-tools: Agent, Bash, Read
---

Engage the `cycle` skill, but precede the next-list step with a **depletion brainstorm**.

1. **Brainstorm depletion (phase 0)** — for `$ARGUMENTS` (or current goal context if empty), run iterative brainstorm rounds. Each round generates ONLY ideas genuinely new vs prior rounds; stop when a new round produces no novel candidates (cap 8 rounds). State the final, deduplicated idea inventory as a numbered bullet list.
2. **Next-list** — take the depleted inventory as the next-list (no re-enumeration). If >8 items, cap at top 8 by impact + state which were deferred.
3. **Parallel-plan** — print compact table `| # | item | subagent_type | iso | goal |` before dispatch.
4. **Fan-out** — issue M `Agent` tool calls right after the table — each `run_in_background: true`, `isolation: "worktree"` if it edits code, fully self-contained prompt.
5. **Loop bias** — end with:

```
M agents launched (cycle-full · phase 0 brainstorm depleted at round N): <item labels>

Next: `/cycle` to enumerate + fan out the next round once results land (no re-brainstorming).
```

Guardrails (per `cycle` SKILL.md): self-enumerate only when next work is genuinely inferable (else ask); disjoint items only; no destructive fan-out; cap >8 with confirm; no nesting. Phase 0 (brainstorm) runs ONCE per goal — subsequent rounds use plain `/cycle` (current context derives next-list).
