---
name: micro-exp
description: Context-driven micro-experiment sweep orchestrator (domain-agnostic). Enumerate sweep candidates from the conversation/active-domain (no manifest file) → Stage 1.5 per-candidate infra existence check (HALT to /cycle-bg when missing) → rent pods (≤budget) → copy inputs → run → Monitor (kind-appropriate alive-check) → on JOB DONE harvest+down + dispatch parse Agent → atlas register on green for closed-form-atom-shaped kinds (skip for observation-only kinds) → aggregate ledger at `exports/sweep/<batch>/`. The inverse of one-big-run — N small verify-able experiments in parallel. Kind is ABSTRACT — materials wall · LLM bench · web smoke · build bench are all examples among many. Triggers — "/micro-exp", "/micro-exp <scope>", "sweep these", "스윕 던져", "수십개 동시", "micro experiment fan-out", "micro 실험 떼", "verify-driven sweep", "build then fire", "infra missing".
allowed-tools: Agent, Bash, Read, Monitor
---

@D micro-exp := "context-driven verify-able experiment sweep — domain-agnostic · self-enumerate · infra existence gate · pod budget · monitor closed loop · atlas auto-fold for closed-form kinds" :: skill
  do   = "self-enumerate sweep candidates from the conversation / active domain (bare = current context · `$ARGUMENTS` = scope filter) · infer per-candidate {id · kind · inputs · parser} from domain convention (kind-abstract; materials/LLM-bench/web/build are examples among many) · **Stage 1.5 infra existence check** per candidate — verify the four generic prereqs <runnable> · <inputs> · <parser> · <workdir>; on ANY missing prereq HALT with `🛑 N/M candidates missing dispatch infrastructure — /cycle-bg <active-domain> required first` · declare a pod/usd or local_hours budget before dispatch · `hexa cloud rent` ≤N concurrent (rented-pod path) OR `pool on <host>` (local-pool path) · run · Monitor arm with kind-appropriate alive-check pattern (per @D g57) · completion → auto harvest+down · dispatch parse `Agent` · on closed-form-atom-shaped kinds `/atlas register --from-verify` (generic delegation, folds direct to embedded.gen.hexa); on observation-only kinds skip atlas, persist verbatim verdict to `.verdicts/<slug>/<id>.txt` · aggregate `exports/sweep/<batch>/ledger.json` · honest FALSIFIED as CLOSED-negative · queue overflow when wave full"
  dont = "require a manifest file (enumerate from context like /cycle does) · skip Stage 1.5 to keep the sweep running (build phase MUST precede fire phase — `/cycle-bg <domain>` builds the infra) · assume the kind is materials/DFT/SSCHA (kind is ABSTRACT — never hard-code domain-specific monitor patterns / inputs / parsers as the default) · exceed budget silently · skip FALSIFIED (it is a CLOSED negative · g63) · serialize when parallel ≤budget · raw `ssh`/`vastai` (use `hexa cloud` per g8) · drop `SAVE_POD=1` on Monitor arm (per g57) · let aggregate ledger drift from atlas state · fabricate candidates with no context signal (stop with steer-options instead) · launch without a budget gate"

@D local_pool_adapter := "local-pool sweep mode — pool host ($0) sweep when the kind is observation-only / not closed-form-atom-registrable (domain-agnostic — works on ANY kind with <runnable> + <parser>)" :: skill [required active]
  do   = "before the no-signal fallback, check the active domain for a LOCAL-POOL-VIABLE matrix: (a) `pool list` shows at least one ON host suitable for the candidate `kind` (one example among many: `ubu-2` for GPU walls, `mini` for arm64 macOS builds, any pool host for an LLM-bench harness, the dev box for a web smoke), (b) the candidate `kind` is observation-only — wall-measurement / structural-oracle / build-bench / LLM-bench number / web-endpoint-check / any kind whose verdict is an observed number (NOT a closed-form-atom-registrable identity). When BOTH hold, switch to local-pool mode: replace `hexa cloud rent` with `pool on <host>` dispatch (or direct `ssh <host>`), skip `cloud copy-to/copy-from` in favor of `scp` to the same host, keep the monitor + parse-agent + ledger pipeline, SKIP the `/atlas register --from-verify` step (observed numbers aren't atlas atoms), and persist verbatim stdout to `.verdicts/<slug>/<id>.txt` only. Budget cap becomes `local_hours_max` instead of `usd_max_per_week`."
  dont = "force-use local-pool when the matrix IS closed-form-atom-registrable (pod-rent + register is the correct path) · run timed perf measurements on a busy local host (contention) — gate by host load · expand the no-signal fallback to silently fabricate candidates just because a local host is ON (the candidate matrix must still come from context) · skip the structured `pool on` dispatch in favor of raw ssh (per g8) · assume a specific kind shape (LLM bench · web smoke · materials wall · build bench are all examples among many — the only contract is <runnable> + <parser>)"

@D decision_tree := "/cycle-bg ↔ /micro-exp build vs fire phase decision tree (mirrored in skills/cycle/SKILL.md · domain-agnostic)" :: skill [required active]
  do   = "before dispatching, walk the tree: (NO matrix) → /kick (discovery first) · (matrix exists AND ALL candidates infra-ready) → /micro-exp (FIRE phase only) · (matrix exists AND some/all candidates missing infra) → /cycle-bg <domain> (BUILD phase — each worktree agent writes its candidate's dispatch infra), then /micro-exp once infra is M/M ready. Stage 1.5 auto-enforces the gate: missing infra HALTS with the build-first steer · domain-agnostic phrasing (no kind/domain assumption)"
  dont = "fire /micro-exp on candidates with missing infra (Stage 1.5 halts this with a steer) · domain doc that says 'default = /micro-exp' without an infra precondition · skip the build phase by hand-fabricating sparse infra under the spec model assumption (silent-skip failure mode)"

# Stage execution (mirrors /cycle's runbook — context-driven, no manifest file):
#   1.   Next-list (self-enumerate) — read the conversation + active domain for a candidate matrix; `$ARGUMENTS` scopes it. No signal → stop with steer-options (don't fabricate).
#   1.5. Infra existence check — per-candidate verify <runnable> · <inputs> · <parser> · <workdir>; on miss HALT with /cycle-bg steer (build before fire).
#   2.   Pre-flight: `hexa cloud list` current pods + remaining wave budget; per-candidate cost/feasibility check
#   3.   Plan table: `| # | candidate_id | kind | inputs | parser | est_$/hr | wave |`
#   4.   Dispatch (per candidate in wave 1): rent → copy-to → nohup → Monitor (SAVE_POD=1) →
#        on JOB DONE: harvest+down + Agent(parse) → /atlas register on closed-form-atom-shaped kinds
#   5.   Aggregate: write/update `exports/sweep/<batch>/ledger.json`; auto-queue next wave OR exit with continuation

# Candidate descriptor (kind-abstract; inferred from context — NOT read from a file):
#   id              # stable slug (one example among many: `h3sb` materials · `niah-128k` LLM bench · `checkout-flow` web smoke)
#   kind            # classifier inferred from domain (examples — materials: dft-elph/sscha · LLM: harness-eval/wall-token-rate · web: smoke-endpoint · build: wall-build)
#   inputs_dir      # per domain convention (whatever the kind needs at its declared input path)
#   <extra-dirs>    # kind-specific (one example: DFT-shaped kinds carry pseudo_dir UPF; LLM-bench kinds carry a dataset path; web kinds carry an endpoint URL)
#   parser_template # output → verdict mapper inferred from kind (parser · score fn · log grep · structural oracle)
#   batch_id        # auto-derived from active domain + date (exports/sweep/<batch_id>/)
#   budget          # pod_concurrent_max + usd_max_per_week (rented-pod) OR local_hours_max (local-pool) — declared before dispatch

# Honest constraints (commons @D g63-g66):
#   g63 micro-exp honest sweep — every candidate reaches verify tier; FALSIFIED is CLOSED-negative, not skipped
#   g64 sweep budget cap       — declare pod/usd budget before dispatch; halt on breach
#   g65 sweep aggregation      — exports/sweep/<batch>/ledger.json is the typed surface
#   g66 sweep pod-cap ≠ agent-cap — pod_concurrent_max (rent budget) ≠ parallel-agent-cap (≤3 Agent tool)

# Distinct from siblings:
#   /cycle       — milestone-driven loop over active domain's open `- [ ]` (self-generating)
#   /all-bg-go   — reactive fan-out of PRIOR-turn branches (one-shot)
#   /micro-exp   — context-driven sweep over a candidate matrix (bare = context · arg = scope)
