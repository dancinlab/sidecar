---
description: Update or create an UPPERCASE <DOMAIN>.md at project root (current snapshot, overwrite) + append a history entry to sister <DOMAIN>.log.md (append-only). Example — /domain ROADMAP "Q3 priorities: X, Y, Z" → overwrites ROADMAP.md with new current state AND appends "## 2026-05-22T01:35 — Q3 priorities: X, Y, Z" to ROADMAP.log.md.
argument-hint: "<DOMAIN> [update directive]"
allowed-tools: Read, Write, Edit, Bash
---

Engage the `domain` skill with arguments: `$ARGUMENTS`

First arg = `<DOMAIN>` (UPPERCASE filename root, no extension — `ROADMAP` → `ROADMAP.md` + `ROADMAP.log.md`).
Rest of args = the update directive (free text).

Process (BOTH files updated in one invocation):
1. Resolve `<project-root>` via `git rev-parse --show-toplevel`.
2. Targets: `<project-root>/<DOMAIN>.md` (snapshot) + `<project-root>/<DOMAIN>.log.md` (history sister).
3. **Snapshot file**:
   - If exists: Read → integrate directive into current state → Write (overwrite whole file).
   - If new: scaffold minimal `# <Domain> — <subject>` structure + body.
4. **Log sister**:
   - Prepend new entry at TOP under the `# <Domain> — log` header:
     ```
     ## <ISO timestamp> — <one-line summary of the directive>
     
     <optional 1–3 line body>
     ```
   - ISO timestamp = `YYYY-MM-DDTHH:MM` (UTC, minute precision).
   - If file doesn't exist: scaffold it first (see SKILL.md for shape).
5. Recap in 1 line: `✓ <DOMAIN>.md (current) + <DOMAIN>.log.md (entry N)`.

INVARIANTS (per SKILL.md):
- UPPERCASE filename at project root.
- `<DOMAIN>.md` is completed-form snapshot, NOT a log.
- `<DOMAIN>.log.md` is append-only, newest entry on top.
- NO `## Changelog` / `### YYYY-MM-DD update:` / `~~struck~~` / `Last updated:` footer inside the snapshot.
- Never edit prior entries in `.log.md` — corrections go in a new entry.

If `$ARGUMENTS` has no second arg (just `<DOMAIN>`), Read both files and show them side-by-side — no write.
