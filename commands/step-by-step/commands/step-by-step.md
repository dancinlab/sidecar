---
description: /step-by-step — plan-first sequential runbook with TWO modes. MANUAL (default) — decompose into a numbered plan, then execute ONE step at a time, pausing after each to report + consult before advancing (collaborative). AUTO — execute every step in order without pausing (halt only on failure / irreversible step). First arg token `manual` | `auto` selects the mode (default manual); the rest is the task. The deliberate single-threaded counterpart to /cycle. `/sbs` is the short alias.
argument-hint: "[manual|auto] [<task> | empty = current task in context]"
---

# /step-by-step — plan-first sequential runbook

Input: `$ARGUMENTS`

You are running **`/step-by-step`**: decompose, then execute the task as an
ordered sequence of steps — the deliberate, single-threaded counterpart to
`/cycle` (which fans out in parallel). One thread, in order, top to bottom.

## Step 0 — parse mode + target

Read the FIRST whitespace-delimited token of the input:

- token is `manual` → **MANUAL** mode; the task is the remaining text.
- token is `auto` → **AUTO** mode; the task is the remaining text.
- token is anything else (or input empty) → **MANUAL** mode (the default); the
  task is the entire input.

Then resolve the target:

- task text non-empty → the target is that text.
- task empty → the target is the current work in context. State your assumption
  in one line (the uncommitted diff, else the task under discussion, else the
  repo at cwd) and proceed — do not stop to ask.

State the chosen mode in one line, e.g. `mode: manual (pause + consult per step)`
or `mode: auto (run straight through)`.

## Step 1 — plan (always shown)

Decompose the target into an **ordered, numbered list of concrete steps**. Each
step is one logical, independently-verifiable unit of work, small enough that
its result is a clear ✅ / ⚠ / ❌. Order by hard dependency — a step may only
depend on steps above it.

```
📋 plan (N steps)
 1. <step>
 2. <step>
 ...
 N. <step>
```

Do not gate on plan approval in either mode — the plan is shown, then you begin.

## Step 2 — execute

Per step, always: print `▶ <i>/<N> — <step>` → do the work → print a one-line
result `✅` done · `⚠` done-with-caveat (note) · `❌` failed (cause).

The two modes differ ONLY in what happens between steps:

### MANUAL (default) — pause + consult per step

After each step's result line, **STOP and hand control back to the user**:

```
⏸ step <i>/<N> done. next → <i+1>. <next step>
   proceed? (continue / adjust / skip / stop)
```

Then **end your turn** — do not start the next step. Wait for the user to steer:
they may say continue/go/next (→ do exactly the next ONE step, then pause
again), or correct the plan, skip a step, or stop. This is the collaborative
default: the user is in the loop at every step boundary, actually consulting
rather than watching an auto-run scroll by.

(A pure read/inspection step whose output the user needs in order to decide may
be run and folded into the ⏸ pause — but never advance past a step that
*changes* state without the user's go-ahead.)

### AUTO — run straight through

Execute the steps strictly top-to-bottom with **no pause and no user gate** —
flow straight into the next step. This is the old single-shot behavior, now
opt-in via the `auto` token.

## Halt conditions (BOTH modes)

Regardless of mode, stop and report — never blindly continue — when:

- a step **fails** (`❌`): report which step, the verbatim error, and the
  remaining un-run steps; let the user decide.
- the next step is **irreversible, destructive, or outward-facing** (deploy,
  publish, force-push, mass-delete, send): pause for explicit confirmation, then
  resume. Same bar as the `bypass` self-check. (In MANUAL mode every step
  already pauses; this just means such a step must NEVER be run even under a
  blanket "continue" without a specific confirmation.)

## Closure

After the last step (or when the run ends), print:

```
🏁 <done>/<N> steps complete
```

If it halted early, print where it stopped, why, and the remaining un-run tail.
