---
description: /cycle-full — depletion brainstorm before cycle. Runs iterative brainstorm rounds on `$ARGUMENTS` until ideas deplete (cap 8 rounds), takes the deduplicated inventory as the next-list, then fans out one background Agent per item — same plan-table → fan-out → loop tail as /cycle. Use when the goal needs width-first exhaustion before parallel execution; /cycle alone derives next-list from current context only.
argument-hint: "<seed-or-goal>"
allowed-tools: Agent, Bash, Read
---

Engage the `cycle` skill, but precede the next-list step with a **depletion brainstorm**.

1. **Brainstorm depletion (phase 0)** — for `$ARGUMENTS` (or current goal context if empty), run iterative brainstorm rounds. Each round generates ONLY ideas genuinely new vs prior rounds; stop when a new round produces no novel candidates (cap 8 rounds). State the final, deduplicated idea inventory as a numbered bullet list.
2. **Next-list** — take the depleted inventory as the next-list (no re-enumeration). If >8 items, cap at top 8 by impact + state which were deferred.
3. **Dup-race precheck** — same as `/cycle` step 2: for each item that names an INBOX handoff entry (slug/header present in `INBOX.log.md` in the current repo), run the 3-signal grep (A: locate the entry via `grep -niE -A6 '<slug>' INBOX.log.md`, then test its checkbox/status line against the resolved-class regex `(fixed|resolved|closed|landed|shipped|absorbed|superseded|merged|done|✅|🟢|- \[x\])` · B: `gh pr list --state merged --search "<slug>"` · C: `git log --all --grep="<slug>"`). Mark SKIP / PROCEED with reason. Print one judgement line per item.
4. **Parallel-plan** — print compact table `| # | item | subagent_type | iso | goal | precheck |` before dispatch (precheck = `SKIP <reason>` or `PROCEED`).
5. **Fan-out** — issue an `Agent` tool call **only for PROCEED rows** (each `run_in_background: true`, `isolation: "worktree"` if it edits code, fully self-contained prompt). SKIP rows do not get an Agent.
6. **Loop bias** — end with:

```
M agents launched (cycle-full · phase 0 brainstorm depleted at round N): <item labels>  [K skipped: <skipped labels with reasons>]

Next: `/cycle` to enumerate + fan out the next round once results land (no re-brainstorming).
```

Guardrails (per `cycle` SKILL.md): self-enumerate only when next work is genuinely inferable (else ask); disjoint items only; no destructive fan-out; cap >8 with confirm; no nesting; never silently drop a SKIP — always print the precheck reason. Phase 0 (brainstorm) runs ONCE per goal — subsequent rounds use plain `/cycle` (current context derives next-list).
