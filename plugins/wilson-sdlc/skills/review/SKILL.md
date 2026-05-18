---
name: review
description: Review a change across six axes — correctness, readability, architecture, security, performance, and conformance to the design.md decision ledger. Use before merging any change written by you, another agent, or a human. Stage 5 of the wilson-sdlc pipeline.
---

# Review (wilson-sdlc · stage 5/7)

## Overview

Review before merge across six axes. The first five are the standard quality
dimensions; the sixth — **decision-conformance** — is the wilson-specific one:
does the diff actually match the decisions recorded in `design.md`? A change
that is clean code but silently contradicts a logged decision is a defect.

## When to Use

- Before merging any change (yours, another agent's, or a human's)
- After stage 4 (test & recover) passes
- Whenever a diff is about to leave a branch

## The Six Axes

```
1 correctness            does it do what the spec/task says?
2 readability            will the next reader understand it fast?
3 architecture           right seams, no needless coupling/abstraction?
4 security               input trust, secrets, authz, injection?
5 performance            no N+1, no accidental O(n²), hot-path cost?
6 decision-conformance   ── wilson ──  does the diff match every
                          relevant ### Decision N in design.md?
                          a contradiction is a blocking finding.
```

For each axis, produce categorized, actionable findings (blocking vs.
non-blocking). Axis 6 is concrete: open `design.md`, list the decisions the
diff touches, and verify the implementation honors each picked option — if it
diverges, either the code is wrong or a new gated decision is owed.

## Output

A short report grouped by axis, each finding marked **blocking** or **nit**,
each with a file:line and a suggested fix. No blocking findings on axes 1–6 →
hand off to stage 6 (simplify).

## Fallback

If `design.md` does not exist (no spec stage was run), axis 6 degrades to
"does this match the stated intent of the change" — still ask the question,
just against the PR description instead of the ledger.
