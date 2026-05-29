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
