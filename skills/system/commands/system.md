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

For each `running` job WITHOUT a live watcher, arm a background while-loop (one per job, `run_in_background: true`) that polls the job's durable log and terminates on a DEBOUNCED, EXIT-CODE-AWARE terminal taxonomy (NOT a bare marker grep):
- `DONE` — `<terminal_marker>` present **AND** no trailing `STOP <n≠0>` / `Error in routine` / `Maximum CPU time` / non-zero exit. A clean success.
- `TIMEOUT-RESUMABLE` — `Maximum CPU time exceeded` / `max_seconds` / scheduler-walltime hit. The marker may ALSO appear (e.g. QE prints `JOB DONE.` then `STOP 1` on a walltime stop) — this is NOT success; if recovery state exists, `next` resumes (recover) rather than harvests.
- `STUCK`/`CRASHED` — `STOP <n≠0>` / `Error in routine` / `Traceback` / `OOM` / non-zero prterun exit.
- `GONE` — liveness probe = 0 for **2 consecutive** polls (debounce — a single transient ssh-255 is NOT terminal; see transport classification below).

⚠ **Bare-marker trap** (the reason this is exit-code-aware): a terminal_marker like QE's `JOB DONE.` is printed by the routine even on a `max_seconds` walltime stop that exits non-zero with an incomplete result. Grepping ONLY the marker false-fires `DONE` on a resumable/crashed run. ALWAYS pair the marker check with a trailing-`STOP`/error/exit scan. (Evidence: a 22.5h phonon walltime-stop that printed `JOB DONE.`+`STOP 1` was mis-read as success once — hence this rule.) The hexa-lang `cloud poll`/`tail` 3-tier exit code (DONE/TIMEOUT-RESUMABLE/CRASHED) is the upstream fix (hexa-lang INBOX 2026-05-28); until it lands, the watcher does the trailing-scan itself.

**Transport classification** — `cloud exec`/probe exit 255 with TCP-open + live contract = `TRANSIENT-GATEWAY` (retry-with-backoff, pod is fine); 255 with TCP-closed = `POD-DOWN`. A single 255 is NOT a `GONE` terminal (debounce 2x).

The watcher writes its terminal verdict to its task-output (the durable Monitor attach point). NO ScheduleWakeup (interactive-pace, not a cron loop). Record each watcher id back into `pods.json` `jobs.<id>.watcher`. State: `armed N watchers · debounce 2x · cap <Nmin>`.

**Upstream-reflex (g59) — fix hexa cloud at source, not just here:** when `/system`'s watch/harvest hits a `hexa cloud` CLI limitation (a false-terminal the CLI should have classified, a transport ambiguity, a missing preflight axis), file it to `~/core/hexa-lang/INBOX.log.md` (g59) SAME-TURN with verbatim evidence — do not silently bake a permanent workaround into the watcher. The caller-side trailing-scan is a STOPGAP; the durable fix is the CLI's 3-tier exit code. `/system` improvements that re-discover a cloud gap MUST leave an upstream trail.

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
2. **fire the next candidate** from `queue` (highest priority). Resolve its status FIRST (see taxonomy below):
   - `queued` (ready) → provision/reuse a surface, dispatch, arm watcher, flip → `fired`. State the incremental cost in ONE line, then fire — **no "shall I continue?" gate** (same autonomy as the initial cost-bearing fire).
   - `blocked:<technical-input>` → **AUTO-RESOLVE the blocker, then fire** — do NOT park it. A missing structure coord → `/research:arxiv` or literature lookup; a missing input file → fetch/build it; a missing pseudo/dep → wget/install it. Resolving a technical input is agent work, NOT a user gate. Only after an HONEST resolution attempt fails (input genuinely unavailable, e.g. a coord that exists only as a figure) does it become a logged skip (d6 — never hallucinate the missing input).
3. 🔴 FALSIFIED is a valid terminal → STILL advance to the next candidate (a closed-negative rules out an axis; the campaign continues).
4. If `queue` is empty AND no open axis remains → report depletion (NOT a pause-for-approval).

**Autonomy invariant (the reason this verb exists):** "queued" / "blocked" NEVER means "waiting for the user to say go." `queued` auto-fires; `blocked:<technical>` auto-resolves-then-fires. The ONLY status that legitimately stops the loop for a human is `gated:<human-only-input>` — a credential, a destructive/irreversible action, or a genuine design decision (rare). Re-framing a technically-resolvable candidate as "발사 대기 / awaiting approval" is the exact anti-pattern `/system` removes.

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

**Candidate status taxonomy** (the status is an AUTONOMY contract, not a waiting-room):

| status | meaning | loop behavior |
|---|---|---|
| `queued` | ready (spec + inputs complete) | **auto-fires** on `next`/`auto` |
| `blocked:<technical>` | missing a resolvable input (coord · data · pseudo · dep) | **auto-resolve** (research/fetch/build) then fire — NOT a wait |
| `fired` | dispatched, watcher armed | in-flight; harvest on terminal |
| `done` | harvested + verdict recorded | terminal |
| `gated:<human-only>` | needs credential / irreversible-action OK / design decision | **the ONLY status that stops for a human** (rare) |

There is deliberately NO "awaiting-approval" status for an ordinary candidate. If you catch yourself about to write "발사 대기 / waiting for user go" on a `queued` or `blocked:<technical>` item — that's the anti-pattern; fire or auto-resolve instead.

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
