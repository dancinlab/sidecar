---
name: micro-exp
description: Manifest-driven micro-experiment sweep orchestrator — parse manifest → rent pods (≤budget) → copy inputs → run → 🛰️ Monitor (pw.x|ph.x alive-check) → on JOB DONE harvest+down + dispatch parse agent → atlas register on 🟢 (generic verify-delegation, fold direct to embedded.gen.hexa) → aggregate ledger at `exports/sweep/<batch>/`. The inverse of "1 big run" — N small verify-able experiments in parallel. Triggers — "/micro-exp <manifest>", "sweep this manifest", "스윕 던져", "수십개 동시", "micro experiment fan-out", "micro 실험 떼", "verify-driven sweep".
allowed-tools: Agent, Bash, Read, Monitor
---

@D micro-exp := "manifest-driven verify-able experiment sweep — pod budget · monitor closed loop · atlas auto-fold" :: skill
  do   = "parse `<manifest>.yaml` · stage inputs per candidate · `hexa cloud rent` ≤N concurrent (manifest `budget.pod_concurrent_max`) · `copy-to` inputs+pseudo · `nohup` run · 🛰️ Monitor arm with FIXED `pw.x|ph.x` alive-check (per @D g57) · JOB DONE → auto harvest+down · dispatch parse `Agent` (manifest `parser_template`) · on 🟢 `/atlas register --from-verify` (generic delegation, folds direct to embedded.gen.hexa per #846/#859) · aggregate `exports/sweep/<batch>/ledger.json` · honest FALSIFIED as CLOSED-negative · queue overflow when wave full"
  dont = "exceed `budget` silently · skip FALSIFIED (it is a CLOSED negative · g_micro_exp_honest_sweep) · serialize when parallel ≤budget (g55) · raw `ssh`/`vastai` (use `hexa cloud` per g8) · drop `SAVE_POD=1` on Monitor arm (per g57) · let aggregate ledger drift from atlas state · cherry-pick passes only · launch without budget gate"

# Five-stage execution (mirrors /cycle's runbook):
#   1. Parse + validate manifest (field-by-field; fail-fast on missing required)
#   2. Pre-flight: `hexa cloud list` current pods + remaining wave budget; per-candidate cost/feasibility check
#   3. Plan table: `| # | candidate_id | inputs | parser | est_$/hr | wave |`
#   4. Dispatch (per candidate in wave 1): rent → copy-to → nohup → Monitor (SAVE_POD=1) →
#      on JOB DONE: harvest+down + Agent(parse) → /atlas register on 🟢
#   5. Aggregate: write/update `exports/sweep/<batch>/ledger.json`; auto-queue next wave OR exit with continuation

# Manifest schema (YAML — see examples/h3x-sample.yaml):
#   batch_id: <stable-slug>             # used in exports/sweep/<batch_id>/
#   host_class: vast-gpu | runpod-gpu   # default vast-gpu
#   budget:
#     pod_concurrent_max: <int>         # required (g_sweep_budget_cap)
#     usd_max_per_week: <float>         # optional but recommended
#   candidates:
#     - id: <stable-slug>
#       kind: <classifier>              # e.g. dft-elph, sscha, ml-pred
#       inputs_dir: <abs or ~/...>      # holds scf.in/ph.in/run.sh/...
#       pseudo_dir: <abs or ~/...>      # UPF files (or null for non-DFT kinds)
#       parser_template: <slug>         # the parse-agent template id (e.g. rtsc-h3x-elph)
#       structure_hint: <str>           # optional, for ledger annotation

# Honest constraints (per the four commons @D additions proposed in INBOX 2026-05-25T22:00Z):
#   g_micro_exp_honest_sweep — every candidate reaches verify tier; FALSIFIED is CLOSED-negative, not skipped
#   g_sweep_budget_cap       — manifest declares budget; halt on breach
#   g_sweep_aggregation      — exports/sweep/<batch>/ledger.json is the typed surface
#   g_sweep_pod_vs_agent_cap — pod_concurrent_max (manifest) ≠ parallel-agent-cap (≤3 Agent tool)

# Distinct from siblings:
#   /cycle       — milestone-driven loop over active domain's open `- [ ]` (self-generating)
#   /all-bg-go   — reactive fan-out of PRIOR-turn branches (one-shot)
#   /micro-exp   — manifest-driven sweep over a candidate matrix (config-driven)
