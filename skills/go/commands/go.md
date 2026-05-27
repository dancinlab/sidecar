---
description: /go — proceed with the most-recently proposed action / continue the paused flow without further confirmation. Bare "go" single-word message also catches. Optional /go <hint> disambiguates.
argument-hint: "[optional hint to disambiguate]"
allowed-tools: Bash, Read, Edit, Write, Agent
---

User says `/go` (or bare `go` as a single-word message) — proceed with the
MOST RECENT proposed action / continue the paused flow, no further questions.

`$ARGUMENTS`

**How to interpret:**

1. **Re-read the last agent message** in the conversation. Identify what was
   proposed, paused, or awaiting confirmation:
   - A plan / runbook just printed → execute it top-to-bottom
   - A "recommended priority" or "next step" → take that exact action
   - `/sbs` MANUAL paused at step `i/N` → advance to step `i+1`
   - `/cycle-fg` halted on a `❌ failed` step → either retry or skip (use the
     `$ARGUMENTS` hint: `retry` re-runs the same step, `skip` advances past it,
     bare `go` defaults to `skip`)
   - `/cycle` ScheduleWakeup deferred next round → trigger the next round inline
   - AskUserQuestion just shown without explicit answer → take the first
     `(Recommended)` option
   - A "should I proceed?" / "이대로 갈까요?" → YES, proceed verbatim

2. **If `$ARGUMENTS` is non-empty**, use it as a hint:
   - `/go ubu-2` → select that host / scope when last proposal had alternatives
   - `/go retry` → re-fire the most recent failed step
   - `/go skip` → advance past the failed step
   - `/go all` → apply the proposal to every candidate (not just the recommended one)

3. **NO new plan**. Do NOT re-ask the same question. Do NOT pivot to unrelated
   work. The user's `go` is an implicit accept of whatever you most recently
   put in front of them.

4. **If no recent proposal exists** (cold context · just after compact ·
   ambiguous state), DO NOT fabricate. Ask one short line:
   `🛑 no recent proposal — go on what? (e.g. /go <hint>, or restate the task)`

5. **Result framing** — after execution, give a tight 1-2 sentence outcome
   (what changed + next). Don't restate the whole plan you just executed.

Distinct from related commands:
- `/sbs` = plan-first sequential runbook (you create the plan, then walk it)
- `/cycle` = autonomous fan-out work loop (parallel Agent dispatch)
- `/cycle-fg` = same as /cycle but foreground sequential
- `/go` = stateless continuation token (proceed with what's already on the
  table; does not create new structure)

Triggers — `/go`, bare `go` (single-word user message), `진행`, `계속`,
`다음 진행`, `proceed`, `continue`, `ok go`, `yes go`.
