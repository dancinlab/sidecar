---
description: /sbs — short alias for /step-by-step. Plan-first sequential runbook, TWO modes. MANUAL (default) — plan, then execute ONE step at a time, pausing after each to consult before advancing. AUTO — run every step in order without pausing. First arg token `manual`|`auto` picks the mode (default manual); rest is the task. Sequential counterpart to /cycle.
argument-hint: "[manual|auto] [<task> | empty = current task in context]"
---

# /sbs — alias for /step-by-step

Input: `$ARGUMENTS`

`/sbs` is the short alias for **`/step-by-step`** — identical semantics:

1. **Parse mode + target** — first token `manual` → MANUAL · `auto` → AUTO ·
   anything else / empty → MANUAL (default). The rest (or whole input) is the
   task; empty task → current work in context (state the assumption, don't ask).
   Announce the mode in one line.
2. **Plan** — print an ordered, numbered list of concrete, independently-
   verifiable steps (`📋 plan (N steps)`), dependency-ordered. Show it; no
   approval gate.
3. **Execute** — per step: `▶ i/N — <step>` → do the work → `✅` / `⚠` / `❌`.
   - **MANUAL (default)**: after each step, STOP — print `⏸ step i/N done. next
     → …  proceed? (continue / adjust / skip / stop)` and **end the turn**. Do
     the next ONE step only when the user says go; consult at every boundary.
   - **AUTO**: no pause between steps — flow straight through (old behavior,
     opt-in).
4. **Halt (both modes)** — on a step failure (report step + verbatim error +
   un-run tail) or before an irreversible / destructive / outward-facing step
   (confirm then resume) — same bar as the `bypass` self-check.
5. **Closure** — `🏁 <done>/<N> steps complete`.
