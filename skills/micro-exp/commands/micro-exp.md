---
description: /micro-exp [scope] — context-driven micro-experiment sweep. Self-enumerate sweep candidates from the conversation / active domain (no manifest file) → rent pods (≤budget) → run → 🛰️ Monitor (pw.x|ph.x alive-check) → on JOB DONE harvest+down + dispatch parse Agent → atlas register on 🟢 (generic verify-delegation, fold direct to embedded.gen.hexa) → aggregate ledger at exports/sweep/<batch>/. The inverse of "1 big run" — N small verify-able experiments in parallel.
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read, Monitor
---

Engage the `micro-exp` skill. In ONE message run all five stages — candidates come from CONTEXT, not a manifest file (mirrors how `/cycle` self-enumerates):

1. **Next-list (self-enumerate from context)** — derive the sweep candidate matrix from the current conversation + the session's active domain. If `$ARGUMENTS` is non-empty, scope/filter the enumeration to it (e.g. `/micro-exp group-13` → only group-13 candidates); if empty, take the matrix being discussed in context. For each candidate infer from domain convention:
   - `id` (stable slug from the matrix, e.g. `h3sb`)
   - `kind` (classifier from the domain, e.g. `dft-elph`, `sscha`, `ml-pred`)
   - `inputs_dir` (per domain convention, e.g. RTSC → `~/etc/rtsc-results/<id>/`) + `pseudo_dir` (UPF dir, or none for non-DFT)
   - `parser_template` (parse-agent contract inferred from `kind`, e.g. `rtsc-h3x-elph`)

   Auto-derive `batch_id` from active domain + date (→ `exports/sweep/<batch_id>/`). Declare a **budget** before dispatch: `pod_concurrent_max` (+ `usd_max_per_week` when known) — infer a safe default (e.g. 4 pods) or ask in one line if genuinely unknown (g64). State in one line: batch_id + N candidates + inferred kind + budget cap.

   **Local-pool adapter (@D local_pool_adapter)** — BEFORE the no-signal fallback, check if the candidate matrix is LOCAL-POOL-VIABLE: (a) `pool list` shows at least one ON host suitable for the candidate `kind` (e.g. `ubu-2` for GPU wall sweeps, `mini` for arm64 macOS builds); (b) the `kind` is wall-measurement / structural-oracle / build-bench (NOT DFT-elph / SSCHA / closed-form-atom registrable). When BOTH hold, switch to **local-pool mode**: replace `hexa cloud rent` with `pool on <host>` dispatch (or direct `ssh <host>`), replace `cloud copy-to/copy-from` with `scp` to the same host, keep the monitor + parse-Agent + ledger pipeline, SKIP `/atlas register --from-verify` (wall numbers aren't atlas atoms — persist verbatim stdout to `.verdicts/<slug>/<id>.txt` only). Budget becomes `local_hours_max` not `usd_max_per_week`. State on entry: `local-pool mode: host=<host> kind=<kind> budget=<hours>`.

   **No-signal fallback** — if context yields NO defensible candidate matrix (no domain, no matrix in conversation, no `$ARGUMENTS` scope) AND local-pool adapter doesn't apply, stop with one line: `🛑 no candidate matrix in context — name the sweep (/micro-exp <what>) or describe the candidates first`. Do NOT fabricate candidates to keep the sweep running (g63 honesty).

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
   4. **🛰️ Monitor** arm — use the canonical FIXED `pw.x|ph.x` alive-check pattern: `{ pgrep -x pw.x; pgrep -x ph.x; } | wc -l` for liveness; `grep -c 'JOB DONE' ph.out` for completion. On JOB DONE → `tar` artifacts + `hexa cloud copy-from` to `~/sweep_<batch_id>/<candidate_id>/` + `hexa cloud down <pod>`. On ERR/GONE → tail capture + `down`.
   5. On the monitor's JOB-DONE event → **dispatch a parse `Agent` (`run_in_background: true`, `isolation: worktree`)** with the inferred `parser_template` and the harvested tgz path. The parse Agent's contract: extract → parse → 🟢 `hexa verify --expr` verbatim → on pass `/atlas register --from-verify <fn> <args> <v>` (generic delegation, folds direct to embedded.gen.hexa) → persist `exports/sweep/<batch_id>/<candidate_id>.json` (mirror the per-domain JSON schema, e.g. `exports/material_discovery/rtsc_*_dft_*.json` for RTSC kind=dft-elph).

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
- Always invoke `hexa cloud` per @D g8 (never raw ssh/scp/vastai/runpodctl).
- Always set `SAVE_POD=1` on the dispatch chain (per @D g57 — SSH drop survival).
- Parse Agent must paste the verify verdict VERBATIM (g5) — no LLM self-judge.
- Worktree-isolated agents must use `git add <explicit-files>` only (concurrent-tree index isolation).
