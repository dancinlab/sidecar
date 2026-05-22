---
name: all-bg-go
description: |
  Parallel fan-out trigger. Invoke when the IMMEDIATELY-PRECEDING assistant
  turn offered the user multiple branches, options, directions, or candidate
  approaches (e.g., "we could do A, B, or C" / AskUserQuestion options /
  numbered alternatives in a plan), and the user — instead of picking one —
  responds with a fan-out signal like "all bg go", "all bg", "다 병렬",
  "전부 병렬 발사", "전부 다 가자", "fan it all out", "do them all in
  parallel", "ship every branch", "explode it", "병렬로 다", "전 방향
  진행". The skill first prints a one-shot parallel-plan table (branch ·
  subagent_type · isolation · one-line goal), then spawns ONE background
  Agent per branch in the SAME message — plan visible, then every direction
  proceeds concurrently. TWO modes: prior-turn (fan out branches the
  previous turn offered) and self-enumerate (if no prior branches, the
  skill derives the next viable work items itself, then fans them out) —
  making `all bg go` a repeatable next-list → fan-out → loop driver.
allowed-tools: Agent, Bash, Read
---

# all-bg-go — plan-then-fire every direction in parallel

## When to use

The user says some variant of "all bg go" — the intent is **do not pick, do them all at once in the background**. Two cases:

- **Prior-turn mode** — the previous assistant turn enumerated N candidate directions (options A/B/C, a multi-choice question, a list of alternatives, files to refactor, PRs to review) and would normally ask the user to pick one. Fan those out.
- **Self-enumerate mode** — the prior turn offered no explicit branches, but the user wants to keep going. The skill ITSELF enumerates the next viable work items from the current context (open tasks, the obvious next steps, the remaining items on a todo/roadmap, independent sub-problems of the current goal), then fans them out. This makes `all bg go` a repeatable **next-list → fan-out → loop** driver.

Use this skill any time the signal lands. Do not re-ask the user which one to do.

## How to fan out (plan-then-fire, one message)

1. **Enumerate the branches.**
   - **Prior-turn mode**: look at the immediately-preceding assistant turn (the one the user just replied to). Extract every distinct direction it proposed — each AskUserQuestion option, each numbered alternative, each "we could…" branch. If a direction itself contains sub-choices that are independent, treat them as separate branches.
   - **Self-enumerate mode** (prior turn had no branches): derive the next viable work items yourself — remaining roadmap/todo entries, independent sub-tasks of the active goal, the obvious "what's next" set. Keep them disjoint (parallelizable). State in one line that you self-enumerated (so the user can redirect).

2. **Decide per-branch dispatch parameters.** For each branch decide:
   - `subagent_type` — `Explore` / `general-purpose` (research · multi-file lookup), `Plan` (implementation plan only), `code-review` / `review` (PR review), `general-purpose` (code change + verification). Default: `general-purpose`.
   - `isolation` — `"worktree"` if the branch edits files (parallel agents would otherwise clash). Omit for read-only / research / planning.
   - `goal` — one-line, action-oriented (verb + object + done-state).

3. **Print the plan FIRST in the same message.** Before the Agent tool calls, output a compact markdown table so the plan is visible to the user:

   ```
   Parallel plan — N branches:

   | # | label | subagent_type | iso | goal |
   |---|---|---|---|---|
   | 1 | A    | general-purpose | wt | <one-line goal> |
   | 2 | B    | general-purpose | wt | <one-line goal> |
   | 3 | C    | code-review     | —  | <one-line goal> |
   ```

   `iso` column: `wt` = worktree, `—` = none. Keep the table tight (one row per branch).

4. **Dispatch in the SAME message — N Agent calls.** Right after the plan table, issue N `Agent` tool calls in one message — one per branch. Set `run_in_background: true` on every one. Each Agent prompt MUST be self-contained: include the goal, the relevant context the parent agent has, paths/files to touch, and what "done" looks like for that branch. Do not write "see the plan" or "based on the prior discussion" — the sub-agent has no view of this conversation.

5. **Confirm tersely after dispatch.** End the message with exactly this shape:

   ```
   N agents launched in parallel: <branch labels>

   Next iteration: `all bg go` to fan out the next round of branches once results land.
   ```

   The trailing line is intentional — it biases Claude Code's prompt-suggestion-generator (the ghost-text auto-suggest in the TUI input box) toward proposing `all bg go` again, so the user can keep firing rounds with one keystroke. In self-enumerate mode this closes the loop: each `all bg go` generates the next batch of work and fans it out, so the user marches through a whole goal by repeating one phrase.

   Do NOT poll or sleep — the harness notifies on completion.

## Example

Previous assistant turn:
> We could approach the auth refactor three ways:
> A) rip out the middleware and inline the checks
> B) keep the middleware, swap the token store
> C) introduce a new service boundary

User: `all bg go`

Correct response (one message):

```
Parallel plan — 3 branches:

| # | label | subagent_type   | iso | goal |
|---|---|---|---|---|
| 1 | A    | general-purpose | wt  | rip middleware, inline checks at the 4 call sites, tests green |
| 2 | B    | general-purpose | wt  | keep middleware, swap token store from Redis to DB, tests green |
| 3 | C    | general-purpose | wt  | extract auth-service boundary, gRPC contract + 1 caller migrated |
```

(then 3 `Agent` tool calls in parallel — each `run_in_background: true`, `isolation: "worktree"`, fully self-briefed prompt)

```
3 agents launched in parallel: A, B, C

Next iteration: `all bg go` to fan out the next round of branches once results land.
```

## Guardrails

- **Do not fan out destructive or irreversible actions** (force-push, prod deploys, sending external messages, dropping data). If a branch is destructive, surface that in the plan table (mark `iso=—` with a `⚠ destructive` note in `goal`) and ask before dispatching that row.
- **Self-enumerate only when the next work is genuinely inferable.** In self-enumerate mode, derive branches from concrete context — a roadmap/todo, the active goal's independent sub-tasks, an obvious "what's next" set. If you genuinely can't infer disjoint next work (no active goal, ambiguous state), THEN ask what to fan out — don't fabricate filler branches. Prior-turn mode never invents: it fans exactly what the prior turn offered.
- **Cap at reasonable N.** If the prior turn offered >8 branches, print the plan table and ask the user to confirm before launching all of them (the plan table makes the cost visible).
- **Do not nest fan-out.** Sub-agents should not themselves invoke `all-bg-go`.
