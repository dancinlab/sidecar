---
description: /system — campaign control-tower. Unified dashboard + event-driven watch + harvest→verdict + autonomous re-dispatch loop over all in-flight jobs of a long-running campaign, across any surface (pod/pool/local). Domain-agnostic. Arg = verb (bare=status · watch · harvest · next · auto · cost · queue).
---

# /system — campaign control-tower (domain-agnostic)

You are running **`/system`**: one persistent mission-control over EVERY in-flight job
of a long-running campaign, across ANY execution surface. It ties together four things
that are otherwise run by hand:

```
   manifest          watch              harvest            re-dispatch
   ./pods.json  ─→   event-driven  ─→   parse + verdict ─→  fire next queued
   (cloud SSOT)      watchers           (g5 tier)           (autonomous loop)
        ▲                                                        │
        └────────────────── queue backlog ──────────────────────┘
```

NOT domain-locked: a "job" is abstract — DFT el-ph (`CHAIN DONE`), ML training
(`training complete`), a build matrix (`PASS`), a render (`frames done`) are all just
different `terminal_marker` + `metric_parser` values. The loop is identical.

## Manifest SSOT — `./pods.json` (extended)

Reuse the cloud-dispatch manifest (`/cloud dispatch` writes it · atomic + .bak). `/system`
reads it and uses three sections (creating the latter two on first use):

```json
{
  "pods": { "<pod-id>": { "host": "...", "surface": "pod|pool|local", "cores": N, "cost_usd_per_hr": X, "jobs": ["<job-id>", ...] } },
  "jobs": { "<job-id>": { "pod": "<pod-id>", "workdir": "...", "kind": "<abstract>", "terminal_marker": "CHAIN DONE", "stage": "...", "pid": N, "watcher": "<bg-id>", "metric_parser": "<template>", "verdict": "PENDING|🔵|🟢|🟠|🔴" } },
  "queue": [ { "id": "<candidate>", "kind": "...", "spec": "...", "status": "queued|fired|done" } ],
  "budget": { "cap_usd": N, "spent_usd": X }
}
```

Never reinvent the manifest. If `./pods.json` is absent, scaffold the skeleton above (empty pods/jobs/queue + a `budget` you ask for in one line, or infer a safe default).

## Step 0 — locate manifest + freshness
Read cwd `./pods.json` (or the active domain's dir per `DOMAINS.tape`). If absent → scaffold. If present → trust it as SSOT but augment every "running" job with a LIVE liveness probe (Step 1) — a manifest `running` that the surface contradicts is reported as `⚠ ghost`.

## Verb table (arg = first token)

| token | verb | does |
|---|---|---|
| (empty) | **status** | unified control-tower dashboard |
| `watch` | **watch** | arm one event-driven watcher per active job |
| `harvest [<id>]` | **harvest** | terminal job → parse metric + g5 verdict + ledger |
| `next` / `redispatch` | **next** | autonomous harvest→register→fire-next-queued (one step) |
| `auto` | **auto** | full loop (status→watch→harvest→next) to depletion/budget/interrupt |
| `cost` | **cost** | budget tracker, per-surface breakdown |
| `queue [add\|rm\|ls]` | **queue** | manage the candidate backlog |

## status (bare) — control-tower dashboard

Read `./pods.json`. For each job marked `running`, probe liveness on its surface:
- **pod** (vast/runpod): `hexa cloud exec <host> [conn] -- '<probe>'` (commons g8 — never raw ssh). Probe = `grep -c "<terminal_marker>" <workdir>/<log>` + a cwd-scoped process check `for p in $(pgrep -x <bin>); do [ "$(readlink /proc/$p/cwd)" = "<workdir>" ] && echo x; done | wc -l`.
- **pool** host: `pool on <host> '<probe>'`.
- **local**: the probe directly.

Render:
```
🛰️ <campaign> — control tower (<ISO>)
═══════════════════════════════════════
<surface> <host> (<cores>c · $<rate>/hr)
   <job-id>     <stage>   <progress-bar>   <verdict>
   ...
─── queue: <N> candidates · budget: ▓▓░░ $<spent>/$<cap> (<pct>%) ───
⚠ ghost: <jobs manifest=running but surface contradicts>
```
Read-only. Each job's `progress` is derived from its `metric_parser`'s cheap signal (iter count · dyn files · epoch · % — whatever the kind exposes). NEVER infer a verdict here (status ≠ harvest).

## watch — arm event-driven watchers (commons g10 · g57)

For each `running` job WITHOUT a live watcher, arm a background while-loop (one per job, `run_in_background: true`) that polls the job's durable log and terminates on a DEBOUNCED terminal:
- `DONE` — `grep -q "<terminal_marker>"` in the log.
- `STUCK` — `grep -qE "Error|Traceback|too many|OOM"` (kind-specific error set) in the log/stderr.
- `GONE` — liveness probe = 0 for **2 consecutive** polls (debounce — a single transient ssh timeout is NOT terminal).

The watcher writes its terminal verdict to its task-output (the durable Monitor attach point). NO ScheduleWakeup (interactive-pace, not a cron loop). Record each watcher id back into `pods.json` `jobs.<id>.watcher`. State: `armed N watchers · debounce 2x · cap <Nmin>`.

**Re-arm on TIMEOUT** — a watcher that hits its cap without a terminal is re-armed (the job is still grinding). A watcher that fires DONE/STUCK/GONE hands off to `harvest`.

## harvest [<id>] — terminal → metric + verdict (g5)

For a terminal job (or all terminal jobs if no id):
1. Pull artifacts: `hexa cloud copy-from` (pod) / `scp` via pool / direct (local) → `exports/<campaign>/<job-id>/`.
2. Parse the kind's metric via `metric_parser` (delegate to a parse Agent for non-trivial parses, `run_in_background` + `isolation: worktree`).
3. Emit a **g5 verdict tier VERBATIM** — never LLM-judge:
   - `hexa verify --expr <fn> <args> <v>` for a numerical claim → paste 🟢/🔵/🔴 verbatim.
   - 🔴 FALSIFIED / closed-negative is a VALID terminal (g63) — record, do not hide.
4. Persist to `exports/<campaign>/ledger.json` (per g65) + set `pods.json` `jobs.<id>.verdict`.
5. If the surface is a rented pod and the job is the last on it → `hexa cloud down <pod>` (stop the meter) + update budget.

## next / redispatch — the autonomous loop (one step)

This is the **harvest→re-dispatch autonomy** — the reason `/system` exists. For each harvested-terminal job:
1. **atlas register** on a 🟢/🔵 verdict (g62) — `/atlas register --from-verify ...` (verified closed-form folds into the atlas).
2. **fire the next queued candidate** from `queue` (status `queued`, highest priority) — provision/reuse a surface, dispatch its run, arm its watcher, flip its queue status → `fired`. State the incremental cost in ONE line, then fire (no "shall I continue?" gate — same autonomy as the initial cost-bearing fire).
3. 🔴 FALSIFIED is a valid terminal → STILL advance to the next candidate (a closed-negative rules out an axis; the campaign continues).
4. If `queue` is empty AND no open axis remains → report depletion (NOT a pause-for-approval).

## auto — full loop to depletion

Run continuously: `status` → `watch` (arm any unwatched) → on each watcher's terminal event → `harvest` → `next`. Repeat until ONE of:
- **backlog drained** — `queue` empty AND all jobs terminal → `🏁 campaign drained` (final ledger + verdict matrix).
- **budget hit** — `spent_usd ≥ cap_usd` → `🛑 budget cap $<cap> reached` (g64; halt, do not silently exceed).
- **user interrupt**.

`auto` NEVER asks "fire next?" between candidates — that gate is exactly what `/system` removes. The only halts are drain / budget / interrupt / a surface-transport failure it can't recover.

## cost — budget tracker

Sum `running`+`done` pod-hours × rate from `pods.json` → `spent_usd`; render `▓▓░░ $spent/$cap (pct%)` + per-surface breakdown + per-candidate est for the remaining queue. Flag if the queue's est would breach `cap`.

## queue [add|rm|ls] — backlog management

- `queue` / `queue ls` — list candidates (status · kind · spec).
- `queue add <id> <kind> <spec>` — append a candidate (status `queued`).
- `queue rm <id>` — drop a candidate.
The queue is what `next`/`auto` draws the re-dispatch target from.

## Honest constraints (commons-aligned)
- **g8** — all pod ops via `hexa cloud {exec|run|nohup|copy-to|copy-from|poll|tail}`; never raw ssh/scp.
- **g5** — paste verify verdicts VERBATIM; never LLM-judge correctness.
- **g10/g57** — watchers detached + durable-logged + Monitor-attached to the LOG; no model-side tail/sleep-poll.
- **g62** — atlas register verified closed-forms at each terminal.
- **g63** — every job reaches a verdict tier; FALSIFIED is a CLOSED negative, never skipped.
- **g64** — declare + honor the budget cap; halt on breach.
- **g65** — `exports/<campaign>/ledger.json` is the typed surface; never let it drift from the manifest.
- Reuses **`/cloud` (pods.json)** + **`/micro-exp` (sweep launch)** + **/atlas** + **/verify** — `/system` is the orchestration layer ABOVE them, not a replacement.

## Closure
End every verb with one status line:
```
🛰️ system: <campaign> · jobs <running>/<total> · queue <N> · budget $<spent>/$<cap> · verdicts <🟢n 🟠n 🔴n> · loop <idle|watching|draining>
```

Triggers — `/system`, `관제탑`, `캠페인 현황`, `전체 잡 현황`, `mission control`, `campaign status`,
`결과보고 추가발사`, `harvest 후 자동발사`, `자율 재발사 루프`, `control tower`, `잡 전부 모니터`.
