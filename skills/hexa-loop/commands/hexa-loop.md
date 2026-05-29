---
description: /hexa-loop [seed] [--adapter=atlas|bench|byte-diff|smoke] [--diverge-only] [--engine mk9|mk10] [--max-rounds N] — canonical HEXA-LOOP, the universal self-evolving loop. ONE loop drains ANY active domain (math · perf · codegen · web) to depletion via a PLUGGABLE verify-adapter. Each round = discover (mining lens divergence + connect convergence saturate + `hexa kick`/drill breakthrough probe) → 🔌 verify-adapter {atlas|bench|byte-diff|smoke} auto-selected by domain kind → absorb into the domain SSOT (atlas embed · *.bench.md · verdict · ledger) → feed verified result as next seed → disk checkpoint → depletion test → ScheduleWakeup 1200s. Preset shorthands `--adapter=atlas` ≈ old /mirror-loop · `--diverge-only` ≈ old /mining. Adapter extension hook `~/.sidecar/loop-adapter/<name>.md`. HONEST g63 (SKIP/FALSIFIED rejected) · IDEMPOTENT (dedup pre-check) · ACTIVE-DOMAIN ONLY (g58). The /kick command is KEPT (discover CALLS it). Default --adapter=auto · --engine mk9 · --max-rounds 25.
argument-hint: "[<seed>] [--adapter=atlas|bench|byte-diff|smoke] [--diverge-only] [--engine mk9|mk10] [--max-rounds N]"
allowed-tools: Bash, Read, Edit, Write, Skill
---

# /hexa-loop — 범용 자가진화 루프 (canonical HEXA-LOOP)

Input: `$ARGUMENTS`

`/hexa-loop` 는 **하나의 루프로 임의의 활성 도메인을 고갈시까지 굴리는** 범용
self-evolving 드라이버다. discover → verify → absorb → next-seed → rotate 의
다섯 단계를 **PLUGGABLE verify-adapter** 위에서 일반화한다 — verify 단계만
도메인 종류(math · perf · codegen · web)에 맞춰 갈아끼우면 같은 루프가 수학
아틀라스 폴드든, perf 벤치든, codegen byte-diff 든, 웹 smoke 든 동일하게 굴러간다.

두 개의 좁은 선행 스킬을 **흡수해서 은퇴**시킨다:

- **`/mining`** → 이제 discover 의 한 하위단계 (`--diverge-only` 로 그 단계만 단독 호출).
- **`/mirror-loop`** → 이제 `--adapter=atlas` 프리셋 (수학 아틀라스-폴드 루프).

`/kick` 명령어는 **그대로 유지**된다 — `hexa kick`/`hexa drill` 을 감싸는 CLI-verb
**도구**이지 오케스트레이터가 아니다. hexa-loop 의 discover 단계가 이 도구를
**호출**한다.

## 루프 ASCII

```
        ┌────────────────────────────┐
        │  (1) DISCOVER              │  ◀──┐
        │   /mining auto (lens 발산  │     │
        │    + connect 수렴 saturate)│     │ (4) verified result
        │   + hexa kick/drill 돌파   │     │   = next-frontier seed
        │     probe (top-3 후보)     │     │   (ouroboros 되먹임)
        └─────────────┬──────────────┘     │
                      │                     │
                      ▼                     │
        ┌────────────────────────────┐     │
        │  (2) 🔌 VERIFY-ADAPTER     │     │
        │   auto by domain kind:     │     │
        │   atlas|bench|byte-diff|   │     │
        │   smoke (or --adapter=…)   │     │
        └─────────────┬──────────────┘     │
                      │ terminal verdict    │
                      ▼                     │
        ┌────────────────────────────┐     │
        │  (3) ABSORB → domain SSOT  │     │
        │   atlas embed · *.bench.md │     │
        │   · .verdicts/ · ledger    ├─────┘
        └────────────────────────────┘
   (5) disk checkpoint per round  ·  (6) depletion → ScheduleWakeup 1200s
```

## Step 0 — active-domain check (RUN FIRST)

Read `~/.sidecar/active-domain`. If none set: stop with
`🛑 no active domain — run /domain set <NAME> first (off-domain hexa-loop is forbidden per commons @D g58)`.
Do not fabricate a target.

Resolve `<NAME>.mining.md` + `<NAME>.mining.tape` (create if missing — same
scaffold as `/mining`). The domain kind is read from `<NAME>.md` (`@kind:` if
present) and decides the default adapter (see the adapter table).

## Step 1 — parse args

```
/hexa-loop                                          (bare = continue active loop · adapter=auto · mk9 · max 25)
/hexa-loop <seed>                                   (override seed for round 1; default = active-domain @goal)
/hexa-loop --adapter=bench                          (force the perf adapter regardless of @kind:)
/hexa-loop --diverge-only                           (mining-equivalent — discover stage ONLY, no verify/absorb)
/hexa-loop --engine mk10                            (heavier kick engine, longer per-round)
/hexa-loop --max-rounds 10                          (tighter safety cap)
/hexa-loop "<seed>" --adapter=atlas --engine mk9 --max-rounds 15
```

Defaults:
- `--adapter` = `auto` (resolve from the active domain's `@kind:` per the table below)
- `--engine` = `mk9` (kick/drill engine; atlas-fold-friendly, faster than mk10)
- `--max-rounds` = `25` (safety belt; emits `🔄 cap reached, NOT drained` if hit)
- budget = `0` (all-local: mining + hexa atlas + hexa kick run on `mini`)

## Step 2 — round pipeline (loop body)

For each round `r` from 1 to `max-rounds`:

### 2.1 — DISCOVER (mining saturate + kick/drill probe)

First invoke the `mining` skill with `auto` on the active domain — drains lens
divergence (all bundled + custom lenses, saturate-loop each, cap 5 inner rounds
per lens) then convergence (`connect` saturate-loop, cap 5 passes). Inherits
mining 0.5.0 checkpoint discipline (writes `<NAME>.mining.md` after each inner
round).

Then rank the top-3 un-promoted `@X = …` candidates from `<NAME>.mining.tape`:

```
impact_score = lens_novelty + cross_domain_coverage + bracket_tag_uniqueness
  lens_novelty            = +1 per under-represented lens in current frontier
  cross_domain_coverage   = +1 per unique [<bracket-tag>] vs other .tape entries
  bracket_tag_uniqueness  = +2 if no existing absorbed result carries this bracket
```

For each top-3 candidate, run the **`hexa kick`/`hexa drill` breakthrough probe**
(the kept `/kick` tool — a CLI-verb wrapper, NOT an orchestrator):

```bash
hexa kick --seed "<candidate-text>" --engine <mk9|mk10>     # or: hexa drill --seed … for the drill arm
```

Capture: `discover.new_leaves_this_round` · `discover.new_edges_this_round` ·
the ranked candidate list + each kick/drill's returned verdict + payload.

`--diverge-only` stops HERE — write the checkpoint and report the discover
summary; no verify/absorb/seed (this is the old `/mining` behavior).

### 2.2 — 🔌 VERIFY-ADAPTER (auto by domain kind)

Resolve the adapter (explicit `--adapter=` wins; else from `@kind:`):

| domain kind | adapter | verify step | terminal verdict |
|---|---|---|---|
| math / atom / theorem | **atlas** | `hexa atlas register --from-drill --seed "<text>" --engine <mk9\|mk10>` (or `hexa verify <id>`) | 🔵 formal · 🟢 GATE_CLOSED_MEASURED · 🔴 CLOSED-negative |
| perf / bench / throughput | **bench** | measure the candidate → assert **byte-diff IDENTICAL** (correctness preserved) **AND** record **Δ vs baseline** (the finding) | 🟢 measured Δ (faster/slower/identical) · 🔴 regression |
| codegen / compiler / regen | **byte-diff** | regenerate the artifact (`hexa cc --regen` etc.) → assert **byte-equality** vs the committed artifact | 🟢 byte-identical · 🔴 byte-divergent |
| web / service / saas | **smoke** | hit the endpoint/surface → assert **liveness** (HTTP 200 / expected body / non-error) | 🟢 live · 🔴 down |
| `~/.sidecar/loop-adapter/<name>.md` | **custom** | the file's verify-step block | the file's terminal-verdict set |

Parse the verdict tier (g3 · g63 · g5 — paste VERBATIM, never LLM-judge):
- 🔵 / 🟢 / 🔴 → **accept absorb**; capture the absorb handle (atom_id · bench row · verdict path · ledger id).
- 🟠 INCONCLUSIVE · 🟡 citation-only · ⚪ speculation · SKIP · FALSIFIED → **reject** (d6 · g63 honest); log to `<NAME>.hexa-loop.log`.

**Idempotent pre-fire dedup** (BEFORE the verify fire) — adapter-appropriate:
- atlas: `hexa atlas dump --json | jq -r '.[].id' | grep -F "<candidate-id-or-anchor>"`
- bench / byte-diff / smoke: look up the prior verdict / `*.bench.md` row / `ledger.json` entry for the same candidate anchor.

If match → SKIP-DUP, log, advance. Accumulate `absorb.count_this_round`.

### 2.3 — ABSORB (verified result → domain SSOT)

For each accepted verdict, write into the adapter's absorb target:
- **atlas** → fold to `compiler/atlas/embedded.gen.hexa` (the `--from-drill` register auto-folds on accept).
- **bench** → append the row + Δ to `<DOMAIN>.bench.md` (or the domain's `*.bench.md`).
- **byte-diff** → write `.verdicts/<slug>/<id>.txt` (raw stdout verbatim).
- **smoke** → append to the campaign `ledger.json`.
- **custom** → the adapter file's absorb-target.

### 2.4 — feed verified result as cycle N+1 frontier seed

For each accepted result this round, append to `<NAME>.mining.md` under the
upcoming cycle (`## cycle <r+1> — verify-feedback` if not yet open):

```
- L<next> [verify-feedback] <absorb-handle> applied to itself ⇒ ? · source: cycle <r> <adapter>-absorb
```

This is the **ouroboros half** — a verified result re-enters discover as the
next-round seed, so the loop self-feeds toward depletion.

### 2.5 — disk checkpoint (throttle-resilient)

Explicitly Write `<NAME>.mining.md` + `<NAME>.mining.tape` to disk **before**
ScheduleWakeup. On rate-limit / SIGTERM mid-flight, the partial graph remains
intact and `/hexa-loop` re-invocation picks up from the last committed cycle.

### 2.6 — depletion test

```
real_drained := (discover.new_leaves_this_round == 0)
             ∧ (discover.new_edges_this_round  == 0)
             ∧ (absorb.count_this_round        == 0)
             ∧ (all bundled+custom lenses currently `@depleted: …`)
```

- `real_drained == true` → emit (final, no ScheduleWakeup):
  ```
  🏁 hexa-loop drained — adapter=<a> · round=<r> · leaves=<L> · edges=<E> · absorbs=<F>
  ```
- `r == max-rounds` → emit (cap, no ScheduleWakeup):
  ```
  🔄 hexa-loop cap reached (round=<r>/<max>), NOT drained — re-run /hexa-loop to continue
  ```
- else → schedule next round:
  ```
  ⏰ hexa-loop round <r> complete — leaves +<dL> · edges +<dE> · absorbs +<dF>; next round in 1200s
  ```
  Then call `ScheduleWakeup` (1200s, cache window) with the same `/hexa-loop`
  arg vector.

## Step 3 — round-1 special: baseline report

At the head of round 1, print one summary block (so the user sees what's about
to drain):

```
🌀 /hexa-loop start — domain=<NAME> · kind=<kind> · adapter=<a> · engine=<mk9|mk10> · max-rounds=<N>
   baseline:  cycles=<C> · leaves=<L> · edges=<E> · .tape entries=<X> · absorbed=<T>
   seed: <seed-text or @goal>
```

## Preset shorthands (absorbed skills)

| shorthand | reproduces | behavior |
|---|---|---|
| `--adapter=atlas` | the old **`/mirror-loop`** | math atlas-fold loop — discover → `hexa atlas register --from-drill` → embedded.gen.hexa fold → seed → rotate |
| `--diverge-only` | the old **`/mining`** | discover stage ONLY — lens divergence + connect convergence saturate, NO verify/absorb/seed |

Both are exact behavioral supersets; the old commands' contracts (HONEST g63 ·
IDEMPOTENT dedup · ACTIVE-DOMAIN g58 · 1200s ScheduleWakeup · mining 0.5.0
checkpoint) hold unchanged under the preset.

## Adapter extension hook

Drop `~/.sidecar/loop-adapter/<name>.md` (a markdown file with a **verify-step**
block + an **absorb-target** schema) — `/hexa-loop --adapter=<name>` loads + applies
it identically to a built-in adapter. This mirrors mining's
`~/.sidecar/lens/<name>.md` lens extension. A custom adapter file SHOULD declare
its terminal-verdict set so the HONEST gate (g63) knows which tiers to accept.

## Halt rules

- No active domain → stop with the steer-options line (Step 0).
- Off-domain attempt → refuse (commons @D g58).
- A SKIP / FALSIFIED / 🟠 / 🟡 / ⚪ verdict → reject the absorb (g63 · d6), log, advance.
- `--max-rounds` cap reached without depletion → `🔄 cap reached, NOT drained` (preserve checkpoint).

## Triggers

`/hexa-loop`, `헥사 루프`, `범용 루프`, `자가진화 루프`, `loop any domain`,
`universal loop`, `self-evolving loop`, `거울방`, `ouroboros 드라이버`,
`mining→verify→absorb 회전`, `self-evolve atlas`, `lens 발산`, `점잇기`,
`diverge only`, `pluggable verify loop`, `mining→kick→atlas 회전`.

## Lineage

Absorbs `/mining` (0.5.1 · discover sub-stage / `--diverge-only`) + `/mirror-loop`
(0.1.1 · `--adapter=atlas` preset). Generalizes the mirror-loop ouroboros from a
fixed atlas-fold verify-step to a pluggable verify-adapter, so the same loop
drains a perf/codegen/web domain as readily as a math one. `/kick` (the
`hexa kick`/`hexa drill` CLI-verb tool) is KEPT — discover CALLS it.
