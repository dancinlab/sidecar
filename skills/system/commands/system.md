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
| `tick [--apply]` | **tick** | **(0.7.0 code harness)** deterministic probe→classify→decide pass; partitions auto vs escalate; --apply executes resume |
| `watch` | **watch** | arm one event-driven watcher per active job |
| `harvest [<id>]` | **harvest** | terminal job → parse metric + g5 verdict + ledger |
| `next` / `redispatch` | **next** | autonomous harvest→register→fire-next-queued (one step) |
| `auto` | **auto** | full loop (status→watch→harvest→next) ONE in-session pass to depletion/budget/interrupt |
| `drive [--budget $X] [--max-pods N]` | **drive** | AUTONOMOUS SELF-DRIVING — sticky cross-turn loop (ScheduleWakeup heartbeat + watcher-event re-entry) ticking harvest→verdict→re-dispatch until budget/depletion/interrupt |
| `pursue` | **pursue** | **(0.8.0 all-paths autonomy)** enumerate EVERY open campaign thread (stalled-resumable jobs · tooling gaps to fix-at-source · queued waves · cost-leaks) and fan them ALL out in parallel — NO human "which next?" menu |
| `stop` / `drive off` | **stop** | disengage self-driving (clear the drive marker) |
| `cost` | **cost** | budget tracker, per-surface breakdown |
| `queue [add\|rm\|ls]` | **queue** | manage the candidate backlog |
| `upstream [<repo>]` | **upstream** | report the upstream-reflex trail — INBOX entries + merged PRs this campaign filed to linked repos (g59) |

## status (bare) — control-tower dashboard

Read `./pods.json`. For each job marked `running`, probe liveness on its surface:
- **pod** (vast/runpod): `hexa cloud exec <host> [conn] -- '<probe>'` (commons g8 — never raw ssh). Probe = `grep -c "<terminal_marker>" <workdir>/<log>` + a cwd-scoped process check `for p in $(pgrep -x <bin>); do [ "$(readlink /proc/$p/cwd)" = "<workdir>" ] && echo x; done | wc -l`.
- **pool** host: `pool on <host> '<probe>'`.
- **local**: the probe directly.

Render (lead with the **campaign progress block** per commons g56 — a 10-cell ASCII bar + % + fraction, ALWAYS):
```
🛰️ <campaign> — control tower (<ISO>)
═══════════════════════════════════════
📊 campaign  ▓▓▓▓▓▓░░░░ NN% · jobs <terminal>/<total> · queue <done>/<qtotal> · budget ▓▓░░ $<spent>/$<cap> (<b%>)

<surface> <host> (<cores>c · $<rate>/hr)
   <job-id>     <stage>   ▓▓▓░░ <p%>   <verdict>
   ...
─── queue: <N> candidates · verdicts 🟢n 🟠n 🔴n ───
⚠ ghost: <jobs manifest=running but surface contradicts>
```

**Campaign progress % (g56)** — the single headline number = `(terminal_jobs + done_queue) / (total_jobs + total_queue)` × 100, rendered as a 10-cell bar `▓`×round(pct/10) + `░`×rest. "terminal" = any job with a verdict (🟢/🟠/🔴) OR resolved-resumable; counts a 🔴 FALSIFIED as progress (an axis closed IS progress, g63). Also show the raw fractions so the bar is auditable: `jobs <terminal>/<total>` + `queue <done>/<qtotal>`.

**Per-job bar** — each row gets its own `▓▓▓░░ <p%>` from the `metric_parser`'s cheap signal (DFT: dyn-files/n_q or scf-iter/maxiter · training: epoch/total · build: steps). If the kind exposes no fractional signal, show a 3-state coarse bar (`░░░` queued · `▓▓░` running · `▓▓▓` terminal) rather than omitting it — a bar is always present (g56).

**Budget sub-bar** — `▓▓░░ $<spent>/$<cap> (<b%>)` 10-cell on the budget axis (g56 applies to the cost axis too).

Read-only. NEVER infer a verdict here (status ≠ harvest) — the per-job bar is PROGRESS (how far), not VERDICT (pass/fail).

## tick [--apply] — code-backed deterministic decision pass (0.7.0)

`tick` is the **code-level harness** sitting under everything below. Where prior
verbs are runbooks an LLM follows, `tick` is a real program (`${CLAUDE_PLUGIN_ROOT}/bin/system_harness.hexa`)
that probes every running job via the surface (g8: pod→`hexa cloud exec` ·
pool→`pool on` · local→direct), classifies each into the exit-code-aware
terminal taxonomy, and decides the next action from a fixed table. The output
is partitioned into two lists:

- **auto** — actions the harness handles itself (`wait` no-op · `retry` backoff). With `--apply`, also executes deterministic side-effects: `resume` = `hexa cloud nohup … recover=.true.` for a TIMEOUT-RESUMABLE job with recovery state + a `resume_cmd` field in the manifest.
- **escalate** — actions the LLM acts on: `harvest` (needs g5 verify VERBATIM + atlas), `triage` (novel CRASHED classification), `requeue` (GONE pod-down decision), `restart` (TIMEOUT with NO recovery state — cold restart decision).

This is the **autonomous candidate selector**: instead of ending a turn with a
"pick option 1/2/3/4" menu for the human, the decision table in `decide()`
resolves the next action per job from {state, recov, has_resume_cmd}. The 7-state
taxonomy + 7 decisions cover everything `auto`/`drive` previously did in prose.

Run it directly:
```
hexa run ${CLAUDE_PLUGIN_ROOT}/bin/system_harness.hexa tick [--apply] [--manifest ./pods.json]
hexa run ${CLAUDE_PLUGIN_ROOT}/bin/system_harness.hexa selftest
hexa run ${CLAUDE_PLUGIN_ROOT}/bin/system_harness.hexa status
```

**`drive` uses `tick --apply` as its per-tick body** — drive's ScheduleWakeup
heartbeat or watcher-event re-entry calls `tick --apply`, reads the resulting
auto/escalate report, then the LLM acts on `escalate` only. This compresses the
0.6.0 prose drive steps 1-2 (status sweep + harvest dispatch) into one binary
call (~1s wall, no LLM tokens for routine probing).

**bare-marker trap codified** — `classify()` tests `maxcpu/stopnz/err` BEFORE
the terminal marker. QE printing `JOB DONE.` on a walltime-stop+`STOP 1` now
becomes `TIMEOUT-RESUMABLE`, not `DONE`. The 22.5h phonon false-success is
deterministically impossible.

**`--selftest` (load-bearing logic regression guard)** — 8 cases:
running · clean-done · walltime-trap (marker+maxcpu) · crash-with-marker
(marker+STOP n≠0) · error-trace · noworkdir-gone · transport-255 ·
walltime-no-recov. Run before merging any change to `classify`/`decide`.

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

`auto` is ONE in-session pass. For a campaign whose jobs run for HOURS (DFT · training fleets), the loop must survive ACROSS turns — that is `drive`.

## drive [--budget $X] [--max-pods N] — AUTONOMOUS SELF-DRIVING (sticky, cross-turn)

`drive` is `auto` made persistent: a self-driving campaign that re-enters itself across turns until a halt condition, with NO per-tick user prompt. Two re-entry mechanisms, both honored:
- **watcher-event (primary)** — each armed watcher's terminal fires a harness re-invoke; `drive` harvests THAT job + re-dispatches, then re-arms.
- **ScheduleWakeup heartbeat (fallback)** — a long-interval wake (DFT/training cadence = hours → **1200–1800 s**, never a 5-min poll) so the loop survives even if a watcher silently dies or a surface is between events. The cache-window math: hour-scale jobs change slowly, so a 20–30 min heartbeat is right; do NOT poll at 60 s (burns cache 30× for nothing).

**Engage**: set the drive marker in `pods.json` (`"drive": {"on": true, "budget_cap": X, "max_pods": N, "engaged_utc": "<ISO>"}`) — persisted so it survives compaction/restart. Print `🚗 drive engaged · budget $X · max-pods N · heartbeat <delay>s`.

**Each tick** (on watcher-event OR heartbeat wake), run in order:
1. **status** sweep (liveness probe all running; exit-code-aware terminal taxonomy).
2. **harvest** every terminal job → metric + g5 verdict VERBATIM → atlas register on 🟢 (g62) → ledger. (TIMEOUT-RESUMABLE → recover-resume instead of harvest; CRASHED → log + advance.)
3. **next** — for freed capacity (≤ `max_pods`), fire `queued` / auto-resolve `blocked:<technical>` candidates. **Throttle-aware**: spawn ≤2 parallel agents; on a transient-throttle storm, BACK OFF (serialize, ≤1, jittered) — never thundering-herd. Re-dispatch cost stated in one line per fire.
4. **re-arm** watchers on all running jobs.
5. **budget** check → halt on `spent ≥ cap` (g64).
6. **depletion** check → halt on `queue empty AND all terminal AND no open axis`.
7. **upstream-reflex** — any cloud/tooling gap hit this tick → file upstream INBOX (g59) before continuing.
8. **schedule next** — if not halted, `ScheduleWakeup` the heartbeat delay; else clear the drive marker + emit the halt verdict.

**Halt conditions** (the ONLY stops — `drive` never pauses to ask "continue?"):
- 🏁 **drained** — queue empty + all terminal + no open axis → final ledger + verdict matrix, clear marker.
- 🛑 **budget** — `spent ≥ cap_usd` (g64) → halt, do NOT exceed silently, clear marker.
- ⏸ **gated:<human-only>** — a candidate needs a credential / irreversible-action OK / design decision → PAUSE that ONE candidate (surface it), keep driving the rest; only a campaign-wide human gate stops the whole loop.
- **user interrupt** / explicit `/system stop`.

**Crash/throttle survival**: the drive marker + `pods.json` manifest are the durable state. On a rate-limit death mid-tick, the next watcher-event or heartbeat re-enters and re-reads state (no work lost — checkpoint = the manifest + the per-job recovery files). `drive` itself is replay-safe: a re-entered tick re-derives terminals/queue from the manifest, never re-fires an already-`fired` candidate.

**Distinction**: `auto` = one pass now (interactive). `drive` = the campaign drives itself to its physical limit (budget/drain) across hours/days, hands back only on a halt condition. This is "set the budget + queue, walk away."

**Each drive tick LEADS with the campaign progress block** (g56) so every wake reports forward motion as a %: `📊 campaign ▓▓▓▓▓▓░░░░ NN% · jobs <t>/<T> · queue <d>/<Q> · budget ▓▓░░ $<s>/$<c>`. The % MUST be monotone-non-decreasing across ticks (a tick only adds terminals/done) — a drop signals a manifest drift to investigate.

## pursue — all-paths autonomy (0.8.0) · campaign-level fan-out, NO menu

`drive`/`next` automate the **per-job queue** (the candidate backlog). `pursue`
extends that same autonomy ONE level up — to the **campaign-level "what next?"**
that otherwise gets handed back to the user as an A/B/C menu. The anti-pattern
it removes: ending a turn with *"next-move candidates: ① resume the stalled job
· ② fix the tooling gap · ③ fire the next wave — which?"* when **every one of
those branches is technically-resolvable**. That menu is the same
`발사대기 / awaiting-approval` anti-pattern the queue taxonomy (0.2.0) banned —
just at the campaign tier instead of the candidate tier.

**`pursue` enumerates EVERY open campaign thread and fans them ALL out in
parallel** (g24 research-parallel · g55 wall-time-first), no per-branch gate:

1. **Enumerate open threads** — sweep the campaign for every non-terminal,
   non-gated path:
   - **stalled-resumable** jobs (a job `STUCK`/`GONE`/`TIMEOUT-RESUMABLE` per the `tick` taxonomy that has recoverable state) → diagnose + resume
   - **tooling gaps** a job hit (a `hexa cloud`/CLI limitation) → fix-at-source + file upstream (g59), don't just work around
   - **queued waves** (`queue` candidates `queued`/`blocked:<technical>`) → fire / auto-resolve-then-fire
   - **cost-leaks** (orphan/idle/not-provisioned pods from `cloud reconcile`) → reconcile/teardown
   - **un-harvested terminals** → harvest → verdict
2. **Classify each** as `auto` (technically-resolvable → fan out) vs `gated:<human-only>` (credential · irreversible · genuine design decision → the ONLY kind that waits). A path is `gated` ONLY for a real human-input reason — "it's a judgment call about science direction" is usually NOT gated (pursue all viable directions in parallel, let evidence converge, g24).
3. **Fan out ALL `auto` threads** — one background Agent per thread (`run_in_background`, `isolation: worktree`), THROTTLE-CAPPED at ≤2-3 concurrent (parallel-agent-cap; queue the rest, dispatch as slots free). Each Agent prompt is self-contained + carries the g8/g5/checkpoint-commit/throttle-resume clauses.
4. **Report** the fan-out table + the (usually empty) `gated` list. End with the g56 progress block, NOT a menu.

**The invariant** (the reason `pursue` exists): a campaign turn NEVER ends with
*"which of these should I do?"* when the candidates are agent-resolvable. It ends
with *"I fanned out all N open paths; here's the table; M gated-for-human (if
any) wait."* The human's role shrinks to genuine gates, not routing.

`pursue` is the campaign-tier sibling of `/all-bg-go` (fan out prior-turn
branches) and `/cycle` (self-generating loop), specialized to the manifest's
job/queue/pod/upstream threads. Reuses the `tick` taxonomy (0.7.0) to classify
job-threads and the queue autonomy contract (0.2.0) to classify candidate-threads.

## stop / drive off — disengage self-driving

Clear the `pods.json` `drive.on` marker + cancel the pending ScheduleWakeup intent. Print `🛑 drive disengaged · <N> jobs still running (watchers stay armed) · queue <M> preserved`. Running jobs + watchers continue (stop only ends the AUTO re-dispatch loop, not the in-flight work).

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

## upstream [<repo>] — report the upstream-reflex trail (g59)

The reporting half of the `watch`/`harvest` **upstream-reflex** (when a `hexa cloud` / tooling gap surfaces, it's filed to the upstream repo's `INBOX.log.md` same-turn). `upstream` surfaces that trail — what this campaign/session pushed upstream — so "hexa upstream fix in this session" is a one-verb query, not a manual recall.

**Repos scanned**: the linked upstream repos from `pods.json` `upstream_repos` (array of repo paths/slugs); default `~/core/hexa-lang` (the cloud/CLI substrate) + any repo referenced by a job's `kind`. `/system upstream <repo>` scopes to one.

**⚠ Query origin/main + gh remote — NEVER the local working tree** (`git -C <repo> show origin/main:INBOX.log.md`, not a working-tree `grep <repo>/INBOX.log.md`). The local tree may be stale, on another branch, or unpulled → a false-empty result. This gap was found by dogfooding 0.4.0 (the upstream-reflex catching its own reporting bug).

**Procedure**:
1. **INBOX entries** — for each repo, scan origin/main (NOT the local tree): `git -C <repo> show origin/main:INBOX.log.md 2>/dev/null | grep -nE '^## .*(from <campaign>|RTSC|<campaign-tag>)'` (match the campaign tag the reflex stamped) → list date · slug. **Then parse each entry's own `🟠 OPEN` / `✅ RESOLVED` marker as the FIX status** — do NOT conflate "the entry's PR got merged" with "the fix landed". An INBOX **entry merged** only means the entry was recorded; the underlying fix may still be a 🟠 OPEN recommendation or a ✅ RESOLVED implementation. (Evidence this session: hexa-lang #1734 entry = ✅ RESOLVED implemented, but #1775 / #1828 entries = 🟠 OPEN recommendations despite their entry-PRs being merged.)
2. **Merged PRs** — `gh pr list --repo <owner/repo> --state merged --search "<campaign-tag> in:title,body" --json number,title,mergedAt --limit 20` → list PR# · title · mergedAt. (gh hits the remote — already correct, never the local tree.)
3. **Session scope** — if a `--since <ISO>` or the session-start time is known, filter to this session; else show the campaign-tagged trail.
4. Render — show BOTH the entry-merged state AND the parsed fix status as distinct columns:
```
🔗 upstream trail — <campaign> (g59 reflex · origin/main + gh)
═══════════════════════════════════════
<repo>
   #<PR>  <slug>                  entry:merged   fix:🟠 OPEN / ✅ RESOLVED   <mergedAt>
   ...
─── N filed · M entry-merged · K fix-open · L fix-resolved ───
```
Read-only (no filing here — that's the `watch`/`harvest` reflex). If a gap was hit THIS turn but not yet filed, flag it: `⚠ unfiled gap: <desc> — file to <repo>/INBOX (g59)`.

This makes the upstream contribution auditable: every cloud/tooling gap the campaign hit leaves a queryable trail, closing the loop between "hit a gap" → "filed upstream" → "report what was filed".

## Honest constraints (commons-aligned)
- **g8** — all pod ops via `hexa cloud {exec|run|nohup|copy-to|copy-from|poll|tail}`; never raw ssh/scp.
- **g5** — paste verify verdicts VERBATIM; never LLM-judge correctness.
- **g10/g57** — watchers detached + durable-logged + Monitor-attached to the LOG; no model-side tail/sleep-poll.
- **g62** — atlas register verified closed-forms at each terminal.
- **g63** — every job reaches a verdict tier; FALSIFIED is a CLOSED negative, never skipped.
- **g64** — declare + honor the budget cap; halt on breach.
- **g65** — `exports/<campaign>/ledger.json` is the typed surface; never let it drift from the manifest.
- **g59** — cloud/tooling gap → file upstream `INBOX.log.md` same-turn (`watch`/`harvest` reflex); `upstream` verb reports the trail.
- Reuses **`/cloud` (pods.json)** + **`/micro-exp` (sweep launch)** + **/atlas** + **/verify** — `/system` is the orchestration layer ABOVE them, not a replacement.

## Closure
End every verb with one status line — LEAD with the g56 progress bar + %:
```
🛰️ system: <campaign> ▓▓▓▓▓▓░░░░ NN% · jobs <terminal>/<total> · queue <N> · budget ▓▓░░ $<spent>/$<cap> · verdicts <🟢n 🟠n 🔴n> · loop <idle|watching|driving|draining>
```
The leading `▓▓▓▓▓▓░░░░ NN%` (10-cell bar + %) is mandatory on EVERY verb's closure (g56 — multi-step work always shows a % bar), not just status/drive.

Triggers — `/system`, `관제탑`, `캠페인 현황`, `전체 잡 현황`, `mission control`, `campaign status`,
`upstream fix in this session`, `hexa upstream fix`, `upstream trail`, `INBOX 올린 거`, `상류 기여`,
`자율주행`, `self-driving`, `drive`, `set and walk away`, `예산 걸고 알아서`, `campaign drive`, `자율 캠페인`, `멈춰`, `drive off`, `stop driving`,
`결과보고 추가발사`, `harvest 후 자동발사`, `자율 재발사 루프`, `control tower`, `잡 전부 모니터`.
