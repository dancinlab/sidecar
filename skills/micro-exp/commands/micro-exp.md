---
description: /micro-exp [scope] — context-driven micro-experiment sweep. Self-enumerate sweep candidates from the conversation / active domain (no manifest file) → Stage 1.5 infra existence check (HALT to /cycle-bg when missing) → rent pods (≤budget) → run → Monitor → on JOB DONE harvest+down + dispatch parse Agent → atlas register on green (generic verify-delegation, fold direct to embedded.gen.hexa) → aggregate ledger at exports/sweep/<batch>/. The inverse of one-big-run — N small verify-able experiments in parallel. Domain-agnostic — kind is abstract (materials/DFT, LLM bench, web smoke, build bench are all examples).
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read, Monitor
---

Engage the `micro-exp` skill. **Kind is ABSTRACT — domain-agnostic.** Examples among many: materials wall (DFT/SSCHA), LLM bench (harness output), web smoke (endpoint check), build bench (wall time). `local_pool_adapter` works on any kind that has a `<runnable>` + `<parser>`. Run all stages — candidates come from CONTEXT, not a manifest file (mirrors how `/cycle` self-enumerates):

# Decision tree — `/cycle-bg` ↔ `/micro-exp` (domain-agnostic)

```
candidate matrix in context?
├─ NO        → /kick                       (no candidates · discovery first)
└─ YES → dispatch infra exists for all candidates?
         ├─ NO       → /cycle-bg <domain>  (BUILD phase · each worktree agent writes its candidate's infra)
         ├─ PARTIAL  → /cycle-bg <domain>  (build the missing N) then /micro-exp <scope> (FIRE all)
         └─ YES      → /micro-exp <scope>  (FIRE phase only · pre-built infra assumed)
```

Stage 1.5 below auto-detects the YES/PARTIAL/NO branch and HALTs with this steer when infra is missing.

# Stages

1. **Next-list (self-enumerate from context)** — derive the sweep candidate matrix from the current conversation + the session's active domain. If `$ARGUMENTS` is non-empty, scope/filter the enumeration to it (e.g. `/micro-exp <scope>` → only matching candidates); if empty, take the matrix being discussed in context. For each candidate infer from domain convention (kind-abstract):
   - `id` — stable slug from the matrix (one example among many: `h3sb` in a materials matrix · `niah-128k` in an LLM bench · `checkout-flow` in a web smoke set)
   - `kind` — classifier from the domain (examples — materials: `dft-elph`/`sscha`/`ml-pred` · LLM bench: `harness-eval`/`wall-token-rate` · web: `smoke-endpoint` · build: `wall-build`)
   - `inputs_dir` — per domain convention (whatever the kind needs at its declared input path)
   - extra kind-specific dirs as needed (one example: DFT-shaped kinds also carry a `pseudo_dir` UPF directory; LLM-bench kinds carry a dataset file path; web kinds carry an endpoint URL — domain-agnostic, infer from kind)
   - `parser_template` — parse-agent contract inferred from `kind` (output → verdict mapper · any of: parser template · score fn · log grep · structural oracle)

   Auto-derive `batch_id` from active domain + date (→ `exports/sweep/<batch_id>/`). Declare a **budget** before dispatch: `pod_concurrent_max` (+ `usd_max_per_week` when known) — infer a safe default (e.g. 4 pods) or ask in one line if genuinely unknown (g64). State in one line: batch_id + N candidates + inferred kind + budget cap.

   **Local-pool adapter (@D local_pool_adapter)** — BEFORE the no-signal fallback, check if the candidate matrix is LOCAL-POOL-VIABLE (domain-agnostic): (a) `pool list` shows at least one ON host suitable for the candidate `kind` (one example among many: `ubu-2` for GPU walls, `mini` for arm64 macOS builds, any pool host for an LLM-bench harness, the dev box for a web smoke); (b) the `kind` is observation-only and NOT closed-form-atom-registrable (wall-measurement · LLM bench number · structural oracle · build-bench · web endpoint check — any kind whose verdict is an observed number, not a closed-form identity). When BOTH hold, switch to **local-pool mode**: replace `hexa cloud rent` with `pool on <host>` dispatch (or direct `ssh <host>`), replace `cloud copy-to/copy-from` with `scp` to the same host, keep the monitor + parse-Agent + ledger pipeline, SKIP `/atlas register --from-verify` (observed numbers aren't atlas atoms — persist verbatim stdout to `.verdicts/<slug>/<id>.txt` only). Budget becomes `local_hours_max` not `usd_max_per_week`. State on entry: `local-pool mode: host=<host> kind=<kind> budget=<hours>`. Works on ANY kind that has a `<runnable>` + `<parser>`.

   **No-signal fallback** — if context yields NO defensible candidate matrix (no domain, no matrix in conversation, no `$ARGUMENTS` scope) AND local-pool adapter doesn't apply, stop with one line: `🛑 no candidate matrix in context — name the sweep (/micro-exp <what>) or describe the candidates first`. Do NOT fabricate candidates to keep the sweep running (g63 honesty).

1.5. **Infra existence check (domain-agnostic — BEFORE dispatch)** — for each candidate in the matrix, verify the four GENERIC infra prerequisites. The wording is kind-abstract: each prereq is a role, not a file extension. Map the role to whatever the candidate's `kind` needs:

   | prereq | role | example mappings (one of many · kind-abstract) |
   |---|---|---|
   | `<runnable>` | how to run this candidate | dispatch script · `Makefile` target · `run.sh` · callable verb · deployable artifact. Materials kind → input deck + sbatch · LLM-bench kind → harness entrypoint + dataset file · web kind → `npm run smoke` + endpoint URL · build-bench kind → build target. |
   | `<inputs>` | input artifacts at declared path | whatever the candidate's kind needs at its declared input directory. Do NOT enumerate kind-specific extensions. |
   | `<parser>` | output → verdict mapper | parser template · score function · log grep · structural oracle. Generic across all kinds. |
   | `<workdir>` | local-fs path exists and writable | the directory the runnable + inputs + parser live in (or the per-candidate subdir under it). |

   Per-candidate verdict: `INFRA-READY` (all four present) or `INFRA-MISSING(<list-of-missing-prereqs>)`.

   **Halt rule** — if `N_missing > 0`:
   ```
   🛑 N/M candidates missing dispatch infrastructure — /cycle-bg <active-domain> required first (build phase before fire phase).
   per-candidate breakdown:
   | candidate_id | infra status |
   | ... | INFRA-MISSING(<runnable>, <parser>) |
   | ... | INFRA-READY |
   ```
   STOP. Do not advance to Stage 2. The user (or `/cycle-bg`) builds the missing infra first; re-run `/micro-exp <scope>` once `INFRA-READY` reaches M/M.

   **Continue rule** — if all M candidates are `INFRA-READY`, print a one-line `✅ infra check: M/M candidates ready · proceeding to pre-flight` and advance to Stage 2.

   `kind` is ABSTRACT — `<runnable>` + `<parser>` is the only contract. Examples include materials wall (DFT/SSCHA), LLM bench (harness output), web smoke (endpoint check), build bench (wall time); the local-pool adapter works on ANY kind that satisfies the contract.

2. **Pre-flight** — `hexa cloud list` for current pod count + the declared `pod_concurrent_max`. Compute `wave_size = min(budget_remaining, len(candidates_pending))`. If a `hexa cloud preflight` adapter for the candidate `kind` exists (RFC 091 stub), run it per candidate for OOM/cost estimate; else skip with a one-line `preflight: deferred — RFC 091 stub` note. Print `wave 1: M / N candidates · remaining budget K pods`.

3. **Plan table** — print BEFORE dispatch:
   ```
   | # | candidate_id | kind | inputs_dir | parser | est_$/hr | wave |
   ```
   One row per candidate (wave-1 candidates marked, queued ones marked `queued`). Cite the `exports/sweep/<batch_id>/` directory the ledger will live in.

4. **Dispatch** — for each wave-1 candidate row (do these as a SINGLE message of parallel actions where the candidate inputs allow; otherwise serialize per pod-rent's atomicity requirement):
   1. `hexa cloud rent <host_class>` → record `pod_id` in `exports/sweep/<batch_id>/state.json` (state: `dispatched`).
   2. `hexa cloud copy-to <pod> <inputs_dir>` + `<pseudo_dir>` (separately, into the pod's `~/<candidate_id>/`).
   3. `hexa cloud nohup <pod> -- bash ~/<candidate_id>/run.sh` (SAVE_POD=1 sticky per g57).
   4. **🛰️ Monitor** arm — use the kind-appropriate alive-check + completion-check pattern (domain-agnostic; pick the pair per `kind`). One example among many: a materials kind uses `{ pgrep -x pw.x; pgrep -x ph.x; } | wc -l` liveness + `grep -c 'JOB DONE' ph.out` completion. An LLM-bench kind uses `pgrep -x <harness-bin>` liveness + `grep -c '<final-summary-marker>' <log>` completion. A web-smoke kind uses `pgrep -x curl|playwright` liveness + HTTP-status completion. Substitute your kind's pair. On completion → `tar` artifacts + `hexa cloud copy-from` to `~/sweep_<batch_id>/<candidate_id>/` + `hexa cloud down <pod>`. On ERR/GONE → tail capture + `down`.
   5. On the monitor's JOB-DONE event → **dispatch a parse `Agent` (`run_in_background: true`, `isolation: worktree`)** with the inferred `parser_template` and the harvested tgz path. The parse Agent's contract: extract → parse → on a closed-form-atom-shaped kind, `hexa verify --expr` verbatim → on pass `/atlas register --from-verify <fn> <args> <v>` (generic delegation, folds direct to embedded.gen.hexa); on an observation-only kind (local-pool mode), skip atlas and persist verbatim verdict to `.verdicts/<slug>/<id>.txt`. Persist `exports/sweep/<batch_id>/<candidate_id>.json` mirroring the per-domain JSON schema for the kind (one example among many: a materials sweep mirrors that domain's `exports/<area>/<kind>_*.json` shape; an LLM-bench sweep mirrors that domain's bench schema; a web sweep mirrors its check schema).

5. **Aggregate (when wave complete)** — when monitor events report wave finish, write/update `exports/sweep/<batch_id>/ledger.json`:
   - per-candidate verdict (🔵 / 🟢 / 🔴 / 🟠)
   - atlas node id on 🔵/🟢
   - pattern observations (e.g. "M8 axis fails across N/M candidates — wall pattern: …")
   - links to per-candidate exports JSON
   FALSIFIED entries ARE preserved as CLOSED-negative (g63 — never skip). Auto-queue next wave from remaining candidates if budget allows; else end with:

```
Wave M complete · N candidates absorbed · K queued.
Ledger: exports/sweep/<batch_id>/ledger.json

Next: `/micro-exp` to dispatch the next wave (or `/check` to inspect the ledger).
```

**Honest constraints** (commons @D g63-g66):
- `g63` micro-exp honest sweep — every candidate reaches a verify tier; FALSIFIED is CLOSED-negative, not skipped.
- `g64` sweep budget cap — declare a pod/usd budget before dispatch; halt on breach.
- `g65` sweep aggregation — `exports/sweep/<batch_id>/ledger.json` is the typed surface; never let it drift from atlas state.
- `g66` sweep pod-cap ≠ agent-cap — pod_concurrent_max (rent budget) ≠ parallel-agent-cap (≤3 Agent tool); separate semantics.

**Guardrails** (from session experience):
- Always invoke `hexa cloud` per @D g8 (never raw ssh/scp/vastai/runpodctl) for rented-pod paths; `pool on <host>` for local-pool mode.
- Always set `SAVE_POD=1` on the dispatch chain (per @D g57 — SSH drop survival).
- Parse Agent must paste the verify verdict VERBATIM (g5) — no LLM self-judge — for closed-form-atom-shaped kinds; observation-only kinds persist the observed number verbatim.
- Worktree-isolated agents must use `git add <explicit-files>` only (concurrent-tree index isolation).
- **Stage 1.5 (infra existence check) is NOT optional** — never skip it to "keep the sweep running"; halt to `/cycle-bg <domain>` on any missing prereq (build phase before fire phase).
