---
description: /cycle-loop — continuous /cycle that DRAINS the active domain to depletion via explicit `loop`-skill pacing. Thin wrapper that invokes the `loop` skill with `/cycle $ARGUMENTS` as the payload; `loop` (dynamic mode) handles ScheduleWakeup pacing between rounds. Each round self-feeds from open `- [ ]` milestones, else auto-seeds the next batch from the domain's `## deferred` section. Rounds continue until DEPLETION (open milestones = 0 AND deferred empty AND no other signal) or user interrupts. Bare `/cycle` now also auto-continues to the same depletion end-state via inline self-continue; use `/cycle-loop` for explicit continuous intent + the loop skill's pacing surface.
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read, Skill
---

Engage the `loop` skill in dynamic mode with `/cycle $ARGUMENTS` as the recurring payload. Each wake-up re-runs /cycle (next-list → plan → fan-out). The per-round cap (default 3) throttles batch WIDTH so each round stays reviewable; the loop provides the DEPTH by auto-continuing across rounds — so the domain drains to depletion without stopping for steering between batches.

**DEPLETION termination (omit ScheduleWakeup) — only when ALL of:**

1. **Open milestones = 0** — the active `<NAME>.md` snapshot has no `- [ ]` checkbox left, AND
2. **`deferred` is empty** — the active `<NAME>.md` has no `## deferred` section, or its body holds no still-open backlog item (every item already promoted + drained in prior rounds), AND
3. **No other seed signal** — no direct user mention, no prior-turn `/gap` shortlist, no `/check` / `/end` follow-up, no `<NAME>.log.md` tail open thread that the snapshot + `deferred` haven't captured.

Until ALL three hold, the domain is NOT yet drained — keep cycling: schedule the next wake-up. (`/cycle`'s Stage 1a auto-seed self-feeds each empty round from `deferred` first, so the loop marches through the whole declared backlog batch-by-batch.) When all three hold, the domain is genuinely depleted — omit ScheduleWakeup and report closure. User can interrupt any time.

**Relation to bare `/cycle`.** Bare `/cycle` now auto-continues to the SAME depletion end-state on its own (inline self-continue via ScheduleWakeup, no `loop` skill). `/cycle-loop` is the explicit continuous-intent surface: it routes through the built-in `loop` skill for dynamic pacing/interval control. Both drain the domain to depletion; pick `/cycle-loop` when you want the loop skill's pacing surface, bare `/cycle` for the plain inline entry. Both are kept (no published command removed).

## Round discipline — the FIXED per-round shape (with linter)

Every loop round MUST end with this canonical autonomous-loop format (do not improvise the shape — this is the fixed contract the linter audits):

1. **Result report** — per landed item: a status glyph (⭐ win · ✅ done) + PR# + an HONEST verify tier (🔵/🟢/🟡/🟠/🔴 — no over-claim, g5), and for any non-trivial finding a 7-element easy explain (icon·name·alias·plain·analogy·ASCII·vs-tool, g53) + a `▓▓▓░░ NN% · done/total` progress bar (g56).
2. **Debt + split tracking** — surface any `⚠ handoff debt: <repo> INBOX uncommitted` (@D handoff_debt_ledger) and any milestone SPLIT after ≥2 throttle deaths (@D oversized_split); never drop either silently.
3. **Round-lint line** — emit `🔍 round-lint: <N>/10 ✓` auditing the 10-point contract (@D round_lint); flag any ✗ with its rule id and correct it, never rubber-stamp.
4. **Loop tail** — `M agents launched (round K): <labels>  [K skipped: <labels+reasons>]` then EITHER `⏩ not depleted (open: <n> · deferred: <n>) — scheduled next round` (+ ScheduleWakeup) OR the lane-pause / perpetual form (@D depletion_not_terminal · @D perpetual_domain) — NEVER a bare `✅ 100% done` for an exploratory/perpetual domain.

Reference shape (the autonomous-loop pattern this skill fixes): one msg per round = recon Bash (optional) + ≤cap disjoint Agents (resource-partitioned) + ScheduleWakeup; result reported next round when their task-notifications land.
