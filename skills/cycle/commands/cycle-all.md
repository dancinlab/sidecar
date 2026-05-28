---
description: /cycle-all — like /cycle but NO per-round cap and NO recommend/select gate: enumerate the FULL next-list and fan out EVERY PROCEED item this round (one background Agent each), then auto-continue to depletion. Use when you want "run everything" instead of a curated ≤N batch + a "which to dispatch?" prompt. Same SSOT-freshness · dup-race SKIP · leak-sweep · resource-serialization · throttle-resilience guardrails as /cycle.
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read
---

Engage the `cycle` skill in **ALL mode** — identical to `/cycle` (run the same
five stages: SSOT-freshness pre-check → next-list → dup-race precheck + stale
scan → parallel-plan table → fan-out → auto-continue to depletion), with TWO
deliberate overrides:

**OVERRIDE 1 — no cap (fan out EVERYTHING).** `/cycle` caps each round at N
(default 3) for reviewability; `/cycle-all` removes the cap. Stage 1 enumerates
the FULL set of open `- [ ]` milestones (intersected with `$ARGUMENTS` scope if
given), and Stage 1a, when the board is empty, promotes the ENTIRE `## deferred`
backlog (not just the next N) into the milestone board, draining `deferred`
completely in one round. The `cap >8 → confirm` guardrail is explicitly WAIVED
for `/cycle-all` — that waiver IS the command's purpose.

**OVERRIDE 2 — no recommend/select gate.** Do NOT produce a "🎯 recommended
priority" shortlist, a tiered "pick which to dispatch" menu, or a
`dispatch 지정 (X go / Y / /cycle 자율) 알려주시면 진행` hand-back. After the
plan table, fan out **every PROCEED row** immediately in the same message. The
whole point is "전부 진행" — run all of it, don't ask which.

**Everything else is unchanged from /cycle — keep all guardrails (these are
safety/correctness, NOT selection, so ALL-mode does NOT waive them):**

- **Stage 0 SSOT-freshness** — same fail-open probe (untracked / behind-main /
  content-stale / perpetual marker). A stale SSOT makes the full next-list wrong.
- **Stage 2 dup-race precheck + 2b stale-milestone scan** — still SKIP items
  already resolved (handoff `done` / merged PR / git-log fix). SKIP is correctness,
  not curation: never dispatch an already-done item just because "all". Print
  the precheck reason per item; SKIP rows get no Agent.
- **Stage 3 plan table + pre-fan-out worktree-leak sweep** — print the
  `| # | item | subagent_type | iso | resource | goal | precheck |` table for
  ALL rows, then sweep stale `/tmp/wt-*`.
- **Stage 4 resource-contention serialization (@D resource_contention) — CRITICAL
  in ALL mode.** Fanning out "everything" does NOT mean firing every Agent in
  parallel. Partition PROCEED rows by the `resource` column: distinct /
  non-exclusive resources fan out CONCURRENTLY; rows SHARING an EXCLUSIVE resource
  (e.g. several `GPU:ubu-2-timed`) issue SEQUENTIALLY (dispatch one, await its
  completion, then the next) — parallel timed GPU fires poison cuEvent walls.
  Print `resource-partition: parallel=<N> · serial-chain=[res: N…]`. Also inject
  the throttle-resilience + cross-cutting-principle clauses into every spawned
  prompt, exactly as /cycle does.
- **Stage 5 auto-continue to depletion** — same depletion test (open = 0 AND
  deferred empty AND no other signal) → PAUSE (not "100% done", per
  feedback-closure-is-physical-limit) / ♾️ perpetual override / else
  ScheduleWakeup the next round. Since this round drained the whole board +
  deferred, depletion is reached faster, but the same lane-pause framing applies.

One-line mode banner before Stage 1: `mode: cycle-all (no cap · fan out every
PROCEED row · resource-serialized)`.
