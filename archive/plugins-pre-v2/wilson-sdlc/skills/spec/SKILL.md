---
name: spec
description: Write a spec before code, gated decision by decision. Use when starting a new project, feature, or significant change and no specification exists yet. Use when requirements are ambiguous, the change touches multiple files, or an architectural choice is in play. Stage 1 of the wilson-sdlc pipeline.
---

# Spec (wilson-sdlc · stage 1/7)

## Overview

Code without a spec is guessing. Write the spec into `design.md` and gate each
branch point through `wilson-decision-gate`, with `AGENTS.md` as the SSOT for
project rules. The spec is the shared source of truth: what we build, why, and
how we know it is done. This stage maps onto sidecar primitives you already
have — it does not reinvent a spec format.

## When to Use

- Starting a new project, feature, or significant change
- Requirements are ambiguous, vague, or only an idea
- The change touches multiple files or modules
- An architectural decision is in play
- The task would take more than ~30 minutes to implement

**When NOT to use:** single-line fixes, typo corrections, mechanical edits, or
changes whose requirements are unambiguous and self-contained.

## The Gated Workflow

```
SPECIFY ──→ each branch point ──→ design.md ledger ──→ IMPLEMENT
   │              │                      │                 │
   ▼              ▼                      ▼                 ▼
 AGENTS.md   wilson-decision-gate   ### Decision N      stage 2: plan
 (SSOT)      (one gate per pick)    (audit trail)
```

1. **SPECIFY** — state the goal, constraints, and done-criteria in prose. Pull
   project rules from the nearest `AGENTS.md` (`## Governance`) — that is the
   SSOT; do not restate or contradict it.
2. **Gate each decision** — for every branch point (name, scope, enforcement
   layer, API shape, …) present options + a recommendation + 3+ rationale
   bullets, then wait for the pick. One decision per gate, never batched.
3. **Record** — each pick lands as a `### Decision N` block in `design.md`
   (`/wilson-decision-gate decide "<picked>" "<b1>;<b2>;<b3>"`). The audit
   trail is part of the deliverable, not an afterthought.
4. **Hand off** — a validated spec + decision ledger feeds stage 2 (plan).

## Fallback

If `wilson-decision-gate` is not installed, still write the spec and a plain
`## Decisions` list into `design.md` by hand — the discipline (decide one
branch at a time, record why) is what matters; the plugin only automates it.
