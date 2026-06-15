# micro-exp — context-driven micro-experiment sweep (domain-agnostic)

The inverse of one-big-run: **N small verify-able experiments in parallel**. Enumerate
candidates from the conversation/active domain (no manifest file) → infra-existence gate →
dispatch under a budget (rented pods or local pool) → Monitor closed-loop → harvest → parse
Agent → absorb (atlas for closed-form, verdict for observation) → aggregate ledger.

`kind` is **ABSTRACT** — materials wall · LLM bench · web smoke · build bench are examples
among many. The only contract is `<runnable>` + `<parser>`.

## Decision tree — build vs fire

```
candidate matrix in context?
├─ NO        → discover first (no candidates to sweep)
└─ YES → dispatch infra exists for ALL candidates?
         ├─ NO       → BUILD phase first (write each candidate's infra), then re-run micro-exp
         ├─ PARTIAL  → build the missing N, then micro-exp <scope> (fire all)
         └─ YES      → micro-exp <scope> (fire only · pre-built infra assumed)
```

Stage 1.5 auto-detects YES/PARTIAL/NO and HALTs with a steer when infra is missing.

## Stages

1. **Self-enumerate (from context, not a file)** — derive the candidate matrix from the
   conversation + active domain. `<scope>` arg filters; empty = the matrix in context. Per
   candidate infer `{ id · kind · inputs_dir · parser_template }` from domain convention.
   - Derive `batch_id` from active-domain + date → ledger at `exports/sweep/<batch_id>/`.
   - Declare a **budget BEFORE dispatch**: `pod_concurrent_max` (+ `usd_max_per_week` if known),
     or `local_hours_max` for local-pool mode. Default safe (e.g. 4 pods) or ask in ONE line.
   - **Local-pool adapter** — if `harness pool list` shows an ON host fit for the kind AND the
     kind is observation-only (a measured number, not a closed-form identity): switch to
     local-pool mode — `harness pool on <host>` instead of renting, `scp` instead of cloud
     copy, keep monitor+parse+ledger, SKIP atlas (persist verbatim verdict only). State on
     entry: `local-pool mode: host=<host> kind=<kind> budget=<hours>`.
   - **No-signal fallback** — if context yields no defensible matrix and local-pool doesn't
     apply: STOP with `🛑 no candidate matrix in context — name the sweep (micro-exp <what>)`.
     NEVER fabricate candidates to keep the sweep running (honesty).

1.5. **Infra existence check (BEFORE dispatch — NOT optional)** — per candidate verify the four
   GENERIC prereqs (roles, not file extensions):

   | prereq | role |
   |---|---|
   | `<runnable>` | how to run this candidate (script · make target · run.sh · deployable) |
   | `<inputs>`   | input artifacts at the declared path |
   | `<parser>`   | output → verdict mapper (template · score fn · log grep · oracle) |
   | `<workdir>`  | a writable local-fs path the runnable+inputs+parser live in |

   Verdict per candidate: `INFRA-READY` or `INFRA-MISSING(<prereqs>)`.
   - if any missing → **HALT**: `🛑 N/M candidates missing dispatch infrastructure — build phase
     required first (build before fire)` + per-candidate table. STOP; do not advance.
   - if all ready → `✅ infra check: M/M ready · proceeding` → Stage 2.

2. **Pre-flight** — current pod count (`harness pod` / `hexa cloud list`) vs `pod_concurrent_max`.
   `wave_size = min(budget_remaining, candidates_pending)`. Print `wave 1: M / N · remaining K`.

3. **Plan table (print BEFORE dispatch)**:
   ```
   | # | candidate_id | kind | inputs_dir | parser | est_$/hr | wave |
   ```
   wave-1 rows marked; queued rows marked `queued`. Cite `exports/sweep/<batch_id>/`.

4. **Dispatch** (parallel where inputs allow, ≤ budget):
   1. rent (`harness pod` runbook / `hexa cloud rent`) or `harness pool on <host>` → record
      `pod_id`/host in `exports/sweep/<batch_id>/state.json` (state: `dispatched`).
   2. copy inputs into the pod/host workdir (`hexa cloud copy-to` / `scp`).
   3. run detached (`SAVE_POD=1` sticky so an SSH drop survives).
   4. **🛰️ Monitor** with a kind-appropriate liveness + completion pair (domain-agnostic — pick
      per kind: materials `pgrep pw.x` + `grep 'JOB DONE'`; LLM-bench `pgrep <bin>` + summary
      marker; web `pgrep curl` + HTTP status). On completion → tar + copy-from + `down`.
   5. on JOB-DONE → dispatch a **parse Agent** (`run_in_background: true`, `isolation: worktree`)
      with the inferred `parser_template` + harvested tgz. Contract: extract → parse →
      - closed-form-atom kind: `harness verdict record <slug>/<id> -- <verify-cmd>` →
        on PASS `harness atlas add/link` (absorb).
      - observation-only kind: persist verbatim to `.verdicts/<slug>/<id>.txt` (no atlas).
      Write `exports/sweep/<batch_id>/<candidate_id>.json` (mirror the domain's JSON schema).

5. **Aggregate (when wave complete)** — update `exports/sweep/<batch_id>/ledger.json`:
   per-candidate verdict (🔵/🟢/🔴/🟠) · atlas id on 🔵/🟢 · pattern observations · links to the
   per-candidate JSON. **FALSIFIED is preserved as CLOSED-negative — never skipped.** Auto-queue
   the next wave if budget allows; else:
   ```
   Wave M complete · N absorbed · K queued.
   Ledger: exports/sweep/<batch_id>/ledger.json
   Next: harness micro-exp  (next wave)  ·  harness verdict list  (inspect)
   ```

## Honest constraints
- **honest sweep** — every candidate reaches a verify tier; FALSIFIED is CLOSED-negative, not skipped.
- **budget cap** — declare a pod/usd (or local-hours) budget before dispatch; halt on breach.
- **aggregation** — `exports/sweep/<batch_id>/ledger.json` is the typed surface; never let it drift from atlas state.
- **pod-cap ≠ agent-cap** — `pod_concurrent_max` (rent budget) is separate from the parallel-agent cap.
- parse Agent pastes the verify verdict VERBATIM (no LLM self-judge) for closed-form kinds.
- worktree-isolated agents: `git add <explicit-files>` only (concurrent-index isolation).
- Stage 1.5 is mandatory — never skip it to "keep the sweep running" (build phase before fire phase).
