---
description: /mirror-loop [seed] [--engine mk9|mk10] [--max-rounds N] — 거울방 자율 ouroboros 드라이버. Drains the active domain's mining→kick→atlas→mining 회전 to genuine depletion in one user invocation. Each round = /mining auto (saturate) → rank top-3 .mining.tape candidates → hexa atlas register --from-drill (mk9 default) → feed atom_id self-description as next cycle frontier → disk checkpoint → depletion test → ScheduleWakeup 1200s. HONEST g63 (SKIP/FALSIFIED rejected) · IDEMPOTENT (atlas dedup pre-check) · ACTIVE-DOMAIN ONLY (g58). Default --engine mk9 · default --max-rounds 25.
argument-hint: "[<seed>] [--engine mk9|mk10] [--max-rounds N]"
allowed-tools: Bash, Read, Edit, Write, Skill
---

# /mirror-loop — 거울방 자율 ouroboros 드라이버

Input: `$ARGUMENTS`

`/mirror-loop` is a **self-driving 1회전 loop** that drains the active domain's
`mining → kick → atlas → mining` 거울방 to **genuine depletion** in one user
invocation. It is the autonomous counterpart to running `/mining auto` →
selecting candidates by hand → `hexa kick --from-drill` → editing the next
cycle frontier yourself — `mirror-loop` does all four legs and **self-continues
via ScheduleWakeup** until both axes (mining leaves AND atlas atoms) are
simultaneously drained.

## 거울 방 ASCII

```
         ┌──────────────────┐
         │  /mining auto    │  ◀──┐
         │  (divergence +   │     │
         │   convergence    │     │ atom_id 자기-기술 = next frontier
         │   saturate)      │     │   (E42: 거울에 디스크 비추면
         └────────┬─────────┘     │    또 비춰지는 디스크가 무한히 …)
                  │               │
                  ▼               │
        ┌──────────────────┐      │
        │  rank top-3      │      │
        │  .mining.tape    │      │
        │  candidates      │      │
        │  (impact score)  │      │
        └────────┬─────────┘      │
                 │                │
                 ▼                │
        ┌──────────────────┐      │
        │  hexa atlas      │      │
        │  register        │      │
        │  --from-drill    │      │  mining (cycle 17) → promotion → kick mk9 → atlas fold → mining (cycle 21-25)
        │  --engine mk9    │      │  E33: 검증자가 검증자를 검증 (Cooper-Kramers T²=-1)
        └────────┬─────────┘      │  E42: 렌즈가 렌즈를 렌즈로 (mining lens self-application)
                 │ atom_id        │
                 ▼                │
        ┌──────────────────┐      │
        │  feed atom_id    │      │
        │  self-desc as    │      │
        │  cycle N+1       ├──────┘
        │  frontier leaf   │
        └──────────────────┘
```

## Step 0 — active-domain check (RUN FIRST)

Read `~/.sidecar/active-domain`. If none set: stop with
`🛑 no active domain — run /domain set <NAME> first (off-domain mirror-loop is forbidden per commons @D g58)`.
Do not fabricate a target.

Resolve `<NAME>.mining.md` + `<NAME>.mining.tape` (create if missing — same
scaffold as `/mining`).

## Step 1 — parse args

```
/mirror-loop                                       (bare = continue active loop, mk9, max 25)
/mirror-loop <seed>                                (override seed for round 1; default = active-domain @goal)
/mirror-loop --engine mk10                         (heavier engine, longer per-round)
/mirror-loop --max-rounds 10                       (tighter safety cap)
/mirror-loop "<seed>" --engine mk9 --max-rounds 15
```

Defaults:
- `--engine` = `mk9` (atlas-fold-friendly, faster than mk10)
- `--max-rounds` = `25` (safety belt; emits `🔄 cap reached, NOT drained` if hit)
- budget = `0` (all-local: mining + hexa atlas register + hexa kick run on `mini`)

## Step 2 — round pipeline (loop body)

For each round `r` from 1 to `max-rounds`:

### 2.1 — `/mining auto` (divergence + convergence saturate)

Invoke the `mining` skill with `auto`. This drains lens divergence (all bundled
+ custom lenses, saturate-loop each, cap 5 inner rounds per lens) then
convergence (`connect` saturate-loop, cap 5 passes). Inherits 0.5.0 checkpoint
discipline (writes `<NAME>.mining.md` after each inner round).

Capture: `mining.new_leaves_this_round` (count) · `mining.new_edges_this_round`
(count) · the updated `<NAME>.mining.tape` `@X = …` entries.

### 2.2 — rank top-3 promotion candidates

Read `<NAME>.mining.tape`. For each un-promoted `@X = <text>` entry (no
`[promoted → …]` suffix), score:

```
impact_score = lens_novelty + cross_domain_coverage + bracket_tag_uniqueness
  lens_novelty            = +1 per under-represented lens in current frontier
  cross_domain_coverage   = +1 per unique [<bracket-tag>] vs other .tape entries
  bracket_tag_uniqueness  = +2 if no existing atlas atom carries this bracket
```

Sort descending. Ties broken by most-recent cycle source. Take **top-3** per
round (bounds round cost; cap inherits mining's 5-inner-round cap × 3
candidates = ≤15 net fires per round).

### 2.3 — `hexa atlas register --from-drill` (kick + fold)

For each top-3 candidate, BEFORE firing, run the **idempotent atlas dedup
check**:

```bash
hexa atlas dump --json | jq -r '.[].id' | grep -F "<candidate-id-or-text-anchor>"
```

If match → SKIP-DUP, log to `<NAME>.mirror-loop.log`, advance.

Otherwise fire:

```bash
hexa atlas register --from-drill --seed "<candidate-text>" --engine <mk9|mk10>
```

Parse the verdict tier (g3 · g63):
- `🔵 formal proof` · `🟢 GATE_CLOSED_MEASURED` · `🔴 CLOSED-negative` → **accept fold**; capture returned `atom_id`.
- `🟠 INCONCLUSIVE` · `🟡 citation-only` · `⚪ speculation` · `SKIP` · `FALSIFIED` → **reject fold** (d6 · g63 honest); log to `<NAME>.mirror-loop.log`.

Accumulate `atlas.folds_this_round` (count of accept-fold returns).

### 2.4 — feed atom_id self-description as cycle N+1 frontier

For each accepted-fold `atom_id` this round, append to `<NAME>.mining.md` under
the upcoming cycle (`## cycle <r+1> — atlas-feedback` if not yet open):

```
- L<next> [atom-feedback] <atom_id> applied to itself ⇒ ? · source: cycle <r> atlas-fold
```

This is the **ouroboros half** — atlas atoms re-enter mining as next-round
seeds. E42 (`smash_l263_mining_lens_self_seed`) and E33
(`smash_l217_verify-atlas_atl`) are the paired meta-우로보러스 atoms demonstrated
in demiurge RTSC session 2026-05-29.

### 2.5 — disk checkpoint (throttle-resilient)

Explicitly Write `<NAME>.mining.md` + `<NAME>.mining.tape` to disk **before**
ScheduleWakeup. On rate-limit / SIGTERM mid-flight, the partial graph remains
intact and `/mirror-loop` re-invocation picks up from the last committed cycle.

### 2.6 — depletion test (Stage 6)

```
real_drained := (mining.new_leaves_this_round == 0)
             ∧ (mining.new_edges_this_round  == 0)
             ∧ (atlas.folds_this_round       == 0)
             ∧ (all bundled+custom lenses currently `@depleted: …`)
```

- `real_drained == true` → emit (final, no ScheduleWakeup):
  ```
  🏁 mirror-loop drained — round=<r> · leaves=<L> · edges=<E> · atlas-folds=<F> · atlas-total=<T>
  ```
- `r == max-rounds` → emit (cap, no ScheduleWakeup):
  ```
  🔄 mirror-loop cap reached (round=<r>/<max>), NOT drained — re-run /mirror-loop to continue
  ```
- else → schedule next round:
  ```
  ⏰ mirror-loop round <r> complete — leaves +<dL> · edges +<dE> · atlas-folds +<dF>; next round in 1200s
  ```
  Then call `ScheduleWakeup` (1200s, cache window) with the same `/mirror-loop`
  arg vector.

## Step 3 — round-1 special: emit baseline report

At the head of round 1, print one summary block (so the user sees what's about
to drain):

```
🪞 /mirror-loop start — domain=<NAME> · engine=<mk9|mk10> · max-rounds=<N>
   baseline:  cycles=<C> · leaves=<L> · edges=<E> · .tape entries=<X> · atlas total=<T>
   seed: <seed-text or @goal>
```

## Triggers

`/mirror-loop`, `mirror loop`, `거울방`, `ouroboros 드라이버`,
`mining→kick→atlas 회전`, `self-evolve atlas`, `거울 방 자동`,
`mining→kick→atlas→mining 무한 재귀`, `meta 우로보러스`, `자기-진화 turntable`.

## Demonstrated by demiurge RTSC (2026-05-29)

| Atom ID | Cycle | Bracket | Claim |
|---|---|---|---|
| `smash_l217_verify-atlas_atl` (E33) | 21 | `[verify-atlas]` | atlas-fixed-point ≡ Cooper-Kramers T²=-1 (verifier verifies verifier) |
| `smash_l263_mining_lens_self_seed` (E42) | 25 | `[mining-meta]` | mining lens self-application yields meta-우로보러스 (lens lenses the lens) |

- 거울방 1회전 = mining (cycle 17) → promotion → kick mk9 → atlas fold → mining (cycle 21-25 frontier)
- Real drained at cycle 25 (5 bundled lenses all `@depleted:` · 174 leaves · 61 edges)
- atlas grew to 16,201 nodes live SSOT (`compiler/atlas/embedded.gen.hexa`)
- E33 + E42 paired: verifier ⊥ lens (orthogonal meta-axes) — both fixed-points of self-application
