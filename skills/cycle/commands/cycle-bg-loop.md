---
description: /cycle-bg-loop — continuous BACKGROUND PARALLEL /cycle that DRAINS the active domain to depletion via explicit `loop`-skill pacing. Thin wrapper that invokes the `loop` skill with `/cycle-bg $ARGUMENTS` as the recurring payload; `loop` (dynamic mode) handles ScheduleWakeup pacing between rounds. Each wake-up re-runs /cycle-bg → background parallel execution (one background Agent per PROCEED row, `isolation: worktree` for code edits · auto-continue · resource-serialized for shared EXCLUSIVE resources). Each round self-feeds from open `- [ ]` milestones, else auto-seeds the next batch from the domain's `## deferred` section. Rounds continue until DEPLETION (open milestones = 0 AND deferred empty AND no other signal) or user interrupts. The continuous-loop version of single-round /cycle-bg.
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read, Skill
---

Engage the `loop` skill in dynamic mode with `/cycle-bg $ARGUMENTS` as the recurring payload. Each wake-up re-runs /cycle-bg → **background parallel** round execution: identical enumeration / precheck / planning stages to `/cycle`, with Stage 4 fanning out one background `Agent` per PROCEED row (`run_in_background: true`, `isolation: "worktree"` for code edits, resource-contention serialization for shared EXCLUSIVE resources) then auto-continuing. The per-round cap (default 3) throttles batch WIDTH so each round stays reviewable; the loop provides the DEPTH by auto-continuing across rounds — so the domain drains to depletion without stopping for steering between batches.

**DEPLETION termination (omit ScheduleWakeup) — only when ALL of:**

1. **Open milestones = 0** — the active `<NAME>.md` snapshot has no `- [ ]` checkbox left, AND
2. **`deferred` is empty** — the active `<NAME>.md` has no `## deferred` section, or its body holds no still-open backlog item (every item already promoted + drained in prior rounds), AND
3. **No other seed signal** — no direct user mention, no prior-turn `/gap` shortlist, no `/check` / `/end` follow-up, no `<NAME>.log.md` tail open thread that the snapshot + `deferred` haven't captured.

Until ALL three hold, the domain is NOT yet drained — keep cycling: schedule the next wake-up. (`/cycle-bg`'s Stage 1a auto-seed self-feeds each empty round from `deferred` first, so the loop marches through the whole declared backlog batch-by-batch.) When all three hold, the domain is genuinely depleted — omit ScheduleWakeup and report closure. User can interrupt any time.

**Relation to /cycle-bg and bare `/cycle`.** `/cycle-bg-loop` is the continuous-loop version of the single-round `/cycle-bg`: where bare `/cycle-bg` runs one background-parallel round, `/cycle-bg-loop` routes that same background-parallel round through the built-in `loop` skill for dynamic ScheduleWakeup pacing across rounds, draining to depletion. (`/cycle-fg-loop` is the foreground-sequential counterpart — the continuous version of `/cycle-fg`.) Bare `/cycle` also reaches the SAME depletion end-state via inline self-continue (no `loop` skill), dispatching fg/bg per the sticky `~/.sidecar/cycle-mode` marker; use `/cycle-bg-loop` for explicit continuous background-parallel intent + the loop skill's pacing surface.

## Round discipline — the FIXED per-round shape (with linter)

Every loop round MUST end with this canonical autonomous-loop format (do not improvise the shape — this is the fixed contract the linter audits):

1. **Result report** — per landed item: a status glyph (⭐ win · ✅ done) + PR# + an HONEST verify tier (🔵/🟢/🟡/🟠/🔴 — no over-claim, g5), and for any non-trivial finding a 7-element easy explain (icon·name·alias·plain·analogy·ASCII·vs-tool, g53) + a `▓▓▓░░ NN% · done/total` progress bar (g56).
2. **Handoff + split tracking** — surface any filed cross-repo handoff (`handoff filed: <repo> [<id>]` via `sidecar handoff`, @D handoff_debt_ledger) and any milestone SPLIT after ≥2 throttle deaths (@D oversized_split); never drop either silently.
3. **Round-lint line** — emit `🔍 round-lint: <N>/10 ✓` auditing the 10-point contract (@D round_lint); flag any ✗ with its rule id and correct it, never rubber-stamp.
4. **Loop tail** — `M agents launched (round K): <labels>  [K skipped: <labels+reasons>]` then EITHER `⏩ not depleted (open: <n> · deferred: <n>) — scheduled next round` (+ ScheduleWakeup) OR the lane-pause / perpetual form (@D depletion_not_terminal · @D perpetual_domain) — NEVER a bare `✅ 100% done` for an exploratory/perpetual domain.

Reference shape (the autonomous-loop pattern this skill fixes): one msg per round = recon Bash (optional) + ≤cap disjoint Agents (resource-partitioned) + ScheduleWakeup; result reported next round when their task-notifications land.
