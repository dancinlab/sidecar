---
description: /cycle-loop — continuous /cycle. Thin wrapper that invokes the `loop` skill with `/cycle $ARGUMENTS` as the payload; `loop` (dynamic mode) handles ScheduleWakeup pacing between rounds. Rounds continue until ideas deplete (model omits ScheduleWakeup) or user interrupts.
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read, Skill
---

Engage the `loop` skill in dynamic mode with `/cycle $ARGUMENTS` as the recurring payload. Each wake-up re-runs /cycle (next-list → plan → fan-out). End the loop by omitting ScheduleWakeup when no further disjoint work is inferable; user can interrupt any time.
