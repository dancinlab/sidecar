---
name: test-and-recover
description: Run heavy tests/builds on a remote pool host, and on failure switch to systematic root-cause debugging instead of guessing. Use when tests fail, builds break, or behavior does not match expectations. Stage 4 of the wilson-sdlc pipeline.
---

# Test & Recover (wilson-sdlc · stage 4/7)

## Overview

There is no separate "test" and "debug" — a test that fails is the start of a
root-cause hunt. Route heavy test/build runs through `wilson-pool` to a roster
host, then, on failure, debug by hypothesis and isolation rather than by
guessing-and-rerunning. This stage combines the verification and recovery
steps that addyosmani keeps as one (`debugging-and-error-recovery`).

## When to Use

- Verifying an increment from stage 3 (build)
- Tests fail, builds break, or behavior diverges from the spec
- A heavy/long/GPU test would block the local session
- An unexpected error appears and the cause is not obvious

## The Workflow

```
heavy test ──→ wilson-pool ──→ roster host (e.g. linux)
                                   │
                              pass ┴ fail
                               │      │
                            stage 5   ▼
                            (review)  ROOT-CAUSE LOOP
                                      reproduce → hypothesize →
                                      isolate (bisect/log) →
                                      confirm cause → fix → re-run
```

1. **Route** — heavy build/test/compile/GPU runs go through `wilson-pool`;
   it ships the command to a roster host so the local session stays free.
2. **On pass** → hand off to stage 5 (review).
3. **On fail — root-cause loop, not guess loop:**
   - Reproduce reliably (smallest failing case).
   - Form one hypothesis about the cause; predict what you'd observe.
   - Isolate — bisect, add a targeted log/assert, narrow the surface.
   - Confirm the actual cause before changing code (no shotgun fixes).
   - Fix the cause, not the symptom; re-run the same minimal case.
4. **Regression-guard** — keep the minimal failing case as a test if one is
   missing; a bug without a test invites its own return.

## Fallback

If `wilson-pool` is absent, run tests locally (slower for heavy jobs). The
root-cause discipline is tool-independent — it is the part that matters.
