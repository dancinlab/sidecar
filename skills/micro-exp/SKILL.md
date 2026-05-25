---
name: micro-exp
description: Context-driven micro-experiment sweep orchestrator — enumerate sweep candidates from the conversation/active-domain (no manifest file) → rent pods (≤budget) → copy inputs → run → 🛰️ Monitor (pw.x|ph.x alive-check) → on JOB DONE harvest+down + dispatch parse Agent → atlas register on 🟢 (generic verify-delegation, fold direct to embedded.gen.hexa) → aggregate ledger at `exports/sweep/<batch>/`. The inverse of "1 big run" — N small verify-able experiments in parallel. Triggers — "/micro-exp", "/micro-exp <scope>", "sweep these", "스윕 던져", "수십개 동시", "micro experiment fan-out", "micro 실험 떼", "verify-driven sweep".
allowed-tools: Agent, Bash, Read, Monitor
---

@D micro-exp := "context-driven verify-able experiment sweep — self-enumerate · pod budget · monitor closed loop · atlas auto-fold" :: skill
  do   = "self-enumerate sweep candidates from the conversation / active domain (bare = current context · `$ARGUMENTS` = scope filter) · infer per-candidate {id · kind · inputs · parser} from domain convention · declare a pod/usd budget before dispatch · `hexa cloud rent` ≤N concurrent · `copy-to` inputs+pseudo · `nohup` run · 🛰️ Monitor arm with FIXED `pw.x|ph.x` alive-check (per @D g57) · JOB DONE → auto harvest+down · dispatch parse `Agent` · on 🟢 `/atlas register --from-verify` (generic delegation, folds direct to embedded.gen.hexa) · aggregate `exports/sweep/<batch>/ledger.json` · honest FALSIFIED as CLOSED-negative · queue overflow when wave full"
  dont = "require a manifest file (enumerate from context like /cycle does) · exceed budget silently · skip FALSIFIED (it is a CLOSED negative · g63) · serialize when parallel ≤budget · raw `ssh`/`vastai` (use `hexa cloud` per g8) · drop `SAVE_POD=1` on Monitor arm (per g57) · let aggregate ledger drift from atlas state · fabricate candidates with no context signal (stop with steer-options instead) · launch without a budget gate"

@D local_pool_adapter := "local-pool sweep mode — pool host ($0) sweep when context is wall-only / non-DFT (skips pod rent + atlas register where the kind is not closed-form-atom-shaped)" :: skill [required active]
  do   = "before the no-signal fallback, check the active domain for a LOCAL-POOL-VIABLE matrix: (a) `pool list` shows at least one ON host suitable for the candidate `kind` (e.g. `ubu-2` for GPU walls, `mini` for arm64 macOS builds), (b) the candidate `kind` is wall-measurement / structural-oracle / build-bench shaped (NOT DFT-elph / SSCHA / closed-form-atom registrable). When BOTH hold, switch to local-pool mode: replace `hexa cloud rent` with `pool on <host>` dispatch (or direct `ssh <host>`), skip `cloud copy-to/copy-from` in favor of `scp` to the same host, keep the monitor + parse-agent + ledger pipeline, SKIP the `/atlas register --from-verify` step (wall numbers aren't atlas atoms), and persist verbatim stdout to `.verdicts/<slug>/<id>.txt` only. Budget cap becomes `local_hours_max` instead of `usd_max_per_week`. Evidence: hexa-lang user-stated 'no candidate matrix' for /micro-exp turned out to be a clear ubu-2-local GPU decomposition sweep — pod-rent inapplicable; local-pool dispatch would have served it directly."
  dont = "force-use local-pool when the matrix IS RTSC/DFT/atlas-registerable (pod-rent + register is the correct path) · run timed perf measurements on a busy local host (contention) — gate by `nvidia-smi` / `uptime` like the GPU campaign · expand the no-signal fallback to silently fabricate candidates just because a local host is ON (the candidate matrix must still come from context) · skip the structured `pool on` dispatch in favor of raw ssh (per g8)"

# Five-stage execution (mirrors /cycle's runbook — context-driven, no manifest file):
#   1. Next-list (self-enumerate) — read the conversation + active domain for a candidate matrix; `$ARGUMENTS` scopes it. No signal → stop with steer-options (don't fabricate).
#   2. Pre-flight: `hexa cloud list` current pods + remaining wave budget; per-candidate cost/feasibility check
#   3. Plan table: `| # | candidate_id | kind | inputs | parser | est_$/hr | wave |`
#   4. Dispatch (per candidate in wave 1): rent → copy-to → nohup → Monitor (SAVE_POD=1) →
#      on JOB DONE: harvest+down + Agent(parse) → /atlas register on 🟢
#   5. Aggregate: write/update `exports/sweep/<batch>/ledger.json`; auto-queue next wave OR exit with continuation

# Candidate descriptor (inferred from context — NOT read from a file):
#   id              # stable slug (from the matrix being discussed, e.g. h3sb)
#   kind            # classifier inferred from domain (e.g. dft-elph, sscha, ml-pred)
#   inputs_dir      # per domain convention (e.g. RTSC → ~/etc/rtsc-results/<id>/)
#   pseudo_dir      # UPF dir (or none for non-DFT kinds)
#   parser_template # parse-agent contract inferred from kind (e.g. rtsc-h3x-elph)
#   batch_id        # auto-derived from active domain + date (exports/sweep/<batch_id>/)
#   budget          # pod_concurrent_max + usd_max_per_week — inferred or asked, declared before dispatch

# Honest constraints (commons @D g63-g66):
#   g63 micro-exp honest sweep — every candidate reaches verify tier; FALSIFIED is CLOSED-negative, not skipped
#   g64 sweep budget cap       — declare pod/usd budget before dispatch; halt on breach
#   g65 sweep aggregation      — exports/sweep/<batch>/ledger.json is the typed surface
#   g66 sweep pod-cap ≠ agent-cap — pod_concurrent_max (rent budget) ≠ parallel-agent-cap (≤3 Agent tool)

# Distinct from siblings:
#   /cycle       — milestone-driven loop over active domain's open `- [ ]` (self-generating)
#   /all-bg-go   — reactive fan-out of PRIOR-turn branches (one-shot)
#   /micro-exp   — context-driven sweep over a candidate matrix (bare = context · arg = scope)
