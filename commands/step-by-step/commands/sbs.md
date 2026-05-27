---
description: /sbs — short alias for /step-by-step. Plan-first sequential runbook, FOUR modes on a question-density spectrum. GO (fewest Q) — no plan gate, execute end-to-end terse. AUTO — show plan, run straight through. MANUAL (default) — pause + consult per step. FULL (most Q) — disambiguate FIRST: keep asking until ZERO ambiguity, then run; re-ask on new mid-run ambiguity. First arg token `go`|`auto`|`manual`|`full` picks the mode (default manual); rest is the task. Sequential counterpart to /cycle.
argument-hint: "[go|auto|manual|full] [<task> | empty = current task in context]"
---

# /sbs — alias for /step-by-step

Input: `$ARGUMENTS`

`/sbs` is the short alias for **`/step-by-step`** — identical semantics. FOUR
modes, fewest → most questions: `go ── auto ── manual ── full`.

1. **Parse mode + target** — first token `go` → GO · `auto` → AUTO · `manual` →
   MANUAL · `full` → FULL · anything else / empty → MANUAL (default). The rest
   (or whole input) is the task; empty task → current work in context (state the
   assumption, don't ask — EXCEPT FULL, which asks). Announce the mode in one line.
2. **(FULL only) Disambiguate** — before planning, run AskUserQuestion rounds
   (≤4/round) until a scan finds ZERO remaining ambiguity (round after round —
   "묻고 또 묻고"). State `🔍 disambiguation: <N> rounds · ambiguity → 0`.
3. **Plan** — ordered, numbered, dependency-ordered steps (`📋 plan (N steps)`).
   GO suppresses the shown plan (terse); AUTO/MANUAL/FULL show it. No approval gate.
4. **Execute** — per step: `▶ i/N — <step>` → work → `✅` / `⚠` / `❌`.
   - **GO**: no plan preamble, no pause — straight through, result lines only.
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
