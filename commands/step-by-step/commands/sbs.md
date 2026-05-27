---
description: /sbs — short alias for /step-by-step. Plan-first sequential runbook, THREE modes on a question-density spectrum. AUTO (fewest Q) — show plan, run straight through. MANUAL (default) — pause + consult per step. FULL (most Q) — disambiguate FIRST: keep asking until ZERO ambiguity, then run; re-ask on new mid-run ambiguity. First arg token `auto`|`manual`|`full` picks the mode (default manual); rest is the task. Sequential counterpart to /cycle. (For "continue the paused flow" use the separate /go command.)
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
2. **(FULL only) Disambiguate** — before planning, run AskUserQuestion rounds
   (≤4/round) until a scan finds ZERO remaining ambiguity (round after round).
   State `🔍 disambiguation: <N> rounds · ambiguity → 0`.
3. **Plan** — ordered, numbered, dependency-ordered steps (`📋 plan (N steps)`),
   shown in all modes. No approval gate.
4. **Execute** — per step: `▶ i/N — <step>` → work → `✅` / `⚠` / `❌`.
   - **AUTO**: no pause between steps — flow straight through.
   - **FULL**: run straight through, BUT stop + ask another round if a step
     surfaces NEW ambiguity (never guess past a fork), then resume.
   - **MANUAL (default)**: after each step STOP — `⏸ step i/N done. next → …
     proceed? (continue / adjust / skip / stop)` and **end the turn**. Next ONE
     step only on user go; consult at every boundary.
5. **Halt (all modes)** — on step failure (report step + verbatim error + un-run
   tail) or before an irreversible / destructive / outward-facing step (confirm
   then resume) — same bar as the `bypass` self-check.
6. **Closure** — `🏁 <done>/<N> steps complete`.
