---
description: /cycle-full-loop — depletion brainstorm + continuous loop. Runs /cycle-full once (phase-0 brainstorm + first fan-out), then hands off to the `loop` skill with `/cycle` as the recurring payload — subsequent rounds use plain /cycle (no re-brainstorming). Terminates when ideas deplete or user interrupts.
argument-hint: "<seed-or-goal>"
allowed-tools: Agent, Bash, Read, Skill
---

Two stages:

1. Run `/cycle-full $ARGUMENTS` — one-time depletion brainstorm + first fan-out.
2. After the first fan-out completes, engage the `loop` skill in dynamic mode with `/cycle` as the recurring payload — subsequent rounds use plain /cycle (no re-brainstorming).

End the loop by omitting ScheduleWakeup when no further disjoint work is inferable; user can interrupt any time.
