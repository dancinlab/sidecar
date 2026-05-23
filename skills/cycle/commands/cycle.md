---
description: /cycle — autonomous work-loop driver: next-list (self-enumerate) → parallel-plan table → fan-out (one background Agent per item, same message) → loop. Repeat `/cycle` to march through a goal in parallel batches. Distinct from `all bg go` (that fans out PRIOR-turn branches; /cycle self-generates the next batch each round).
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read
---

Engage the `cycle` skill. In ONE message run all five stages:

1. **Next-list (self-enumerate, ACTIVE DOMAIN ONLY)** — read the session's active domain (`domain` skill's active-domain pointer; if none set, run `/domain set <NAME>` first and stop). Enumerate from the active `<NAME>.md` snapshot's open `- [ ]` milestone checkboxes (commons @D g58 — off-domain work is explicitly forbidden). If `$ARGUMENTS` is non-empty, intersect the enumeration with that scope. State in one line: active domain name + count of open milestones picked.
2. **Dup-race precheck** — for each item whose label names an inbox patch slug (matches `inbox/**/<slug>.md` in the current repo), run a 3-signal grep before fan-out and mark SKIP / PROCEED:

   - **Signal A — patch file Status:** `grep -iE '(^|\s)(\*\*)?status(\*\*)?\s*[:：]' inbox/**/<slug>.md` then test the matched line against the resolved-class regex `(fixed|resolved|closed|landed|shipped|absorbed|superseded|merged|done|✅|🟢)`. Body strings like `Status: fixed` / `**status**: resolved-ssot` / `🟢 RESOLVED` count.
   - **Signal B — merged PR for slug:** `gh pr list --state merged --search "<slug>" --json number,title,mergedAt --limit 5` — any hit ⇒ resolved.
   - **Signal C — git log mentions slug as fix/close:** `git log --all --oneline --grep="<slug>" -n 5` plus a same-line resolved-class regex check (commit subjects like `fix(<slug>): …`, `close <slug>`, `land <slug>`).

   Treat as SKIP if **any** of A/B/C fires resolved-class; otherwise PROCEED. Print one judgement line per item: `precheck <slug>: SKIP (A:Status=fixed) | PROCEED (no signal)`. Items whose label does NOT match an inbox slug bypass precheck (always PROCEED).
3. **Parallel-plan** — print a compact table `| # | item | subagent_type | iso | goal | precheck |` before dispatch (precheck = `SKIP <reason>` or `PROCEED`).
4. **Fan-out** — issue an `Agent` tool call **only for PROCEED rows** (each `run_in_background: true`, `isolation: "worktree"` if it edits code, fully self-contained prompt). SKIP rows do not get an Agent.
5. **Loop bias** — end with:

```
M agents launched (cycle N): <item labels>  [K skipped: <skipped labels with reasons>]

Next: `/cycle` to enumerate + fan out the next round once results land.
```

Guardrails (per SKILL.md): self-enumerate only when next work is genuinely inferable (else ask); disjoint items only; no destructive fan-out; cap >8 with confirm; no nesting; **never silently drop a SKIP — always print the precheck reason**.
