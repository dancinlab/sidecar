---
description: /step-by-step — plan-first sequential runbook with FOUR modes along a question-density spectrum. GO (fewest questions) — no plan gate, execute end-to-end terse. AUTO — show plan, run straight through, no pause. MANUAL (default) — pause + consult after each step. FULL (most questions) — disambiguate FIRST: keep asking clarifying questions (AskUserQuestion) round after round until ZERO ambiguity remains, then run; re-ask whenever new ambiguity surfaces mid-run. First arg token `go` | `auto` | `manual` | `full` selects the mode (default manual); the rest is the task. The deliberate single-threaded counterpart to /cycle. `/sbs` is the short alias.
argument-hint: "[go|auto|manual|full] [<task> | empty = current task in context]"
---

# /step-by-step — plan-first sequential runbook

Input: `$ARGUMENTS`

You are running **`/step-by-step`**: decompose, then execute the task as an
ordered sequence of steps — the deliberate, single-threaded counterpart to
`/cycle` (which fans out in parallel). One thread, in order, top to bottom.

## Step 0 — parse mode + target

Read the FIRST whitespace-delimited token of the input — the FOUR modes form a
question-density spectrum (fewest → most questions):

```
go ────────── auto ────────── manual ────────── full
적게 묻기                                          많이 묻기
plan-gate 없음   계획+무중단      단계별 상의         모호함 0까지 질문
즉시 실행                        (기본)
```

- token is `go` → **GO** mode; task = remaining text.
- token is `auto` → **AUTO** mode; task = remaining text.
- token is `manual` → **MANUAL** mode; task = remaining text.
- token is `full` → **FULL** mode; task = remaining text.
- token is anything else (or input empty) → **MANUAL** mode (the default); task
  is the entire input.

Then resolve the target:

- task text non-empty → the target is that text.
- task empty → the target is the current work in context. State your assumption
  in one line (the uncommitted diff, else the task under discussion, else the
  repo at cwd) and proceed — do not stop to ask. **(Exception: FULL mode — an
  empty task is itself ambiguity; FULL asks rather than assumes.)**

State the chosen mode in one line, e.g. `mode: manual (pause + consult per step)`
· `mode: auto (run straight through)` · `mode: go (immediate · no plan gate)` ·
`mode: full (disambiguate to zero, then run)`.

## Step 0.5 — FULL mode disambiguation loop (FULL only — run BEFORE the plan)

In **FULL** mode, before decomposing, drive ambiguity to ZERO. This is the
"묻고 또 묻고" form — keep asking until nothing is unclear:

1. Enumerate EVERY open question about the target: unclear requirements, unstated
   constraints, edge-case behavior, naming/location choices, scope boundaries,
   success criteria, which-of-several-interpretations, tradeoff preferences.
2. Ask them in **AskUserQuestion** rounds (batch ≤4 per round). After each round,
   re-scan: did the answers resolve everything, or surface NEW questions? If new
   ambiguity appeared, ask another round. Repeat — round after round — until a
   scan finds **zero remaining ambiguity**.
3. Only then proceed to Step 1 (plan). State `🔍 disambiguation: <N> rounds ·
   ambiguity → 0` before planning.

Do NOT fabricate answers or assume in FULL mode — every unknown is a question.
The other three modes do the opposite (assume + proceed, state the assumption);
FULL is the high-question end of the spectrum for high-stakes / underspecified work.

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

- **GO** mode: skip the shown plan — derive the steps internally and go straight
  to execution (terse). The plan table is suppressed; only step result lines show.
- **AUTO · MANUAL · FULL**: show the plan, then begin. Never gate on plan
  approval (FULL already front-loaded its questions in Step 0.5).

## Step 2 — execute

Per step, always: print `▶ <i>/<N> — <step>` → do the work → print a one-line
result `✅` done · `⚠` done-with-caveat (note) · `❌` failed (cause).

The four modes differ in what happens between steps (and FULL also re-asks on
new ambiguity):

### GO — immediate, terse, no gate

No plan preamble (suppressed in Step 1), no pause between steps. Execute every
step top-to-bottom and report only result lines + closure. The fastest, most
trusting mode — for when the task is unambiguous and you want it done now.
(Halt conditions below still apply.)

### AUTO — run straight through

Execute the steps strictly top-to-bottom with **no pause and no user gate** —
flow straight into the next step. Plan is shown first, then it runs.

### FULL — disambiguate-to-zero, then run

After Step 0.5 drove ambiguity to 0, execute like AUTO (straight through, no
per-step pause). BUT if a step **surfaces NEW ambiguity** mid-run (an unforeseen
choice, an unexpected result needing a decision), STOP and ask another
AskUserQuestion round — resolve it to zero, then resume. FULL never guesses past
a fork; it asks. (Halt conditions below also apply.)

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
