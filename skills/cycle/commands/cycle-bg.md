---
description: /cycle-bg — set the session's cycle execution mode to BACKGROUND (the default /cycle behavior — parallel Agent fan-out + auto-continue to depletion) and PERSIST it, then run a round. Sticky counterpart to /cycle-fg: after /cycle-bg, subsequent bare /cycle rounds also run background until /cycle-fg flips it. Use to flip back to parallel after a /cycle-fg foreground session.
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read
---

**STICKY MODE (Stage -1, run FIRST).** `/cycle-bg` sets the session's cycle
execution mode to **background** (the original `/cycle` behavior) and PERSISTS
it, so subsequent bare `/cycle` rounds also run background until the user flips
back with `/cycle-fg`. Write the marker before anything else:

```
mkdir -p ~/.sidecar && printf bg > ~/.sidecar/cycle-mode
```

(`~/.sidecar/cycle-mode` ∈ {`fg`, `bg`} · per-host dotstate · default `bg` when
absent.) This is the sticky counterpart to `/cycle-fg`:

| command | sets marker | this round | subsequent bare /cycle |
|---|---|---|---|
| `/cycle-fg` | `fg` | foreground sequential | foreground (sticky) |
| `/cycle-bg` | `bg` | background parallel | background (sticky) |
| bare `/cycle` | (unchanged) | reads marker (default bg) | follows marker |

**EXECUTION — identical to bare `/cycle` (background parallel fan-out +
auto-continue to depletion).** Run the full five stages exactly as `/cycle`
does — there is NO behavioral override here beyond persisting the marker; the
point of `/cycle-bg` is to RE-ESTABLISH the default background mode after a
`/cycle-fg` foreground session (or to state the intent explicitly):

- **Stage 0 SSOT-freshness** — same fail-open probe.
- **Stage 1 next-list (ACTIVE DOMAIN ONLY)** + 1a auto-seed from `## deferred`.
- **Stage 2 dup-race precheck + 2b stale-milestone scan** — SKIP resolved.
- **Stage 3 plan table** (`| # | item | subagent_type | iso | resource | goal |
  precheck |`) + pre-fan-out worktree-leak sweep.
- **Stage 4 fan-out** — one background `Agent` per PROCEED row (`run_in_background:
  true`, `isolation: "worktree"` for code edits, self-contained prompt),
  resource-contention serialization for shared EXCLUSIVE resources, auto-inject
  throttle-resilience + cross-cutting-principle clauses.
- **Stage 5 auto-continue to depletion** — ScheduleWakeup the next round; PAUSE
  at depletion (open = 0 AND deferred empty AND no signal) / ♾️ perpetual override.

**One-line mode banner** before Stage 1:
`mode: cycle-bg (background parallel fan-out · auto-continue to depletion) ·
sticky → ~/.sidecar/cycle-mode=bg (subsequent /cycle stays bg until /cycle-fg)`.

NL triggers: /cycle-bg · 사이클 백그라운드 · 사이클 병렬 · background cycle ·
parallel cycle · 다시 백그라운드 · bg 모드로.
