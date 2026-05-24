---
description: /cycle — autonomous work-loop driver: next-list (self-enumerate) → parallel-plan table → fan-out (one background Agent per item, same message) → loop. Repeat `/cycle` to march through a goal in parallel batches. Distinct from `all bg go` (that fans out PRIOR-turn branches; /cycle self-generates the next batch each round).
argument-hint: "[scope hint]"
allowed-tools: Agent, Bash, Read
---

Engage the `cycle` skill. In ONE message run all five stages:

1. **Next-list (self-enumerate, ACTIVE DOMAIN ONLY)** — read the session's active domain (`domain` skill's active-domain pointer; if none set, run `/domain set <NAME>` first and stop). Enumerate from the active `<NAME>.md` snapshot's open `- [ ]` milestone checkboxes (commons @D g58 — off-domain work is explicitly forbidden). If `$ARGUMENTS` is non-empty, intersect the enumeration with that scope. State in one line: active domain name + count of open milestones picked.

   **1a. Auto-seed on empty next-list** — if zero open milestones (snapshot at 100% closure or freshly initialized), do NOT punt back to the user; instead inspect the recent conversation context for next-batch candidates and seed them into the snapshot before proceeding:

   - **Allowed signal sources** (priority): direct user mention in this or the prior turn ("add X milestone", "신규 추가 후 cycle", explicit shortlist) · prior-turn `/gap` deep-dive priority shortlist · prior-turn `/check` or `/end` follow-up table · the active `<NAME>.log.md` tail when it surfaces an open thread the snapshot hasn't yet captured.
   - **Seed action** — derive ≤3 candidate milestones (each a concrete `- [ ]` task in the active domain's scope) and append them via `/domain milestone <text>` per item. Print one line per seeded item: `🌱 auto-seeded: <text> · source: <signal>`.
   - **Re-enumerate** — after seeding, re-read the snapshot and proceed to Stage 2 with the newly added items.
   - **No-signal fallback** — if context yields NO defensible candidate (domain truly closed, no follow-up signals, no user hint), stop with one line: `🛑 no open milestones + no seed signal — choose: extend domain (/domain milestone <text>), switch (/domain set <other>), or close (/end)`. Do NOT fabricate off-domain items just to keep the loop running.
   - **Cap** — seed at most 3 items per /cycle invocation; further items wait for the next round so the user can steer between batches.

2. **Dup-race precheck** — for each item whose label names an INBOX handoff entry (slug/header present in `INBOX.log.md` in the current repo), run a 3-signal grep before fan-out and mark SKIP / PROCEED:

   - **Signal A — INBOX entry status:** `grep -niE -A6 '<slug>' INBOX.log.md` to locate the entry, then test its checkbox/status line against the resolved-class regex `(fixed|resolved|closed|landed|shipped|absorbed|superseded|merged|done|✅|🟢|- \[x\])`. A `- [x]` checkbox or `Status: resolved` under the entry counts.
   - **Signal B — merged PR for slug:** `gh pr list --state merged --search "<slug>" --json number,title,mergedAt --limit 5` — any hit ⇒ resolved.
   - **Signal C — git log mentions slug as fix/close:** `git log --all --oneline --grep="<slug>" -n 5` plus a same-line resolved-class regex check (commit subjects like `fix(<slug>): …`, `close <slug>`, `land <slug>`).

   Treat as SKIP if **any** of A/B/C fires resolved-class; otherwise PROCEED. Print one judgement line per item: `precheck <slug>: SKIP (A:[x] done) | PROCEED (no signal)`. Items whose label does NOT name an INBOX entry bypass precheck (always PROCEED).
3. **Parallel-plan** — print a compact table `| # | item | subagent_type | iso | goal | precheck |` before dispatch (precheck = `SKIP <reason>` or `PROCEED`).
4. **Fan-out** — issue an `Agent` tool call **only for PROCEED rows** (each `run_in_background: true`, `isolation: "worktree"` if it edits code, fully self-contained prompt). SKIP rows do not get an Agent.
5. **Loop bias** — end with:

```
M agents launched (cycle N): <item labels>  [K skipped: <skipped labels with reasons>]

Next: `/cycle` to enumerate + fan out the next round once results land.
```

Guardrails (per SKILL.md): self-enumerate only when next work is genuinely inferable (else ask); disjoint items only; no destructive fan-out; cap >8 with confirm; no nesting; **never silently drop a SKIP — always print the precheck reason**.
