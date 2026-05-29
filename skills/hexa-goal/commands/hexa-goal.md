---
description: /hexa-goal [<goal>] [--adapter=atlas|bench|byte-diff|smoke] [--engine mk9|mk10] [--max-rounds N] — the CONVERGENT sister of /hexa-loop. hexa-loop drains an active domain to DEPLETION (divergent · lens divergence); hexa-goal CLIMBS toward a verifiable GOAL PREDICATE and terminates the instant the predicate is TRUE (convergent · goal-directed best-first). The verify-adapter mechanism + every guard are reused VERBATIM from hexa-loop; only TWO things differ — (a) DISCOVER is GAP-ANALYSIS BEST-FIRST (goal−current gap → the single move that shrinks it most) instead of lens divergence, and (b) TERMINATION is GOAL-MET (the goal predicate is TRUE) instead of depletion. Goal predicate reuses sbs-style `assert:` contracts (grep <pat> · file <path> · verdict <slug>/<id>); default (bare) = ALL of the active domain's `- [ ]` milestones checked. Each round = gap-analysis best-first → 🔌 verify-adapter {atlas|bench|byte-diff|smoke} auto by domain kind → absorb into the domain SSOT → re-measure progress vs goal → disk checkpoint → goal-met test → ScheduleWakeup 1200s. HONEST g63 (SKIP/FALSIFIED rejected) · IDEMPOTENT (dedup pre-check) · ACTIVE-DOMAIN ONLY (g58). Adapter extension hook `~/.sidecar/loop-adapter/<name>.md`. Default --adapter=auto · --engine mk9 · --max-rounds 25.
argument-hint: "[<goal>] [--adapter=atlas|bench|byte-diff|smoke] [--engine mk9|mk10] [--max-rounds N]"
allowed-tools: Bash, Read, Edit, Write, Skill
---

# /hexa-goal — 수렴형 goal-directed 루프 (convergent sister of HEXA-LOOP)

Input: `$ARGUMENTS`

`/hexa-goal` 는 **하나의 루프로 활성 도메인을 검증 가능한 목표(goal predicate)에
도달할 때까지 등반시키는** 수렴형 드라이버다. `/hexa-loop` 의 자매로서
verify-adapter·HONEST 가드·체크포인트·1200s wakeup 등 메커니즘은 **그대로 재사용**하고,
바뀌는 것은 단 두 가지다:

- **discover 단계** — lens 발산(divergence) 대신 **gap 분석 best-first**: 목표와 현재
  상태의 격차를 산출하고, 그 격차를 **가장 많이 줄이는 한 수**만 고른다.
- **종료조건** — 고갈(depletion) 대신 **goal predicate 충족**(assert: 계약이 TRUE).

요컨대 hexa-loop 은 우물을 **마를 때까지** 퍼내는 발산형, hexa-goal 은 정상을
**찍을 때까지** 오르는 수렴형이다. 메커니즘은 같고 방향만 반대다.

## 루프 ASCII (수렴형 — current-state → goal summit)

```
                                        🏁  GOAL  (predicate TRUE)
                                       ╱
                          ┌───────────╱──────────┐
                          │ (6) GOAL-MET test     │  predicate TRUE → 🏁 terminate
                          └───────────┬───────────┘
                                      ▲
        ┌────────────────────────────┴┐
        │ (1) GAP-ANALYSIS best-first │  ◀──┐
        │  goal − current = gap;      │     │
        │  pick the SINGLE move that  │     │ (4) re-measured progress
        │  shrinks the gap the most   │     │     = next-round current-state
        └─────────────┬───────────────┘     │     (climb one rung)
                      │                      │
                      ▼                      │
        ┌────────────────────────────┐      │
        │ (2) 🔌 VERIFY-ADAPTER      │      │
        │  auto by domain kind:      │      │
        │  atlas|bench|byte-diff|    │      │
        │  smoke (or --adapter=…)    │      │
        └─────────────┬──────────────┘      │
                      │ terminal verdict     │
                      ▼                      │
        ┌────────────────────────────┐      │
        │ (3) ABSORB → domain SSOT   │      │
        │  atlas embed · *.bench.md  ├──────┘
        │  · .verdicts/ · ledger     │
        └────────────────────────────┘
   (5) disk checkpoint per round  ·  else ⏰ ScheduleWakeup 1200s · cap N → 🔄 NOT met
```

## Step 0 — active-domain check (RUN FIRST)

Read `$HOME/.sidecar/active-domain`. If none set: stop with
`🛑 no active domain — run /domain set <NAME> first (off-domain hexa-goal is forbidden per commons @D g58)`.
Do not fabricate a goal target.

An off-domain attempt is refused with the same steer line — the user must
`/domain set <NAME>` (or `/domain init <NAME>`) to pick the climb target.

Read the domain snapshot `<NAME>.md` — the `@goal:` line is the default goal
target, the `- [ ]` / `- [x]` milestones are the default progress metric, and
the `@kind:` line (if present) decides the default verify-adapter.

## Step 1 — parse args

```
/hexa-goal                                          (bare = climb the active domain's @goal · predicate = ALL milestones checked · adapter=auto · mk9 · max-rounds 25)
/hexa-goal "<goal>"                                  (override the goal text for this climb; predicate still = all-milestones unless an assert: contract is given)
/hexa-goal "<goal>" assert:grep "<pat>"              (explicit goal predicate — sbs-style assert: contract; satisfied when grep finds <pat>)
/hexa-goal --adapter=bench                           (force the perf adapter regardless of @kind:)
/hexa-goal --engine mk10                             (heavier kick/probe engine, longer per-round)
/hexa-goal --max-rounds 40                           (raise the finite cap; default 25)
```

Defaults:
- `--adapter` = `auto` (resolve from the active domain's `@kind:` per the table in 2.2)
- `--engine` = `mk9` (probe engine; faster than mk10)
- `--max-rounds` = `25` (a goal-seeking loop carries a FINITE cap — a never-satisfiable predicate must not spin forever; the PRIMARY terminator is goal-met, the cap is the backstop)
- budget = `0` (all-local)

**Goal predicate resolution** (reuse sbs-style `assert:` contracts, plan-lint grammar):
- `assert:grep <pat>` — satisfied when `<pat>` is present (`!pat` = satisfied when ABSENT)
- `assert:file <path>` — satisfied when `<path>` exists
- `assert:verdict <slug>/<id>` — satisfied when `.verdicts/<slug>/<id>.txt` is non-empty
- **default** (no explicit assert) — satisfied when ALL of the active domain's
  `- [ ]` milestones are checked (`done == total` AND `total > 0`).

## Step 2 — round pipeline (loop body)

For each round `r` = 1, 2, … up to `max-rounds`, terminating EARLY the instant
the goal predicate evaluates TRUE (Step 2.6):

### 2.1 — GAP-ANALYSIS best-first (discover)

Compute the **gap** = goal − current:
- milestone-default predicate → gap = the set of still-open `- [ ]` milestones.
- assert-grep / file / verdict predicate → gap = the unmet condition(s).

Enumerate candidate next-moves (one per open milestone / one per unmet sub-condition),
and rank them by **gap-reduction**:

```
gap_reduction = milestones_closed_by_this_move          (default predicate)
              + conditions_satisfied_by_this_move        (assert predicate)
              + downstream_unblock                       (+1 per move this one unblocks)
   tie-break: prefer the cheapest move (smallest blast radius · fewest deps)
```

Select the **SINGLE best-first move** (highest `gap_reduction`). This is the
convergent counterpart to hexa-loop's divergent lens-saturate — NOT an
open-ended saturate-loop of all lenses, but the one move that climbs the most.

Capture: the chosen move + its expected gap-reduction + the candidate ranking.

### 2.2 — 🔌 VERIFY-ADAPTER (auto by domain kind · reused verbatim from hexa-loop)

Resolve the adapter (explicit `--adapter=` wins; else from `@kind:`):

| domain kind | adapter | verify step | terminal verdict |
|---|---|---|---|
| math / atom / theorem | **atlas** | `hexa atlas register --from-drill --seed "<text>" --engine <mk9\|mk10>` (or `hexa verify <id>`) | 🔵 formal · 🟢 GATE_CLOSED_MEASURED · 🔴 CLOSED-negative |
| perf / bench / throughput | **bench** | measure the candidate → assert **byte-diff IDENTICAL** **AND** report **roofline %** (achieved ÷ binding-roof · achieved-peak denominator) **AND** record **Δ vs baseline** | 🟢 measured roofline % + Δ · 🔴 regression |
| codegen / compiler / regen | **byte-diff** | regenerate the artifact (`hexa cc --regen` etc.) → assert **byte-equality** vs the committed artifact | 🟢 byte-identical · 🔴 byte-divergent |
| web / service / saas | **smoke** | hit the endpoint/surface → assert **liveness** (HTTP 200 / expected body / non-error) | 🟢 live · 🔴 down |
| `~/.sidecar/loop-adapter/<name>.md` | **custom** | the file's verify-step block | the file's terminal-verdict set |

Parse the verdict tier (g3 · g63 · g5 — paste VERBATIM, never LLM-judge):
- 🔵 / 🟢 / 🔴 → **accept absorb**; capture the absorb handle (atom_id · bench row · verdict path · ledger id).
- 🟠 INCONCLUSIVE · 🟡 citation-only · ⚪ speculation · SKIP · FALSIFIED → **reject** (d6 · g63 honest); log to `<NAME>.hexa-goal.log`.

**Idempotent pre-fire dedup** (BEFORE the verify fire) — adapter-appropriate:
- atlas: `hexa atlas dump --json | jq -r '.[].id' | grep -F "<candidate-id-or-anchor>"`
- bench / byte-diff / smoke: look up the prior verdict / `*.bench.md` row / `ledger.json` entry for the same anchor.

If match → SKIP-DUP, log, advance.

### 2.3 — ABSORB (verified result → domain SSOT · reused verbatim)

For the accepted verdict, write into the adapter's absorb target:
- **atlas** → fold to `compiler/atlas/embedded.gen.hexa` (the `--from-drill` register auto-folds on accept).
- **bench** → append the row + roofline % + Δ to `<DOMAIN>.bench.md`.
- **byte-diff** → write `.verdicts/<slug>/<id>.txt` (raw stdout verbatim).
- **smoke** → append to the campaign `ledger.json`.
- **custom** → the adapter file's absorb-target.

### 2.4 — RE-MEASURE progress + evaluate the goal predicate

After absorbing, flip the move's milestone (`/domain done <match>`) when the
verdict closed it, then **re-measure**:
- default predicate → recount `done / total` milestones → `progress = done/total`.
- assert predicate → re-evaluate the `grep`/`file`/`verdict` condition.

Record `gap_remaining` (open milestones / unmet conditions) for the goal-met test.

### 2.5 — disk checkpoint (throttle-resilient)

Explicitly Write the progress snapshot + gap state to disk (the `<NAME>.md`
milestone flips + a `<NAME>.hexa-goal.log` round line) **before** ScheduleWakeup.
On rate-limit / SIGTERM mid-flight, the partial climb remains intact and
`/hexa-goal` re-invocation resumes from the last committed round.

### 2.6 — GOAL-MET test (the convergent terminator)

```
goal_met := (the goal predicate evaluates TRUE)
            // default:  done == total  AND  total > 0
            // assert:   the grep/file/verdict condition is satisfied
```

- `goal_met == true` → emit (final, no ScheduleWakeup):
  ```
  🏁 hexa-goal reached — domain=<NAME> · adapter=<a> · round=<r> · goal="<goal>" · progress=100% (<done>/<total>)
  ```
- `r == max-rounds ∧ ¬goal_met` → emit (cap hit — goal NOT met):
  ```
  🔄 hexa-goal cap reached (round=<r>/<max>), goal NOT met — gap=<remaining>; re-run /hexa-goal --max-rounds <N> to continue
  ```
  (preserve the checkpoint; do NOT silently raise the cap.)
- else → schedule next round:
  ```
  ⏰ hexa-goal round <r> — closed <move>, progress <p0>%→<p1>%, gap=<remaining>; next round in 1200s
  ```
  Then call `ScheduleWakeup` (1200s, cache window) with the same `/hexa-goal` arg vector.

## Step 3 — round-1 special: baseline report

At the head of round 1, print one summary block (so the user sees the climb target):

```
🎯 /hexa-goal start — domain=<NAME> · kind=<kind> · adapter=<a> · engine=<mk9|mk10> · max-rounds=<N>
   goal:      "<goal-text or @goal>"
   predicate: <assert:contract or 'all milestones checked'>
   baseline:  progress=<p0>% (<done>/<total>) · gap=<open milestones / unmet conditions>
```

## Adapter extension hook

Drop `~/.sidecar/loop-adapter/<name>.md` (a markdown file with a **verify-step**
block + an **absorb-target** schema) — `/hexa-goal --adapter=<name>` loads + applies
it identically to a built-in adapter, exactly as `/hexa-loop` does. A custom
adapter file SHOULD declare its terminal-verdict set so the HONEST gate (g63)
knows which tiers to accept.

## Halt rules

- No active domain → stop with the steer-options line (Step 0).
- Off-domain attempt → refuse (commons @D g58).
- A SKIP / FALSIFIED / 🟠 / 🟡 / ⚪ verdict → reject the absorb (g63 · d6), log, advance.
- `--max-rounds` cap reached without goal-met → `🔄 cap reached, goal NOT met` (preserve checkpoint; do NOT raise the cap unasked).
- Goal predicate TRUE → `🏁 goal reached` and TERMINATE (the success terminator).

## Triggers

`/hexa-goal`, `헥사 골`, `목표 루프`, `goal-directed loop`, `수렴 루프`,
`goal-seeking loop`, `목표 도달 루프`, `climb to goal`, `converge to goal`,
`gap-analysis loop`.

## Lineage

The CONVERGENT sister of `/hexa-loop` (the divergent universal loop). The
verify-adapter, the HONEST g63 gate, the IDEMPOTENT dedup pre-check, the
ACTIVE-DOMAIN g58 refusal, the per-round disk checkpoint, and the 1200s
ScheduleWakeup rotation are ALL reused verbatim from hexa-loop. Only TWO things
diverge: the DISCOVER stage (gap-analysis best-first, NOT lens divergence) and
the TERMINATION condition (goal-predicate TRUE, NOT depletion). hexa-loop drains
to depletion; hexa-goal converges to a goal.
