---
description: /sbs — short alias for /step-by-step. Plan-first sequential runbook, THREE modes on a question-density spectrum. AUTO (fewest Q) — show plan, run straight through. MANUAL (default) — pause + consult per step. FULL (most Q) — disambiguate FIRST in CHAT form (1 question/round, 7-element scaffold — icon · name · alias · plain-line · analogy · ASCII · compare-table · recommendation; free-form answers OK) until ambiguity → 0, then show a "🎯 이거 맞아요?" ASCII agreement screen of the accumulated decision set — user types `go` to confirm or `Qn=<other>` to flip just that decision; re-ask in chat on new mid-run ambiguity (re-render agreement screen + wait for `go` before resuming). First arg token `auto`|`manual`|`full` picks the mode (default manual); rest is the task. Sequential counterpart to /cycle. (For "continue the paused flow" use the separate /go command.)
argument-hint: "[auto|manual|full] [<task> | empty = current task in context]"
---

# /sbs — alias for /step-by-step

Input: `$ARGUMENTS`

`/sbs` is the short alias for **`/step-by-step`** — identical semantics. THREE
modes, fewest → most questions: `auto ── manual ── full`.

1. **Parse mode + target** — first token `auto` → AUTO · `manual` → MANUAL ·
   `full` → FULL · anything else / empty → MANUAL (default). The rest (or whole
   input) is the task; empty task → current work in context (state the assumption,
   don't ask — EXCEPT FULL, which asks). Announce the mode in one line. (`go` is
   NOT a mode — `/go` is a separate continue-the-paused-flow command.)
2. **(FULL only) Disambiguate in CHAT** — before planning, ask ONE question per
   round in chat (NOT AskUserQuestion), each round using the easy-mode 7-element
   scaffold (icon · name · alias · plain-line · analogy · ASCII · compare-table
   · recommendation · `→ A · B · 또는 자유응답`). Repeat round-by-round until a
   scan finds ZERO remaining ambiguity. State `🔍 disambiguation: <N> rounds ·
   ambiguity → 0`. (Fallback: a small closed option set on user request may use
   AskUserQuestion for that one round — chat is the default.)
3. **(FULL only) Agreement screen** — render the accumulated decision set as
   one ASCII tree and pause:
   ```
   🎯 합의된 결정셋 (N개)
   ┌─ Q1: <axis>  → ✅ <chosen>
   ├─ Q2: <axis>  → ✅ <chosen>
   └─ Qn: <axis>  → ✅ <chosen>
   요약: <one-line restatement>
   → 맞으면 `go` · 수정은 `Qn=<다른 선택>` (예: `Q2=B`)
   ```
   On `go` → advance to step 4. On `Qn=<X>` → update only that decision, re-render.
4. **Plan** — ordered, numbered, dependency-ordered steps (`📋 plan (N steps)`),
   shown in all modes. No approval gate (FULL already had its pre-commit at step 3).
5. **Execute** — per step: `▶ i/N — <step>` → work → `✅` / `⚠` / `❌`.
   - **AUTO**: no pause between steps — flow straight through.
   - **FULL**: run straight through, BUT stop + ask another CHAT round if a step
     surfaces NEW ambiguity (never guess past a fork), append to decision set,
     re-render the agreement screen, wait for `go`, then resume.
   - **MANUAL (default)**: after each step STOP — `⏸ step i/N done. next → …
     proceed? (continue / adjust / skip / stop)` and **end the turn**. Next ONE
     step only on user go; consult at every boundary.
6. **Halt (all modes)** — on step failure (report step + verbatim error + un-run
   tail) or before an irreversible / destructive / outward-facing step (confirm
   then resume) — same bar as the `bypass` self-check.
7. **Closure** — `🏁 <done>/<N> steps complete`.
