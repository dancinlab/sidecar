---
description: /micro-exp <manifest> — manifest-driven micro-experiment sweep. Parse manifest → rent pods (≤budget) → run → 🛰️ Monitor (pw.x|ph.x alive-check) → on JOB DONE harvest+down + dispatch parse Agent → atlas register on 🟢 (generic verify-delegation, fold direct to embedded.gen.hexa) → aggregate ledger at exports/sweep/<batch>/. The inverse of "1 big run" — N small verify-able experiments in parallel.
argument-hint: "<manifest.yaml> [scope]"
allowed-tools: Agent, Bash, Read, Monitor
---

Engage the `micro-exp` skill. In ONE message run all five stages on the manifest at `$ARGUMENTS`:

1. **Parse + validate manifest** — read `$ARGUMENTS` (default `manifest.yaml` in cwd). Validate required fields:
   - `batch_id` (slug — directory under `exports/sweep/`)
   - `host_class` (default `vast-gpu`)
   - `budget.pod_concurrent_max` (REQUIRED — g_sweep_budget_cap)
   - `budget.usd_max_per_week` (optional but recommended)
   - `candidates[]` with each: `id`, `kind`, `inputs_dir`, `pseudo_dir` (nullable for non-DFT), `parser_template`
   On invalid: print field-by-field diagnosis and exit. State in one line: batch_id + N candidates + budget cap.

2. **Pre-flight** — `hexa cloud list` for current pod count + the manifest's `budget.pod_concurrent_max`. Compute `wave_size = min(budget_remaining, len(candidates_pending))`. If a `hexa cloud preflight` adapter for the candidate `kind` exists (RFC 091 stub), run it per candidate for OOM/cost estimate; else skip with a one-line `preflight: deferred — RFC 091 stub` note. Print `wave 1: M / N candidates · remaining budget K pods`.

3. **Plan table** — print BEFORE dispatch:
   ```
   | # | candidate_id | kind | inputs_dir | parser | est_$/hr | wave |
   ```
   One row per candidate (wave-1 candidates marked, queued ones marked `queued`). Cite the manifest path and the `exports/sweep/<batch_id>/` directory the ledger will live in.

4. **Dispatch** — for each wave-1 candidate row (do these as a SINGLE message of parallel actions where the manifest allows; otherwise serialize per pod-rent's atomicity requirement):
   1. `hexa cloud rent <host_class>` → record `pod_id` in `exports/sweep/<batch_id>/manifest.json` (state: `dispatched`).
   2. `hexa cloud copy-to <pod> <inputs_dir>` + `<pseudo_dir>` (separately, in the pod's `~/<candidate_id>/`).
   3. `hexa cloud nohup <pod> -- bash ~/<candidate_id>/run.sh` (SAVE_POD=1 sticky per g57).
   4. **🛰️ Monitor** arm — use the canonical FIXED `pw.x|ph.x` alive-check pattern (per `reference_hexa_cloud_provisioning.md` memory): `{ pgrep -x pw.x; pgrep -x ph.x; } | wc -l` for liveness; `grep -c 'JOB DONE' ph.out` for completion. On JOB DONE → `tar` artifacts + `hexa cloud copy-from` to `~/rtsc_<candidate_id>_vast_result/` (or `~/sweep_<batch_id>/<candidate_id>/`) + `hexa cloud down <pod>`. On ERR/GONE → tail capture + `down`.
   5. On the monitor's JOB-DONE event → **dispatch a parse `Agent` (`run_in_background: true`, `isolation: worktree`)** with the manifest's `parser_template` and the harvested tgz path. The parse Agent's contract: extract → parse → 🟢 `hexa verify --expr` verbatim → on pass `/atlas register --from-verify <fn> <args> <v>` (generic delegation, folds direct to embedded.gen.hexa per #859) → persist `exports/sweep/<batch_id>/<candidate_id>.json` (mirror the per-domain JSON schema, e.g. `exports/material_discovery/rtsc_*_dft_*.json` for RTSC kind=dft-elph).

5. **Aggregate (when wave complete)** — when monitor events report wave finish, write/update `exports/sweep/<batch_id>/ledger.json`:
   - per-candidate verdict (🔵 / 🟢 / 🔴 / 🟠)
   - atlas node id on 🔵/🟢
   - pattern observations (e.g. "M8 axis fails across N/M candidates — wall pattern: …")
   - links to per-candidate exports JSON
   FALSIFIED entries ARE preserved as CLOSED-negative (g_micro_exp_honest_sweep — never skip). Auto-queue next wave from remaining `candidates[]` if budget allows; else end with:

```
Wave M complete · N candidates absorbed · K queued.
Ledger: exports/sweep/<batch_id>/ledger.json

Next: `/micro-exp <manifest>` to dispatch the next wave (or `/check` to inspect the ledger).
```

**Honest constraints** (per the four commons @D additions proposed — INBOX 2026-05-25T22:00Z):
- `g_micro_exp_honest_sweep` — every candidate reaches verify tier; FALSIFIED is CLOSED-negative, not skipped.
- `g_sweep_budget_cap` — respect manifest `budget`; halt on breach.
- `g_sweep_aggregation` — `exports/sweep/<batch_id>/ledger.json` is the typed surface; never let it drift from atlas state.
- `g_sweep_pod_vs_agent_cap` — pod-concurrent ≠ Agent-parallel-cap (≤3); separate semantics.

**Guardrails** (from session experience):
- Always invoke `hexa-cloud` via absolute path `/Users/ghost/bin/hexa-cloud` (pool-route bypass — `~/bin/hexa-cloud` not visible on ubu hosts).
- Always set `SAVE_POD=1` on the dispatch chain (per @D g57 — SSH drop survival).
- Parse Agent must paste the verify verdict VERBATIM (g5) — no LLM self-judge.
- Worktree-isolated agents must use `git add <explicit-files>` only (per @D d9 — concurrent-tree index isolation).
