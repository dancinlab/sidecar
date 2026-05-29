---
description: /cycle — autonomous work-loop driver: next-list (self-enumerate) → parallel-plan table → fan-out (one background Agent per item, same message) → auto-continue to DEPLETION. Bare `/cycle` self-drains the active domain's `## deferred` backlog batch-by-batch (self-continues via ScheduleWakeup each round; terminates only when open milestones = 0 AND deferred empty AND no other signal). Distinct from `all bg go` (that fans out PRIOR-turn branches; /cycle self-generates the next batch each round).
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read
---

Engage the `cycle` skill. In ONE message run all five stages:

**-1. Execution-mode marker (sticky fg/bg, run FIRST).** Read `~/.sidecar/cycle-mode` (`cat ~/.sidecar/cycle-mode 2>/dev/null`, default `bg` when absent/empty). This marker is set by `/cycle-fg` (→ `fg`) / `/cycle-bg` (→ `bg`) and is STICKY across the session:
   - marker = `fg` → run THIS round as `/cycle-fg` (foreground sequential · execute each PROCEED row inline one-at-a-time · halt on failure · NO background Agent fan-out). Banner: `mode: cycle (sticky fg ← ~/.sidecar/cycle-mode)`.
   - marker = `bg` (or absent) → run THIS round in the default background mode described below (parallel Agent fan-out + auto-continue). Banner: `mode: cycle (bg)`.
   The marker only changes how Stage 4 executes (fg=inline-sequential vs bg=Agent-fan-out); Stages 0-3 + Stage 5 are identical either way. Flip with `/cycle-fg` / `/cycle-bg`.

**0. SSOT-freshness pre-check (@D ssot_freshness) — RUN FIRST, before reading any milestone.** The whole loop trusts the working-tree `<NAME>.md`; if that is a stale/untracked shadow, the next-list AND the depletion verdict are both wrong. Fail-open probe (skip silently outside a git repo / no origin/main ref):
   - **untracked?** `git ls-files --error-unmatch <NAME>.md` nonzero ⇒ local-only copy shadowing the committed SSOT.
   - **behind main?** `git log --oneline HEAD..origin/main -- <NAME>.md` non-empty ⇒ origin/main has newer milestones/@goal your tree lacks.
   - If EITHER fires: SURFACE `⚠ stale-SSOT: <NAME>.md untracked|behind-main — reconcile before trusting milestones/depletion (git diff HEAD origin/main -- <NAME>.md · git checkout origin/main -- <NAME>.md)` and reconcile (or ask the user) before proceeding. Do NOT auto-overwrite — the user may hold intentional local edits. Evidence: anima LIFE on an orphan-recover branch untracked root LIFE.md → working tree was the stale "$0-frontier-closed" version (all `[x]`, no perpetual @goal) while origin/main held the live "perpetual engine" version with open axes → `/cycle` wrongly declared depletion.
   - **FILE-fresh ≠ CONTENT-fresh (@D ssot_freshness):** this probe only compares the FILE to origin/main. A `<NAME>.md` that MATCHES origin/main (probe PASSES) can STILL be content-stale — its checkboxes / an old-commit-anchored section lag the code reality. If the open-count is LARGE (≫ round cap) OR the doc has an old-commit anchor / `doc-lag · flip to [x]` / `GENUINELY OPEN @ <sha>` section, do NOT trust the file-fresh PASS: run Stage 2b scan-B on EVERY open item, evidence-flip the already-landed ones (reconciliation PR) FIRST, then enumerate the genuine remainder. Evidence: RUNTIME.md was file-fresh yet 88 Phase-1 boxes were stale-done (binary at 0 externs, #1058) — scan-B caught it, #1186 reconciled (129→41 open).
   - **Perpetual detection (@D perpetual_domain):** also scan the `@goal:` line for a perpetual marker (`종료 조건 없음` · `완료되지 않` · `100% 미도달` · `미도달 = 설계` · `영구` · `끝없` · `perpetual` · `open horizon` · `no termination`). If present, note `♾️ perpetual domain — Stage 5 will never emit a terminal closure`. (`/domain set` already badges this `♾️ perpetual`.)

1. **Next-list (self-enumerate, ACTIVE DOMAIN ONLY)** — read the session's active domain (`domain` skill's active-domain pointer; if none set, run `/domain set <NAME>` first and stop). Enumerate from the active `<NAME>.md` snapshot's open `- [ ]` milestone checkboxes (commons @D g58 — off-domain work is explicitly forbidden). If `$ARGUMENTS` is non-empty, intersect the enumeration with that scope. State in one line: active domain name + count of open milestones picked.

   **1a. Auto-seed on empty next-list** — if zero open milestones (snapshot at 100% closure or freshly initialized), do NOT punt back to the user; instead inspect the domain's declared backlog + recent conversation context for next-batch candidates and seed them into the snapshot before proceeding:

   - **Allowed signal sources** (priority, highest first):
     1. **The active `<NAME>.md`'s own `## deferred` section** — the domain's declared next-round backlog (a `## deferred` / `## deferred (다음 라운드)` header whose body lists `·`-separated or bulleted backlog items). This is the PRIMARY seed signal: the domain self-feeds from its own declared backlog. Pull the NEXT batch (cap N — see Cap below) of still-open items from `deferred`, promote each into the `## 진행 (milestones)` board as a `- [ ]` milestone via `/domain milestone <text>`, and remove the promoted items from the `deferred` section (edit `<NAME>.md` directly) so the backlog drains monotonically and the same item is never re-seeded.
     2. **Direct user mention** in this or the prior turn ("add X milestone", "신규 추가 후 cycle", explicit shortlist).
     3. **Prior-turn `/gap`** deep-dive priority shortlist · prior-turn `/check` or `/end` follow-up table.
     4. **The active `<NAME>.log.md` tail** (looser signal) when it surfaces an open thread the snapshot + `deferred` haven't yet captured.
   - **Seed action** — derive ≤N candidate milestones (each a concrete `- [ ]` task in the active domain's scope) and append them via `/domain milestone <text>` per item. Print one line per seeded item: `🌱 auto-seeded: <text> · source: deferred | user | gap | log-tail`. For `deferred`-sourced items, also drain them from the `## deferred` section in the same edit.
   - **Re-enumerate** — after seeding, re-read the snapshot and proceed to Stage 2 with the newly added items.
   - **No-signal fallback** — if context yields NO defensible candidate (domain truly closed: zero open milestones AND empty `deferred` AND no user hint / `/gap` / `/check` / log-tail signal), stop with one line: `🛑 no open milestones + empty deferred + no seed signal — choose: extend domain (/domain milestone <text>), switch (/domain set <other>), or close (/end)`. Do NOT fabricate off-domain items just to keep the loop running.
   - **Cap** — seed at most N items per /cycle invocation (default N = 3); further items wait for the next round so each batch stays reviewable. The cap throttles per-round WIDTH; the auto-continue in Stage 5 provides the DEPTH — bare `/cycle` self-drains the whole `deferred` backlog batch-by-batch to depletion (the `*-loop` variants add explicit continuous intent + ScheduleWakeup pacing, but bare `/cycle` is already depletion-driving by default).

2. **Dup-race precheck** — for each item whose label names a cross-repo handoff entry (in the `sidecar handoff` registry, `~/.sidecar/handoff/handoff.jsonl`), run a 3-signal grep before fan-out and mark SKIP / PROCEED:

   - **Signal A — handoff entry status:** `sidecar handoff ls | grep -iE '<slug>'` to locate the entry, then read its `STATUS` column — a `done` status (or `sidecar handoff ls` showing it closed) counts as resolved.
   - **Signal B — merged PR for slug:** `gh pr list --state merged --search "<slug>" --json number,title,mergedAt --limit 5` — any hit ⇒ resolved.
   - **Signal C — git log mentions slug as fix/close:** `git log --all --oneline --grep="<slug>" -n 5` plus a same-line resolved-class regex check (commit subjects like `fix(<slug>): …`, `close <slug>`, `land <slug>`).

   Treat as SKIP if **any** of A/B/C fires resolved-class; otherwise PROCEED. Print one judgement line per item: `precheck <slug>: SKIP (A:done) | PROCEED (no signal)`. Items whose label does NOT name a handoff entry bypass this scan (continue to Stage 2b below).

   **2b. Stale-milestone scan (@D dup_race_precheck scan-B)** — for each open `- [ ]` item, attempt to extract a stable label from the bolded portion (e.g., falsifier IDs like `F-FUSION-ATTENTION-FLASH`, RFC IDs like `RFC-072`, slug-shaped tokens with hyphens). If a label exists, scan resolved signals:
   - `gh pr list --state merged --search "<label>" --json number,title,mergedAt --limit 3`
   - `git log --all --oneline --grep="<label>" -n 3`

   Test hits against the same resolved-class regex `(fix|close|land|merge|done|resolved|shipped|absorbed|superseded)`. If ANY fires, mark `SKIP STALE — resolved by <PR#>/<sha>` and SURFACE BEFORE the plan table with: `→ flip \`[ ]\` → \`[x]\` in <domain>.md at line <N>` (suggestion only — do NOT auto-write the flip; user/parent acts). Items with no extractable label bypass scan-B (PROCEED). Evidence pattern: hexa-lang GPU.md §2 had `[ ]` items long-resolved by merged PRs (round-1 N206/N204 cycle) but unflipped — caught only by manual grep pre-fan-out.
3. **Parallel-plan** — print a compact table `| # | item | subagent_type | iso | resource | goal | precheck |` before dispatch (precheck = `SKIP <reason>` or `PROCEED`). The **resource** column (@D resource_contention) declares the exclusive resource each item touches: `GPU:<host>-timed` (exclusive — only ONE timed agent per host concurrently, parallel timed fires poison cuEvent walls), `GPU:<host>-any` (non-exclusive — ptxas/codegen/scp don't contend), `CPU-only` (default if absent), `Network`, `Filesystem:<repo>`.
   **Pre-fan-out worktree-leak sweep (@D worktree_leak_cleanup)** — between Stage 3 (plan) and Stage 4 (fan-out), sweep stale `/tmp/wt-*` linked worktrees left by dead/throttled agents. For each `/tmp/wt-*` listed by `git worktree list`, remove it if EITHER (a) its branch is fully merged into `origin/main` (`git branch --merged origin/main` contains it) OR (b) its HEAD age > 1h AND no commits in the last hour AND its branch matches a fan-out naming convention (`gpu-*`, `cycle-*`, the active `<domain>-*`). Run `git worktree remove <path>` (no `--force` — if blocked by uncommitted user work, log + skip) then `git branch -D <branch>` (only after worktree removal succeeded). Print one line per cleanup: `cleanup /tmp/wt-<name>: merged into main → removed`. NEVER touch worktrees outside `/tmp/wt-*` (user-managed `~/core/<repo>-*` worktrees are off-limits).

4. **Fan-out** — issue an `Agent` tool call **only for PROCEED rows** (each `run_in_background: true`, `isolation: "worktree"` if it edits code, fully self-contained prompt). SKIP rows do not get an Agent. **Resource-contention serialization (@D resource_contention)** — partition PROCEED rows by `resource`: items with DISTINCT or NON-EXCLUSIVE resource values fan out CONCURRENTLY (one msg, parallel Agents); items SHARING an EXCLUSIVE resource value (e.g. multiple `GPU:ubu-2-timed`) issue SEQUENTIALLY — dispatch the first, wait for its completion notification, then dispatch the next. Print one line before dispatch: `resource-partition: parallel=<N> · serial-chain=[res1: N1, res2: N2…]`.

   **Auto-inject (throttle resilience, @D throttle_resilience)** — every spawned Agent prompt MUST include these two clauses verbatim (copy-paste into the prompt body, near the top):

   - `CHECKPOINT-COMMIT each milestone (after kernel/oracle/measurement) to your worktree branch so a rate-limit death loses no work — run \`git add -A && git commit -m 'wip: <milestone>'\` in your isolated worktree before moving to the next milestone.`
   - `If you hit "Server is temporarily limiting requests (not your usage limit) · Rate limited", wait briefly and resume — the task remains valid; cite the last checkpoint commit SHA when you resume so the parent can see continuity.`

   **Parent-recovery on throttle death** — if the parent observes an Agent died mid-flight on a rate-limit error, re-fire it as a single-agent retry against the SAME worktree branch (the checkpoint commits are replay-safe). Reference pattern: memory `feedback-crash-recovery-artifact-pattern`.

   **Auto-inject (cross-cutting principles, @D principle_injection)** — before issuing each Agent, scan the active project's `MEMORY.md` for cross-cutting feedback memories (markers: hook line contains `ALL 도메인` · `모든 도메인` · `cross-cutting` · `cross-domain`, OR frontmatter `cross_cutting: true`, OR body has `**Cross-domain principle**:` / `**모든 도메인**:`). Pick UP TO 3 matched (highest signal = most recent in MEMORY.md). Inject a `Cross-cutting principles (active feedback memories — apply as governance constraints, cite verdicts through this lens)` block at the top of the spawned prompt body, listing each principle's description + key paragraph (≤300 chars each, total cap ≤1KB). Example principles often surfaced: `feedback-closure-is-physical-limit` (perf=roofline %, sandbox=open-frontier), `feedback-instrument-first-methodology` (cost-bearing measurement discipline). The agent MUST frame its verdicts through these lenses (e.g., report `% of roofline achieved` not just `ratio vs library X`).
5. **Loop tail — auto-continue to depletion (DEPTH).** After the fan-out, decide whether the active domain is DEPLETED and either self-continue or terminate. Bare `/cycle` is depletion-driving by default: it does NOT stop after one round while backlog remains.

   **Depletion test (omit ScheduleWakeup) — only when ALL three hold:**

   1. **Open milestones = 0** — re-read the active `<NAME>.md` snapshot; no `- [ ]` checkbox remains (this round drained the last batch), AND
   2. **`deferred` is empty** — the active `<NAME>.md` has no `## deferred` section, or its body holds no still-open backlog item (every item already promoted + drained in prior rounds), AND
   3. **No other seed signal** — no direct user mention, no prior-turn `/gap` shortlist, no `/check` / `/end` follow-up, no `<NAME>.log.md` tail open thread the snapshot + `deferred` haven't captured.

   - **NOT yet depleted** (open milestones > 0 OR `deferred` non-empty OR another signal exists) → the domain is NOT drained. **Self-continue: issue a `ScheduleWakeup` for the next round** (same depletion-aware mechanism the `*-loop` variants use), and end with:

     ```
     M agents launched (cycle N): <item labels>  [K skipped: <skipped labels with reasons>]

     ⏩ domain not depleted (open: <count> · deferred: <count>) — scheduled next round.
     ```

   - **$0-RUNNABLE LANE EXHAUSTED** (all three hold) → do NOT ScheduleWakeup. **But this is a PAUSE, not "100% done" (@D depletion_not_terminal · `feedback-closure-is-physical-limit`):** "no cheap runnable next task" ≠ "domain complete". For exploratory / perf / limit-bounded domains the frontier toward the **physical/math limit is OPEN** even when the $0 lane is empty (e.g. an intractable large-N exact computation, a not-yet-written larger spec, a cost-bearing GPU fire, a roofline not yet reached). Closure = approaching that limit, NOT a checkbox. So frame the stop as a lane-pause + open-frontier, never as terminal completion. End with:

     ```
     M agents launched (cycle N): <item labels>  [K skipped: <skipped labels with reasons>]

     ⏸️ $0-runnable lane exhausted (open milestones 0 · deferred empty · no $0 seed) — loop PAUSES (not 100%-done; the frontier toward the physical/math limit stays open per feedback-closure-is-physical-limit). Remaining paths live ABOVE the $0 lane:
       • cost-bearing fire (GPU/pod) — if the next step is runnable-but-not-free
       • new spec / larger structure — if the next step needs design first
       • intractable-limit note — if the remaining work is past the math/physical ceiling (record it as the limit, not as "done")
       • switch: /domain set <other> · close: /end
     ```

     Reserve a literal "✅ done / terminal" message ONLY for a genuinely FINITE-scope domain whose listed closure criteria are ALL met AND which has NO open physical-limit frontier (rare). When in doubt, PAUSE the lane — do not declare 100%.

   - **PERPETUAL domain override (@D perpetual_domain)** — if Stage 0 flagged the domain `♾️ perpetual` (its @goal declares no-termination), the exhaustion handling is STRICTER than the generic pause: (1) FIRST re-seed the next batch from the domain's own declared perpetual-axis backlog — an `## 영구 축` / `## perpetual axes` (or `## deferred`) section with open `- [ ]` — promote ≤N as milestones and **self-continue (ScheduleWakeup)** as if not depleted; (2) ONLY if that backlog is ALSO drained, end with the ♾️ form below. A perpetual domain NEVER prints `✅ … terminates` / `100% closure` — terminal closure contradicts its declared goal.

     ```
     M agents launched (cycle N): <item labels>  [K skipped: <skipped labels with reasons>]

     ♾️ perpetual domain — current-tier lane drained; NO terminal closure by declaration (per feedback-closure-is-physical-limit). The frontier stays OPEN:
       • re-seed declared axes — /domain milestone <next-axis task> (the perpetual @goal expects continuation)
       • cost-bearing / larger-spec tier — if the next axis needs a fire or design first
       • /schedule the next tier · switch: /domain set <other>
     ```

   (The per-round cap still throttles WIDTH so each round stays reviewable; the auto-continue marches DEPTH-wise through the whole declared backlog. The user can interrupt at any round.)

Guardrails (per SKILL.md): self-enumerate only when next work is genuinely inferable (else ask); disjoint items only; no destructive fan-out; cap >8 with confirm; no nesting; **never silently drop a SKIP — always print the precheck reason**; auto-continue stops at true depletion (never schedule a wake-up once all three depletion conditions hold).

## round-lint (@D round_lint) — every round self-audits before ending

At each round's tail (before the ScheduleWakeup / depletion call) emit a one-line round-lint verdict auditing that the round honored: (1) resource-partition declared — disjoint concurrent · shared-exclusive serial (@D resource_contention) · (2) every spawned Agent carried the checkpoint-commit + throttle-resume clause (@D throttle_resilience) · (3) dup-race precheck A+B ran, SKIPs surfaced (@D dup_race_precheck) · (4) worktree leak-sweep ran (@D worktree_leak_cleanup) · (5) per-round Agent count ≤ cap (default 3 · g66) · (6) any cross-repo handoff recorded as debt (@D handoff_debt_ledger) · (7) any ≥2-throttle-death milestone was split, not re-fired whole (@D oversized_split) · (8) each landed item reported with an HONEST verify tier (🔵/🟢/🟡/🟠/🔴, no over-claim · g3/g5) + a progress bar (g56) · (9) SSOT freshness checked before any depletion call (@D ssot_freshness) · (10) a perpetual domain emitted NO terminal closure (@D perpetual_domain). Emit `🔍 round-lint: <N>/10 ✓` and flag any ✗ with its rule id. A failing check is surfaced + corrected, never silently passed — never rubber-stamp a check that did not actually happen.

## oversized-milestone split (@D oversized_split)

Track per-milestone throttle-death count across the loop; on the 2nd consecutive rate-limit death of the SAME milestone (agent dies with no PR after a long tool-use run), STOP re-firing it whole — split into the smallest independently-landable sub-slices (e.g. promote-only → wire → calibrate) and fan each as its own bounded Agent, flip the parent only when all slices land. Do NOT split after a SINGLE transient death (retry whole first — split is the 2nd-death escalation); each slice MUST commit + PR alone. Evidence: VERIFY-KIT V5 died twice fired whole; split into V5.1 promote + V5.2 wire + V5.3 calibrate, each landing alone.

## handoff debt ledger (@D handoff_debt_ledger)

When a fan-out files a cross-repo handoff (g60), call `sidecar handoff add <repo> <text>` — the entry lands in the host-local registry (`~/.sidecar/handoff/handoff.jsonl`), NOT the target repo's working tree, so there is nothing to commit and no shared-tree hazard. Surface the filed handoff id in the round report (`handoff filed: <repo> [<id>]`). Close via `sidecar handoff done <id>` on resolution (g48 ack). Do NOT write a handoff into a target repo's working tree / per-repo INBOX file (the registry replaced that), and never drop a filed handoff id silently.

## /cycle-bg ↔ /micro-exp build-vs-fire decision (@D micro_exp_handoff · domain-agnostic)

When a candidate matrix is in context, walk the tree before dispatching:

```
candidate matrix in context?
├─ NO        → /kick                       (no candidates · discovery first)
└─ YES → dispatch infra exists for all candidates?
         ├─ NO       → /cycle-bg <domain>  (BUILD phase · each worktree agent writes its candidate's infra)
         ├─ PARTIAL  → /cycle-bg <domain>  (build the missing N) then /micro-exp <scope> (FIRE all)
         └─ YES      → /micro-exp <scope>  (FIRE phase only · pre-built infra assumed)
```

`/cycle-bg` = BUILD lane (build+fire integrated per worktree agent). `/micro-exp` = FIRE lane (Stage 1.5 auto-halts to the build phase on any missing prereq). Do NOT fan-out /cycle-bg as a fire phase when infra is already ready M/M (use /micro-exp directly), and do NOT fire /micro-exp on candidates with missing infra. Mirrored in skills/micro-exp/commands/micro-exp.md.

## Family — all drain to depletion, differ only in entry shape

All commands drain the active domain's `## deferred` backlog to DEPLETION (open milestones = 0 AND deferred empty AND no other signal). They share the per-round cap (WIDTH throttle), the full 5-stage structure, the plan table, the dup-race precheck, and the leak guardrails. They differ ONLY in how they enter and pace the loop:

- **`/cycle`** — plain entry. Self-generates the next batch from open milestones (else auto-seeds from `deferred`), then auto-continues via ScheduleWakeup each round until depletion. No phase-0 brainstorm; no external `loop` skill.
- **`/cycle-full`** — `/cycle` preceded by a one-time phase-0 depletion brainstorm (cap 8 rounds). After the first fan-out it auto-continues exactly like bare `/cycle`.
- **`/cycle-fg-loop`** — `/cycle-fg` handed to the built-in `loop` skill for continuous FOREGROUND-SEQUENTIAL intent + dynamic ScheduleWakeup pacing (each round inline one-at-a-time, halt on failure).
- **`/cycle-bg-loop`** — `/cycle-bg` handed to the `loop` skill for continuous BACKGROUND-PARALLEL intent + dynamic pacing (each round fans out one bg Agent per item, resource-serialized).
- **`/cycle-full-loop`** — `/cycle-full` once (brainstorm + first fan-out), then the `loop` skill with plain `/cycle` as the recurring payload.
- **`/cycle-all`** — "run everything": same 5 stages but NO per-round cap (enumerate the FULL open set + promote the ENTIRE `## deferred` in one round) and NO recommend/select gate — fan out EVERY PROCEED row. Keeps ALL safety guardrails including resource-contention serialization.
