---
description: Update or create an UPPERCASE <DOMAIN>.md at project root in completed-form (overwrite, not append; no history inside the file). Example — /domain ROADMAP "Q3 priorities: X, Y, Z" → writes/updates <project-root>/ROADMAP.md as current snapshot only.
argument-hint: "<DOMAIN> [update directive]"
allowed-tools: Read, Write, Edit, Bash
---

Engage the `domain` skill with arguments: `$ARGUMENTS`

First arg = `<DOMAIN>` (UPPERCASE filename root, no extension — `ROADMAP` → `ROADMAP.md`).
Rest of args = the update directive (free text).

Process:
1. Resolve target: `<project-root>/<DOMAIN>.md` where project-root = `git rev-parse --show-toplevel` output.
2. If exists: Read current → integrate directive → overwrite via Write.
3. If new: scaffold minimal structure (`# <Domain> — <subject>` + body) and write directive content.
4. Recap in 1 line — `git diff` shows the actual change.

INVARIANTS (per SKILL.md):
- UPPERCASE filename at project root.
- Completed-form, NOT append-only.
- No `## Changelog` / `### YYYY-MM-DD update:` / `~~struck~~` legacy / `Last updated: ...` footer inside the file.
- History lives in git log.

If `$ARGUMENTS` has no second arg (just `<DOMAIN>`), Read the current file and show it — no write.
