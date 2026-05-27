---
description: /step-by-step — plan-first sequential runbook with THREE modes along a question-density spectrum. AUTO (fewest questions) — show plan, run straight through, no pause. MANUAL (default) — pause + consult after each step. FULL (most questions) — disambiguate FIRST in CHAT form (1 question/round with analogy + ASCII + recommendation; free-form answers OK), keep asking round after round until ambiguity → 0, then show a "🎯 이거 맞아요?" ASCII agreement screen of the accumulated decision set BEFORE planning — user types `go` to confirm or `Qn=<other>` to flip just that decision; re-ask whenever new ambiguity surfaces mid-run. First arg token `auto` | `manual` | `full` selects the mode (default manual); the rest is the task. The deliberate single-threaded counterpart to /cycle. `/sbs` is the short alias. (For "continue the paused flow" use the separate `/go` command, not a mode here.)
argument-hint: "[auto|manual|full] [<task> | empty = current task in context]"
---

# /step-by-step — plan-first sequential runbook

Input: `$ARGUMENTS`

You are running **`/step-by-step`**: decompose, then execute the task as an
ordered sequence of steps — the deliberate, single-threaded counterpart to
`/cycle` (which fans out in parallel). One thread, in order, top to bottom.

## Step 0 — parse mode + target

Read the FIRST whitespace-delimited token of the input — the THREE modes form a
question-density spectrum (fewest → most questions):

```
auto ────────── manual ────────── full
fewest Q          (default)          most Q
plan + run      pause + consult     ask until ambiguity = 0,
straight        each step           then run
```

- token is `auto` → **AUTO** mode; task = remaining text.
- token is `manual` → **MANUAL** mode; task = remaining text.
- token is `full` → **FULL** mode; task = remaining text.
- token is anything else (or input empty) → **MANUAL** mode (the default); task
  is the entire input.

(`go` is NOT a mode here — `/go` is a separate command for "continue the paused
flow / proceed with the last proposal". Don't conflate them.)

Then resolve the target:

- task text non-empty → the target is that text.
- task empty → the target is the current work in context. State your assumption
  in one line (the uncommitted diff, else the task under discussion, else the
  repo at cwd) and proceed — do not stop to ask. **(Exception: FULL mode — an
  empty task is itself ambiguity; FULL asks rather than assumes.)**

State the chosen mode in one line, e.g. `mode: manual (pause + consult per step)`
· `mode: auto (run straight through)` · `mode: full (disambiguate to zero, then run)`.

## Step 0.5 — FULL mode disambiguation loop (FULL only — run BEFORE the plan)

In **FULL** mode, before decomposing, drive ambiguity to ZERO. This is the
"묻고 또 묻고" form — keep asking until nothing is unclear.

**Form = CHAT, not selectbox.** AskUserQuestion's 4-option select-box stacks
up to 4 axes per round, which spikes cognitive load on design/teaching tasks
where the user is reasoning their way through unfamiliar territory. FULL asks
**ONE question per round in chat**, with the easy-style 7-element scaffolding
so each round is itself a tiny lesson. Free-form answers are explicitly OK
(`A` / `B` / `다른 안: <text>`) — the user is never funneled into a fixed
option grid.

1. **Enumerate** EVERY open question about the target: unclear requirements,
   unstated constraints, edge-case behavior, naming/location choices, scope
   boundaries, success criteria, which-of-several-interpretations, tradeoff
   preferences. Hold the list internally — do not dump it at the user; you'll
   feed them one at a time.

2. **Ask one at a time, in chat (NOT AskUserQuestion).** Each round is one
   question, formatted with the easy-mode 7 elements when the question is
   non-trivial:
   - **아이콘** — visual anchor for the axis (e.g. 🍳 🧶 🔌)
   - **이름 / 별칭** — the canonical axis name + friendly alias
   - **하는 일** — one-line plain restatement of what the choice controls
   - **비유** — everyday analogy (cooking / weaving / wiring …)
   - **ASCII** — fenced sketch of the option space (tree / side-by-side / before-after)
   - **비교 표** — option-by-option markdown table with the relevant axes
   - **추천** — one-line "I'd pick X because Y" (the user can override)
   Close every round with: `→ A · B · 또는 자유응답 (예: "다른 안: …")`.
   The user replies in chat (one token or free text); record the answer to the
   internal decision set and move on.

3. After each round, re-scan: did the answer resolve everything, or surface
   NEW questions? If new ambiguity appeared, ask another round (one chat-form
   question). Repeat — round after round — until a scan finds **zero remaining
   ambiguity**.

4. Then proceed to **Step 0.6 (agreement screen)** — NOT directly to plan.
   State `🔍 disambiguation: <N> rounds · ambiguity → 0`.

Do NOT fabricate answers or assume in FULL mode — every unknown is a chat
question. The other two modes do the opposite (assume + proceed, state the
assumption); FULL is the high-question end of the spectrum for high-stakes /
underspecified work.

(Fallback — when chat doesn't fit, e.g. the question genuinely has a small
closed option set and the user has signalled they prefer the picker, you MAY
use AskUserQuestion for that one round. The default is chat.)

## Step 0.6 — agreement screen ("🎯 이거 맞아요?")  (FULL only — between Step 0.5 and Step 1)

Once `ambiguity → 0`, **do NOT jump straight to the plan**. Pause and render
the accumulated decision set as one ASCII tree so the user can confirm the
whole picture at a glance — the round-by-round chat scrolled by, but the
collected decisions are what plan execution will lock in.

```
🎯 합의된 결정셋 (N개)
┌─ Q1: <axis name>     → ✅ <chosen option>
├─ Q2: <axis name>     → ✅ <chosen option>
├─ Q3: <axis name>     → ✅ <chosen option>
└─ Qn: <axis name>     → ✅ <chosen option>

요약: <one-line restatement of what the plan will actually build>
→ 맞으면 `go` · 수정은 `Qn=<다른 선택>` (예: `Q2=B` 또는 `Q3=다른 안: <text>`)
```

End the turn and wait for the user. On reply:

- **`go`** (or `예`/`yes`/`맞아`) — advance to Step 1 (plan). The decision set
  is now locked.
- **`Qn=<X>`** — update ONLY that decision in the set, keep the others, then
  re-render the agreement screen. The user may flip several in sequence; each
  flip re-renders.
- **`Qn=다른 안: <text>`** — free-form revision; record + re-render.
- **substantive new ambiguity** in the reply ("그런데 X는 어떻게 하지?") —
  treat it as a new Step 0.5 round (one chat question with the 7 elements),
  then return to the agreement screen.

The agreement screen is the **plan's pre-commit checkpoint** — last cheap
moment to flip a decision before plan execution makes some of them expensive
to undo.

## Step 1 — plan

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

Show the plan, then begin (all three modes). Never gate on plan approval —
FULL already front-loaded its questions in Step 0.5.

## Step 2 — execute

Per step, always: print `▶ <i>/<N> — <step>` → do the work → print a one-line
result `✅` done · `⚠` done-with-caveat (note) · `❌` failed (cause).

The three modes differ in what happens between steps (and FULL also re-asks on
new ambiguity):

### AUTO — run straight through

Execute the steps strictly top-to-bottom with **no pause and no user gate** —
flow straight into the next step. Plan is shown first, then it runs.

### FULL — disambiguate-to-zero, then run

After Step 0.5 drove ambiguity to 0 AND the user `go`-ed the Step 0.6
agreement screen, execute like AUTO (straight through, no per-step pause).
BUT if a step **surfaces NEW ambiguity** mid-run (an unforeseen choice, an
unexpected result needing a decision), STOP and ask another **chat-form**
round (one question, 7-element scaffold per Step 0.5) — resolve to zero, then
re-render the agreement screen with the new decision appended, wait for
`go`, then resume. FULL never guesses past a fork; it asks. (Halt conditions
below also apply.)

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
