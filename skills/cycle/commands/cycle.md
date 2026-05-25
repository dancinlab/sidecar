---
description: /cycle — autonomous work-loop driver: next-list (self-enumerate) → parallel-plan table → fan-out (one background Agent per item, same message) → auto-continue to DEPLETION. Bare `/cycle` self-drains the active domain's `## deferred` backlog batch-by-batch (self-continues via ScheduleWakeup each round; terminates only when open milestones = 0 AND deferred empty AND no other signal). Distinct from `all bg go` (that fans out PRIOR-turn branches; /cycle self-generates the next batch each round).
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read
---

Engage the `cycle` skill. In ONE message run all five stages:

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

2. **Dup-race precheck** — for each item whose label names an INBOX handoff entry (slug/header present in `INBOX.log.md` in the current repo), run a 3-signal grep before fan-out and mark SKIP / PROCEED:

   - **Signal A — INBOX entry status:** `grep -niE -A6 '<slug>' INBOX.log.md` to locate the entry, then test its checkbox/status line against the resolved-class regex `(fixed|resolved|closed|landed|shipped|absorbed|superseded|merged|done|✅|🟢|- \[x\])`. A `- [x]` checkbox or `Status: resolved` under the entry counts.
   - **Signal B — merged PR for slug:** `gh pr list --state merged --search "<slug>" --json number,title,mergedAt --limit 5` — any hit ⇒ resolved.
   - **Signal C — git log mentions slug as fix/close:** `git log --all --oneline --grep="<slug>" -n 5` plus a same-line resolved-class regex check (commit subjects like `fix(<slug>): …`, `close <slug>`, `land <slug>`).

   Treat as SKIP if **any** of A/B/C fires resolved-class; otherwise PROCEED. Print one judgement line per item: `precheck <slug>: SKIP (A:[x] done) | PROCEED (no signal)`. Items whose label does NOT name an INBOX entry bypass this scan (continue to Stage 2b below).

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

   (The per-round cap still throttles WIDTH so each round stays reviewable; the auto-continue marches DEPTH-wise through the whole declared backlog. The user can interrupt at any round.)

Guardrails (per SKILL.md): self-enumerate only when next work is genuinely inferable (else ask); disjoint items only; no destructive fan-out; cap >8 with confirm; no nesting; **never silently drop a SKIP — always print the precheck reason**; auto-continue stops at true depletion (never schedule a wake-up once all three depletion conditions hold).
