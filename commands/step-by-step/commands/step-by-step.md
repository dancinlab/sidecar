---
description: /step-by-step — plan-first sequential runbook. Decompose the task into an ordered, numbered plan, then execute every step IN ORDER without pausing between steps, narrating each step's start + ✅/⚠/❌ result, halting only on a step failure or before a genuinely irreversible / outward-facing step. The deliberate single-threaded counterpart to /cycle's parallel fan-out. Bare = the task in context. `/sbs` is the short alias.
argument-hint: "[<task> | empty = current task in context]"
---

# /step-by-step — plan-first sequential runbook

Task: `$ARGUMENTS`

You are running **`/step-by-step`**: decompose, then execute the task as an
ordered sequence of steps — the deliberate, single-threaded counterpart to
`/cycle` (which fans out in parallel). One thread, in order, top to bottom.

## Step 1 — resolve the target

- arguments non-empty → the target is the argument text.
- arguments empty → the target is the current work in context. State your
  assumption in one line (the uncommitted diff, else the task under discussion,
  else the repo at cwd) and proceed — do not stop to ask.

## Step 2 — plan (show, don't gate)

Decompose the target into an **ordered, numbered list of concrete steps**. Each
step is one logical, independently-verifiable unit of work, small enough that
its result is a clear ✅ / ⚠ / ❌. Order by hard dependency — a step may only
depend on steps above it.

Print the plan as a compact list:

```
📋 plan (N steps)
 1. <step>
 2. <step>
 ...
 N. <step>
```

Do **not** wait for approval. The plan is shown for transparency, then you run
it immediately (plan-first **auto-execute**).

## Step 3 — execute in order (no gates)

Run the steps **strictly top-to-bottom, one at a time** — not in parallel (that
is `/cycle`'s job). For each step:

1. Print the marker `▶ <i>/<N> — <step>`.
2. Do the work for that step.
3. Print a one-line result: `✅` done · `⚠` done-with-caveat (one-line note) ·
   `❌` failed (one-line cause).

Between steps there is **no pause and no user gate** — flow straight into the
next step.

### Halt conditions (auto-run is not "ignore everything")

Stop the run and report — do not blindly continue — when:

- a step **fails** (`❌`): report which step, the verbatim error, and the
  remaining un-run steps; let the user decide how to proceed.
- the next step is **irreversible, destructive, or outward-facing** (deploy,
  publish, force-push, mass-delete, send): pause at that one step for explicit
  confirmation, then resume. Same bar as the `bypass` self-check — reversible
  local steps auto-run; non-reversible ones confirm first.

## Step 4 — closure

After the last step, print a one-line summary:

```
🏁 <done>/<N> steps complete
```

If the run halted early, instead print where it stopped and why, plus the
remaining steps as an un-run tail.
