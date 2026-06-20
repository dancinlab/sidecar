# poll — self-paced ≥10-min polling loop (c19-sanctioned)

Watch slow, long-running external state (background lanes · fleet · pods · CI · a remote queue) by
**waking yourself on a timer**, not by reacting to every idle ping and not by a hand-rolled bash
`sleep` loop (c19 blocks those). This is the sanctioned replacement for the "10분 폴링" pattern.

## the loop (one cycle)

```
[wake] ──▶ [check state once] ──▶ [act on what ARRIVED] ──▶ [report 🌐] ──▶ [reschedule next wake]
            git fetch / status      land → next round         one tight line     (only if not done)
```

1. **check once** — one cheap snapshot of the watched state (e.g. `git fetch -q && git log`,
   `harness ci-track <pr>`, `harness ing show`, a pod/lane status read). No loop, no `sleep`.
2. **fire-on-arrival** — if something finished/changed, handle THAT now (merge, advance the lane,
   record a verdict). If nothing changed, say so in one line and move on.
3. **report** — a single status line (🌐), not a re-summary of the whole plan.
4. **reschedule** — if work remains, schedule the next wake; if done/blocked, STOP (don't keep polling).

## cadence — the ≥10-min floor (why 600s+)

- **Minimum 600s (10 min).** Polling faster wastes turns and burns the prompt cache (5-min TTL): a wake
  under 5 min re-reads context cached, but you still pay a full turn each time. ≥10 min amortizes it.
- The right delay tracks **how fast the watched thing actually changes** — not a round number:
  - CI run you expect in ~8 min → one ~270s wake keeps cache warm, or just wait 600s once.
  - genuinely idle / minutes-to-change work → **1200–1800s** (20–30 min) is the default; cheaper, and
    the user can always interrupt sooner.
- Do NOT poll a thing the harness already notifies you about (a tracked background Agent/Task re-invokes
  you on completion — polling it is pure waste). Use this loop only for state nothing will notify you of.

## how to actually wait (no bash sleep — c19)

- In Claude Code: use the loop/scheduling mechanism (a `ScheduleWakeup` at `delaySeconds ≥ 600`, or
  `/loop` dynamic mode) — the runtime re-invokes you after the delay. One check per wake.
- For PR/CI specifically, prefer `harness ci-track <pr> --watch` (it polls inside the CLI to terminal,
  no agent turns at all) and only fall back to this loop for non-CI state.
- NEVER `while …; do …; sleep <600; done` in Bash — the poll-interval guard (c19) blocks sub-30-min
  hand-rolled loops; this runbook is the sanctioned alternative.

## stop conditions (don't poll forever)

- the watched work reached a terminal state (all lanes landed · CI GREEN/RED · queue drained), or
- it's genuinely blocked on a decision only the user can make (then surface it — don't keep waking), or
- the user said stop.

State each cycle honestly: what you checked, what arrived, the next wake delay + why (one line).
