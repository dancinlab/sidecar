---
description: /cycle-full — depletion brainstorm before cycle, then auto-continue to depletion. Runs iterative brainstorm rounds on `$ARGUMENTS` until ideas deplete (cap 8 rounds), takes the deduplicated inventory as the next-list, fans out one background Agent per item, then self-continues (ScheduleWakeup) round-by-round with plain /cycle semantics — self-feeding from the domain's `## deferred` section — until the domain is DRAINED (open milestones = 0 AND deferred empty AND no other signal). Use when the goal needs width-first exhaustion before parallel execution; /cycle alone derives next-list from current context only (no phase-0 brainstorm).
argument-hint: "<seed-or-goal>"
allowed-tools: Agent, Bash, Read
---

Engage the `cycle` skill, but precede the next-list step with a **depletion brainstorm**.

1. **Brainstorm depletion (phase 0)** — for `$ARGUMENTS` (or current goal context if empty), run iterative brainstorm rounds. Each round generates ONLY ideas genuinely new vs prior rounds; stop when a new round produces no novel candidates (cap 8 rounds). State the final, deduplicated idea inventory as a numbered bullet list.
2. **Next-list** — take the depleted inventory as the next-list (no re-enumeration). If >8 items, cap at top 8 by impact + state which were deferred.
3. **Dup-race precheck** — same as `/cycle` step 2: for each item that names an INBOX handoff entry (slug/header present in `INBOX.log.md` in the current repo), run the 3-signal grep (A: locate the entry via `grep -niE -A6 '<slug>' INBOX.log.md`, then test its checkbox/status line against the resolved-class regex `(fixed|resolved|closed|landed|shipped|absorbed|superseded|merged|done|✅|🟢|- \[x\])` · B: `gh pr list --state merged --search "<slug>"` · C: `git log --all --grep="<slug>"`). Mark SKIP / PROCEED with reason. Print one judgement line per item.
4. **Parallel-plan** — print compact table `| # | item | subagent_type | iso | goal | precheck |` before dispatch (precheck = `SKIP <reason>` or `PROCEED`).
5. **Fan-out** — issue an `Agent` tool call **only for PROCEED rows** (each `run_in_background: true`, `isolation: "worktree"` if it edits code, fully self-contained prompt). SKIP rows do not get an Agent.
6. **Loop tail — auto-continue to depletion (DEPTH).** Phase 0 (brainstorm) runs ONCE per goal. After the first fan-out, `/cycle-full` is depletion-driving by default: subsequent rounds use plain `/cycle` semantics (no re-brainstorming) — each round self-feeds from open `- [ ]` milestones, else auto-seeds the next batch from the domain's `## deferred` section (Stage 1a PRIMARY signal) — and self-continues until the domain is DRAINED.

   **Depletion test (omit ScheduleWakeup) — only when ALL three hold:** (1) **open milestones = 0** (no `- [ ]` left in the snapshot), AND (2) **`deferred` is empty** (no `## deferred` section, or no still-open backlog item — all promoted + drained), AND (3) **no other seed signal** (user mention · prior-turn `/gap` shortlist · `/check`/`/end` follow-up · `<NAME>.log.md` tail open thread).

   - **NOT yet depleted** (open milestones > 0 OR `deferred` non-empty OR another signal) → the domain is NOT drained. **Self-continue: issue a `ScheduleWakeup` for the next round** (subsequent rounds run plain `/cycle`, no re-brainstorm), and end with:

     ```
     M agents launched (cycle-full · phase 0 brainstorm depleted at round N): <item labels>  [K skipped: <skipped labels with reasons>]

     ⏩ domain not depleted (open: <count> · deferred: <count>) — scheduled next round (plain /cycle, no re-brainstorm).
     ```

   - **DEPLETED** (all three hold) → do NOT ScheduleWakeup. Report closure and end with:

     ```
     M agents launched (cycle-full · phase 0 brainstorm depleted at round N): <item labels>  [K skipped: <skipped labels with reasons>]

     ✅ domain depleted (open milestones 0 · deferred empty · no other signal) — loop terminates. (Extend: /domain milestone <text> · switch: /domain set <other> · close: /end)
     ```

   (The per-round cap throttles WIDTH so each round stays reviewable; the auto-continue marches DEPTH-wise through the whole declared backlog. The user can interrupt at any round.)

Guardrails (per `cycle` SKILL.md): self-enumerate only when next work is genuinely inferable (else ask); disjoint items only; no destructive fan-out; cap >8 with confirm; no nesting; never silently drop a SKIP — always print the precheck reason; auto-continue stops at true depletion (never schedule a wake-up once all three depletion conditions hold).
