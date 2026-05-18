---
name: git-workflow
description: Follow safe git push practices so the wilson git-guard never has to block you — no force-push that rewrites shared history, force-with-lease only on your own branch with explicit opt-in. Use when pushing, especially to a shared or main branch. Companion to wilson-git-guard.
---

# Git workflow convention (companion to wilson-git-guard)

## Overview

`wilson-git-guard` denies a `git push` that carries `--force` / `-f` / a
`+refspec` (and `--force-with-lease` unless explicitly opted in). Force-push
rewrites remote history — the one git operation that can destroy a
collaborator's work irrecoverably. This skill teaches the safe convention so
the deny never fires.

## When to Use

- Any `git push`, especially to `main` or a shared branch
- After a rebase or amend, when a non-fast-forward push is tempting
- Cleaning up your own feature branch history

## The Convention

```
git push                         ✓ always fine (fast-forward)
git push --force / -f            ✗ blocked — rewrites shared history
git push origin +branch          ✗ blocked — +refspec is a force
git push --force-with-lease      ✗ blocked unless SIDECAR_ALLOW_
                                   FORCE_WITH_LEASE=1 (your branch only)
```

- **Never force-push a shared branch** (`main`, anything others build on).
  If history is wrong, fix forward with a new commit/revert — do not rewrite.
- **Own feature branch only** — if you must reshape your *own* unshared
  branch, prefer `--force-with-lease` (refuses if the remote moved under
  you) and opt in deliberately with `SIDECAR_ALLOW_FORCE_WITH_LEASE=1` for
  that session. Bare `--force` stays off — lease is the floor.
- **Never skip hooks** (`--no-verify`, `--no-gpg-sign`) to make a push pass;
  fix the underlying failure instead.

## If you are blocked anyway

The guard fired because the push would rewrite history. Don't re-issue it —
ask: does this branch belong to anyone else? If yes, fix forward. If it is
truly your own, switch to `--force-with-lease` and the documented per-session
opt-in. The opt-out exists for the deliberate own-branch case, not as a way
around the rule.
