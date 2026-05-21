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
  진행". The skill spawns ONE background Agent per branch in a SINGLE
  message — every direction proceeds concurrently.
allowed-tools: Agent, Bash, Read
---

# all-bg-go — fire every direction in parallel

## When to use

The previous assistant turn enumerated N candidate directions (options A/B/C, a multi-choice question, a list of alternative implementations, several files to refactor, several PRs to review, etc.) and would normally ask the user to pick one. The user instead says some variant of "all bg go" — the intent is **do not pick, do them all at once in the background**.

Use this skill any time that signal lands. Do not re-ask the user which one to do.

## How to fan out

1. **Enumerate the branches.** Look at the immediately-preceding assistant turn (the one the user just replied to). Extract every distinct direction it proposed — each AskUserQuestion option, each numbered alternative, each "we could…" branch. If a direction itself contains sub-choices that are independent, treat the sub-choices as separate branches too.

2. **Decide isolation.** For each branch, decide if it edits files:
   - **Read-only / research / planning** → no worktree needed.
   - **Edits code or repo state** → use `isolation: "worktree"` so parallel agents do not clash on the same files. Worktrees auto-clean up if the agent makes no changes.

3. **Dispatch in ONE message.** Send a single assistant message containing N `Agent` tool calls — one per branch. Set `run_in_background: true` on every one. Each Agent prompt MUST be self-contained: include the goal, the relevant context the parent agent has, paths/files to touch, and what "done" looks like for that branch. Do not write "see the plan" or "based on the prior discussion" — the sub-agent has no view of this conversation.

4. **Pick the subagent_type per branch:**
   - Open-ended research / multi-file lookup → `Explore` or `general-purpose`
   - Code review of a diff / PR → use the `code-review` or `review` skill, or spawn `general-purpose` with a code-review brief
   - Implementation plan → `Plan`
   - Code change + verification → `general-purpose`
   - If unsure → `general-purpose`

5. **Confirm tersely.** After dispatch, output one short message listing what was launched (`N agents launched in parallel: …`) and stop. Do NOT poll or sleep — the harness notifies on completion.

## Example

Previous assistant turn:
> We could approach the auth refactor three ways:
> A) rip out the middleware and inline the checks
> B) keep the middleware, swap the token store
> C) introduce a new service boundary

User: `all bg go`

Correct response: one message, three `Agent` calls in parallel, each with `run_in_background: true` and `isolation: "worktree"` (since all three edit code). Each prompt fully briefs that specific branch (goal, constraints, files, definition of done). Then a one-line confirmation.

## Guardrails

- **Do not fan out destructive or irreversible actions** (force-push, prod deploys, sending external messages, dropping data). If a branch is destructive, surface that and ask before dispatching.
- **Do not invent branches.** Only fan out directions the prior turn actually offered. If the prior turn offered one direction (or zero), tell the user there is nothing to fan out and ask what they want fanned.
- **Cap at reasonable N.** If the prior turn offered >8 branches, ask the user to confirm before launching all of them.
- **Do not nest fan-out.** Sub-agents should not themselves invoke `all-bg-go`.
