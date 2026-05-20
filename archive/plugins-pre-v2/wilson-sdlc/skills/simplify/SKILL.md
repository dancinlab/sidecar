---
name: simplify
description: Run the built-in /simplify on the change, then re-check that the simplification did not violate a design.md decision. Use after review passes and before ship, when code works but may be denser than it needs to be. Stage 6 of the wilson-sdlc pipeline.
---

# Simplify (wilson-sdlc · stage 6/7)

## Overview

Do not re-implement code simplification — Claude Code already ships a
maintained `/simplify` skill. This stage *sequences* it into the pipeline and
adds the one wilson-specific guard: after simplifying, re-check that the
leaner code still honors every relevant `design.md` decision (the same
decision-conformance thread as stage 5). Simplification that quietly drops a
decided behavior is a regression, not a cleanup.

## When to Use

- After stage 5 (review) passes, before stage 7 (ship)
- Code works but is harder to read/maintain/extend than it should be
- A change accreted complexity while being made correct

**When NOT to use:** a change that is already minimal, or a hotfix where churn
is riskier than the existing density.

## The Workflow

```
reviewed change ──→ /simplify (built-in) ──→ design.md re-check ──→ ship
                         │                        │
                    reuse / dedupe /        does the simpler form
                    deadcode / clarity      still satisfy every
                    (Anthropic-maintained)  relevant ### Decision N?
```

1. **Invoke the built-in** — run `/simplify` on the changed code; let the
   maintained skill do the reuse/quality/efficiency pass.
2. **Decision re-check** — for each `design.md` decision the change touched,
   confirm the simplified code still implements the picked option. If the
   simplification removed or altered decided behavior, restore it or open a
   new gated decision — never silently drop it.
3. **Hand off** — leaner, still-conformant code feeds stage 7 (ship).

## Fallback

If the built-in `/simplify` is unavailable, do a manual reuse/dedupe/deadcode
pass — then run the same `design.md` re-check regardless. The re-check is the
wilson-specific value and is not optional.
