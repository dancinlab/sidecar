---
description: /cycle-fg — like /cycle but FOREGROUND SEQUENTIAL execution. Same stages (SSOT-freshness → next-list → dup-race precheck → plan table → execute → auto-continue), but Stage 4 runs each PROCEED row INLINE in this session, one at a time, with visible step-by-step progress. NO background Agent fan-out · NO parallelism. Use when you want cycle's auto-enumeration + planning but need to see each item executed in-context (debugging · careful review · single-threaded resource).
argument-hint: "[scope hint]"
allowed-tools: Bash, Read, Edit, Write
---

**STICKY MODE (Stage -1, run FIRST).** `/cycle-fg` is not one-shot — it sets the
session's cycle execution mode to **foreground** and PERSISTS it, so subsequent
bare `/cycle` rounds ALSO run foreground until the user flips back with
`/cycle-bg`. Write the marker before anything else:

```
mkdir -p ~/.sidecar && printf fg > ~/.sidecar/cycle-mode
```

(`~/.sidecar/cycle-mode` ∈ {`fg`, `bg`} · per-host dotstate · default `bg` when
absent.) Bare `/cycle` reads this marker at its Stage 0 and dispatches to the
matching execution mode. `/cycle-fg` = set `fg` + run · `/cycle-bg` = set `bg` +
run · neither resets on its own — the mode is sticky across the session.

Engage the `cycle` skill in **FOREGROUND-SEQUENTIAL mode** — identical to `/cycle`
in the enumeration, precheck, and planning stages (run Stages 0-3 unchanged), with
ONE deliberate override at Stage 4:

**OVERRIDE — Stage 4 = foreground sequential.** `/cycle` and `/cycle-all` fan out
one background `Agent` per PROCEED row. `/cycle-fg` does the opposite — for each
PROCEED row, execute the work INLINE in the current session, one at a time,
top-to-bottom from the plan table:

```
▶ 1/N — <item>      ← announce
  <do the work using Bash/Read/Edit/Write directly>
✅ 1/N done · <one-line outcome>   (or ⚠ partial · ❌ failed)

▶ 2/N — <item>
  ...
```

No `Agent` tool. No `run_in_background`. No `isolation: worktree`. Just direct
in-session tool calls per item, sequentially. The user sees every step, can
interrupt at any time, and the context window carries every result through to
Stage 5.

**Why foreground sequential vs cycle's parallel background:**

| 축 | /cycle (default) | /cycle-fg |
|---|---|---|
| 실행 | 백그라운드 Agent fan-out (병렬) | 인-세션 직접 실행 (순차) |
| 결과 가시성 | Agent 완료 알림으로만 | 매 step의 stdout/diff가 그대로 보임 |
| 리소스 | N개 Agent context · 병렬 throttle 영향 | 단일 main context · throttle 안전 |
| 적합 | 독립 작업 다발 · 격리 필요 | 디버깅 · 조심스러운 리뷰 · cwd 공유 작업 |
| 비유 | 공장 라인 (여러 작업자 동시) | 1인 셰프 (한 접시씩 순서대로) |

**Everything else is unchanged from /cycle — keep all guardrails:**

- **Stage 0 SSOT-freshness** — same fail-open probe (untracked / behind-main /
  content-stale / perpetual marker). Stale SSOT → stop and reconcile.
- **Stage 1 next-list (ACTIVE DOMAIN ONLY)** — same enumeration + 1a auto-seed
  from `## deferred` (PRIMARY signal). Cap N (default 3) per round.
- **Stage 2 dup-race precheck + 2b stale-milestone scan** — same 3-signal
  resolved-class regex (handoff done / merged PR / git-log fix). SKIP rows do NOT
  execute in Stage 4.
- **Stage 3 plan table** — same `| # | item | tool-set | resource | goal |
  precheck |` table. Drop the `subagent_type` + `iso` columns (foreground has
  neither); add a `tool-set` column declaring which inline tools each item uses
  (Bash · Read · Edit · Write · combinations). Pre-fan-out worktree-leak sweep
  is N/A (no worktrees spawned).
- **Stage 5 auto-continue to depletion** — same depletion test (open = 0 AND
  deferred empty AND no other signal) → PAUSE / ♾️ perpetual override / else
  re-enter Stage 0 of the next round inline (or ScheduleWakeup if the round
  itself was long — judgment call). Since execution is sequential foreground,
  the next round naturally begins after the last item's `✅`; no Agent-completion
  notification dance.

**Halt rules (sbs-like, narrower than /cycle):**

- A step `❌ failed` → STOP. Surface the verbatim error + remaining un-run rows.
  Do NOT proceed to the next row automatically. Same halt bar as `/sbs auto`.
- An irreversible / destructive / outward-facing step (deploy · force-push ·
  rm -rf · external API write) → confirm with the user before that specific step,
  then resume.
- User interruption between steps → graceful stop with `🛑 paused after step
  <i>/<N>: <last-outcome>`.

**One-line mode banner** before Stage 1:
`mode: cycle-fg (foreground sequential · 1-at-a-time · no Agent fan-out · halt
on failure) · sticky → ~/.sidecar/cycle-mode=fg (subsequent /cycle stays fg until
/cycle-bg)`.

NL triggers: /cycle-fg · 사이클 포그라운드 · 사이클 순차 · 사이클 직접 ·
foreground cycle · sequential cycle · inline cycle · 한 단계씩 사이클.
