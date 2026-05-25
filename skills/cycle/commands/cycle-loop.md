---
description: /cycle-loop — continuous /cycle that DRAINS the active domain to depletion. Thin wrapper that invokes the `loop` skill with `/cycle $ARGUMENTS` as the payload; `loop` (dynamic mode) handles ScheduleWakeup pacing between rounds. Each round self-feeds from open `- [ ]` milestones, else auto-seeds the next batch from the domain's `## deferred` section. Rounds continue until DEPLETION (open milestones = 0 AND deferred empty AND no other signal) or user interrupts.
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read, Skill
---

Engage the `loop` skill in dynamic mode with `/cycle $ARGUMENTS` as the recurring payload. Each wake-up re-runs /cycle (next-list → plan → fan-out). The per-round cap (default 3) throttles batch WIDTH so each round stays reviewable; the loop provides the DEPTH by auto-continuing across rounds — so the domain drains to depletion without stopping for steering between batches.

**DEPLETION termination (omit ScheduleWakeup) — only when ALL of:**

1. **Open milestones = 0** — the active `<NAME>.md` snapshot has no `- [ ]` checkbox left, AND
2. **`deferred` is empty** — the active `<NAME>.md` has no `## deferred` section, or its body holds no still-open backlog item (every item already promoted + drained in prior rounds), AND
3. **No other seed signal** — no direct user mention, no prior-turn `/gap` shortlist, no `/check` / `/end` follow-up, no `<NAME>.log.md` tail open thread that the snapshot + `deferred` haven't captured.

Until ALL three hold, the domain is NOT yet drained — keep cycling: schedule the next wake-up. (`/cycle`'s Stage 1a auto-seed self-feeds each empty round from `deferred` first, so the loop marches through the whole declared backlog batch-by-batch.) When all three hold, the domain is genuinely depleted — omit ScheduleWakeup and report closure. User can interrupt any time.
