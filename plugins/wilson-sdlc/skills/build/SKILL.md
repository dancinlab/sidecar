---
name: build
description: Implement in small verifiable increments on a feature branch, checkpointing so a usage limit or crash never loses work, landing one PR. Use when implementing any planned task that touches more than one file. Stage 3 of the wilson-sdlc pipeline.
---

# Build (wilson-sdlc · stage 3/7)

## Overview

Deliver changes as small, verifiable increments — not one big diff. Implement
on a feature branch (optionally a `git worktree` for isolation), commit per
increment, and `wilson-checkpoint` so a usage-limit reset or crash resumes
instead of restarts. One task → small commits → one PR.

## When to Use

- Implementing a planned task (stage 2) that touches more than one file
- About to write a large amount of code at once (stop — split it)
- Work that spans a usage-limit window or risks interruption

**When NOT to use:** a one-line fix that is its own atomic change.

## The Workflow

```
feature branch ┐
               ├─ commit ✓ checkpoint
               ├─ commit ✓ checkpoint   ← limit / crash here
               └─ commit ✓ checkpoint      → resume, not restart
                    ↓
                  one PR
```

1. **Isolate** — implement on a dedicated feature branch; use `git worktree
   add` if you want the main checkout to stay untouched.
2. **Increment** — one logical change per commit; each commit should leave the
   tree buildable. Trace every changed line to the task.
3. **Checkpoint** — `wilson-checkpoint` after meaningful increments so a 5am
   limit reset or a crash resumes from the last good state, losing nothing.
4. **Hand off** — a coherent branch + PR feeds stage 4 (test & recover).

## Fallback

No `wilson-checkpoint` → commit more often and push to a remote; the
durable-progress property comes from frequent, pushed commits either way.
