---
name: docs-convention
description: Write repo-root README.md and UPPERCASE.md roadmaps to the wilson doc conventions up front so the format guards never block the write — single-glyph H1, English At-a-glance fence, no #### heading, roadmap = Head + --- + ## Log. Companion to wilson-readme-format and wilson-guards (domain-lint).
---

# Docs convention (companion to wilson-readme-format + wilson-guards/domain-lint)

## Overview

Two guards reject a structurally wrong doc at write time: `wilson-readme-format`
on a repo-root `README.md`, and `wilson-guards`/domain-lint on a root
`UPPERCASE.md` topic roadmap. Both are deny-only — trip one and you burn a
recovery turn. This skill states the conventions so the write lands clean the
first time.

## When to Use

- Creating or editing a repo-root `README.md`
- Creating or editing a root `UPPERCASE.md` domain roadmap
- Drafting the cold-entry top section of either

## The Convention

```
README.md (repo root)            UPPERCASE.md roadmap
─────────────────────            ────────────────────
# 🦝 One glyph H1   ✓            <Head — title + intro prose>
# 🦝🧶 multi-glyph   ✗            ---
#### deep heading    ✗            ## Log
At-a-glance fence:                - newest-at-bottom, append-only
  English only       ✓            (never rewrite prior entries)
  CJK in fence       ✗
```

- **README H1** — exactly one Unicode glyph (or pure ASCII) in the first
  `#` line. No multi-emoji prefix.
- **No `####`** — depth stops at `###`; push deeper material into `docs/`.
- **At-a-glance fence** — the eye-catcher code fence near the top is
  English-only; put CJK / localized prose in the per-row body below it.
- **Roadmap shape** — a root `UPPERCASE.md` is `Head` + `---` + `## Log`;
  the log is append-only, newest entries at the bottom, prior entries never
  rewritten.

## If you are blocked anyway

The guard message names the exact violation and line. Don't re-save the same
content — fix the structure (collapse the H1 to one glyph, demote the `####`,
move CJK out of the fence, restore the `Head + --- + ## Log` shape) and write
again. A documented per-session opt-out exists for genuine false positives,
but the convention is the intended path.
