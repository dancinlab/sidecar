---
description: /sbs — short alias for /step-by-step. Plan-first sequential runbook — decompose the task into a numbered plan, then auto-execute every step in order (no gates between steps), halting only on a step failure or before a genuinely irreversible / outward-facing step. The sequential counterpart to /cycle.
argument-hint: "[<task> | empty = current task in context]"
---

# /sbs — alias for /step-by-step

Task: `$ARGUMENTS`

`/sbs` is the short alias for **`/step-by-step`**. Run it with identical
semantics:

1. **Resolve target** — the argument text, else the current work in context
   (state the assumption in one line, don't ask).
2. **Plan** — print an ordered, numbered list of concrete, independently-
   verifiable steps (`📋 plan (N steps)`), dependency-ordered. Show it; do not
   gate on approval.
3. **Execute in order** — strictly top-to-bottom, one at a time (not parallel —
   that is `/cycle`). Per step: `▶ i/N — <step>` → do the work → `✅` / `⚠` /
   `❌` result line. No pause between steps.
4. **Halt** only on a step failure (report the step + verbatim error + un-run
   tail) or before an irreversible / destructive / outward-facing step (confirm,
   then resume) — same bar as the `bypass` self-check.
5. **Closure** — `🏁 <done>/<N> steps complete`.
