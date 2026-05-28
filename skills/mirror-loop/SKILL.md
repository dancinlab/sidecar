---
name: mirror-loop
description: /mirror-loop [seed] [--engine mk9|mk10] [--max-rounds N] — 거울방 자율 ouroboros 드라이버. Drains the active domain's mining→kick→atlas→mining 회전 to genuine depletion in one invocation. Each round = (1) /mining auto on active domain (lens divergence + connect convergence saturate), (2) rank top-3 promotion candidates from <NAME>.mining.tape (impact = lens-novelty + cross-domain coverage + bracket-tag uniqueness), (3) hexa atlas register --from-drill --seed "<text>" [--engine mk9|mk10] on each (mk9 default · mk10 opt-in), (4) feed newly-folded atom_id self-descriptions into mining.md as cycle N+1 frontier, (5) disk checkpoint per round (throttle-resilient), (6) depletion test (0 new leaf AND 0 new atom = real drained) — else ScheduleWakeup heartbeat (long 1200s, cache window). HONEST g63 — SKIP / FALSIFIED rejected. IDEMPOTENT — atlas dump --json | jq pre-check skips already-folded atom_id. ACTIVE-DOMAIN ONLY (g58). Demonstrated by demiurge RTSC 2026-05-29 — E33 (smash_l217_verify-atlas_atl) + E42 (smash_l263_mining_lens_self_seed) paired meta-우로보러스 · atlas 16,201 nodes live SSOT · cycle 25 real-drained (5 lens all saturate · 174 leaves · 61 edges). Triggers — '/mirror-loop', '거울방', 'ouroboros 드라이버', 'mining→kick→atlas 회전', 'self-evolve atlas'.
allowed-tools: Bash, Read, Edit, Write, Skill
---

@D mirror_loop := "거울방 1회전 자동 (mining → kick → atlas → mining) · 고갈시까지 self-continue" :: skill
  do   = "active-domain only (g58) — `/mirror-loop` reads ~/.sidecar/active-domain · refuse off-domain"
  do   = "each round in strict order: (1) /mining auto saturate-loop (lens divergence + connect convergence) · (2) rank top-3 .mining.tape promotion candidates by impact score · (3) hexa atlas register --from-drill --seed <text> [--engine mk9|mk10] · (4) feed atom_id self-description back as cycle N+1 frontier · (5) disk checkpoint .mining.md + .mining.tape · (6) depletion test (0 new leaf AND 0 new atom) → real drained terminate · else ScheduleWakeup 1200s next round"
  do   = "impact rank score = lens-novelty + cross-domain coverage + bracket-tag uniqueness (top-3 per round)"
  do   = "default --engine mk9 · default --max-rounds 25 · explicit cap-25 emits `🔄 cap reached, NOT drained — re-run /mirror-loop` (preserve checkpoint state)"
  do   = "drill verdict tier check (g63 · d6) — verdict ∈ {🔵 formal · 🟢 GATE_CLOSED · 🔴 CLOSED-negative} accepted as fold · 🟠 INCONCLUSIVE / 🟡 citation-only / ⚪ speculation / SKIP / FALSIFIED rejected (no fold · log in .mirror-loop.log)"
  do   = "idempotent pre-fire — `hexa atlas dump --json | jq '.[].id' | grep <candidate-id>` SKIPS already-folded atom (no duplicate fire · log SKIP-DUP)"
  dont = "off-domain mirror-loop (g58 · refuse + steer-options) · skip the active-domain pointer read at Step 0"
  dont = "fold a SKIP / FALSIFIED / 🟠 / 🟡 / ⚪ drill verdict (d6 honest · g63 honest sweep)"
  dont = "fire kick on the same seed twice without atlas-dedup check (waste $ + atlas noise)"
  dont = "checkpoint at pipeline end only (mining 0.5.0 — disk write AFTER EACH round so rate-limit / SIGTERM mid-flight preserves state) · skip the round-N disk write before ScheduleWakeup"
  dont = "declare drained without BOTH conditions (0 new leaf AND 0 new atom) — single-axis exhaustion ≠ drained"
  dont = "ScheduleWakeup at < 1200s interval (heartbeat too tight · throttle-risk) · stack > 1 wakeup per invocation"
  dont = "expand --max-rounds without user explicit override (cap-25 is the safety belt)"

@D candidate_rank := "promotion candidate rank from <NAME>.mining.tape — impact score for top-3 per round" :: skill [required active]
  do   = "score each `@X = <text>` entry by: (a) lens-novelty (under-represented lens in current frontier · +1 per lens-gap), (b) cross-domain coverage (unique [<bracket-tag>] across .tape · +1 per new bracket), (c) bracket-tag uniqueness (no existing atom carries this bracket in atlas · +2)"
  do   = "rank descending · ties broken by most-recent cycle source · take top-3 per round (≤3 fires per round bounds round cost)"
  dont = "fire all candidates (cost overrun · atlas noise) · re-rank an already-folded entry (atlas-dedup must SKIP it first)"

@D atom_feedback := "newly-folded atom_id becomes cycle N+1 frontier seed (the ouroboros half)" :: skill [required active]
  do   = "for each PASS-fold this round (atom_id returned by `hexa atlas register --from-drill`), append a new leaf to .mining.md cycle N+1 with bracket [atom-feedback] and seed text = `<atom-id> applied to itself ⇒ ?` (ouroboros lens shape)"
  do   = "this is the mining→kick→atlas→mining closure half — atlas atoms re-enter mining as next-round seeds, forming the meta-우로보러스 demonstrated in demiurge RTSC E33+E42"
  dont = "feed a SKIP / FALSIFIED atom back (it never folded · no atom_id to feed) · feed an already-fed atom (idempotent · check atom_id presence in earlier cycle leaves first)"

@D depletion_real := "real-drained = 0 new leaf AND 0 new atom in the round (single axis ≠ drained)" :: skill [required active]
  do   = "Stage-6 depletion test runs at round tail: (a) mining `@depleted: <all lenses>` AND 0 new leaves this round, (b) Phase-B fired ≥1 candidate but 0 fold-pass returned (all SKIP / FALSIFIED / dedup-skip). If BOTH (a) AND (b) → emit `🏁 mirror-loop drained — round=<N> · leaves=<L> · atlas-folds=<F> · atlas total=<T>` and STOP (no ScheduleWakeup)"
  do   = "else schedule next round — ScheduleWakeup 1200s · cache window · long interval throttle-safe"
  dont = "declare drained off (a) alone (mining might be saturated but a strong promotion candidate is still un-fired · the kick→atlas half could still grow the graph) · declare drained off (b) alone (atlas dedup-only round doesn't mean mining is done · new lens may still surface leaves)"
