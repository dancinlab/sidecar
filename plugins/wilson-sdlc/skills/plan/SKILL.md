---
name: plan
description: Break a validated spec into ordered, dependency-aware tasks and persist the objective across compaction. Use when you have a spec or clear requirements and need to decompose work, or when a task feels too large to start. Stage 2 of the wilson-sdlc pipeline.
---

# Plan (wilson-sdlc · stage 2/7)

## Overview

A spec says *what*; a plan says *in what order*. Decompose the spec into
implementable, ordered tasks via the task tools, and persist the high-level
objective with `wilson-goal` so it survives a long session and context
compaction. The plan is disposable; the objective is not.

## When to Use

- A spec exists (stage 1) and work must be broken down
- A task feels too large to start in one pass
- Work spans multiple files, modules, or sessions
- The objective risks being lost across a long, compaction-prone session

**When NOT to use:** a single self-contained change that is its own task.

## The Workflow

```
spec ──→ decompose ──→ TaskCreate (ordered) ──→ wilson-goal set
              │              │                        │
              ▼              ▼                        ▼
        smallest         addBlockedBy            objective survives
        shippable        deps between            SessionStart /
        increments       tasks                   PostCompact
```

1. **Decompose** — split the spec into the smallest independently-shippable
   increments. Each increment = one task.
2. **Order** — `TaskCreate` each task; wire real dependencies with
   `addBlockedBy` / `addBlocks` so the sequence is explicit, not implied.
3. **Persist the objective** — `wilson-goal set "<one-line objective>"` so the
   *why* is restored at every SessionStart and PostCompact, outside the
   transcript that gets compacted away.
4. **Hand off** — the ordered task list feeds stage 3 (build), one increment
   at a time.

## Fallback

If `wilson-goal` is absent, put the objective at the top of `design.md` and
re-read it after any compaction. If the task tools are unavailable, a numbered
checklist in `design.md` is the minimum viable plan — ordering and dependency
are the point, the tool is not.
