---
description: /cycle-full-loop — depletion brainstorm + continuous loop that DRAINS the active domain. Runs /cycle-full once (phase-0 brainstorm + first fan-out), then hands off to the `loop` skill with `/cycle` as the recurring payload — subsequent rounds use plain /cycle (no re-brainstorming; each empty round self-feeds from the domain's `## deferred` section). Terminates at DEPLETION (open milestones = 0 AND deferred empty AND no other signal) or user interrupts.
argument-hint: "<seed-or-goal>"
allowed-tools: Agent, Bash, Read, Skill
---

Two stages:

1. Run `/cycle-full $ARGUMENTS` — one-time depletion brainstorm + first fan-out.
2. After the first fan-out completes, engage the `loop` skill in dynamic mode with `/cycle` as the recurring payload — subsequent rounds use plain /cycle (no re-brainstorming; each empty round auto-seeds the next batch from the domain's `## deferred` section, draining it batch-by-batch).

The per-round cap (default 3) throttles batch WIDTH so each round stays reviewable; the loop provides the DEPTH by auto-continuing across rounds to depletion.

**DEPLETION termination (omit ScheduleWakeup) — only when ALL of:** (1) open milestones = 0 (no `- [ ]` left in the snapshot), AND (2) `deferred` is empty (no `## deferred` section, or no still-open backlog item — all promoted + drained), AND (3) no other seed signal (user mention · prior-turn `/gap` shortlist · `/check`/`/end` follow-up · `<NAME>.log.md` tail open thread). Until ALL three hold, the domain is NOT drained — keep cycling. User can interrupt any time.
