---
name: domain
description: |
  Maintain UPPERCASE <DOMAIN>.md files at project root as a living
  current-state snapshot — NOT an append-only log. Invoke when the
  user wants to update, create, or sync a domain doc like ROADMAP.md,
  STATUS.md, PLAN.md, GOAL.md, BACKLOG.md, NOTES.md, ARCHITECTURE.md,
  DECISIONS.md, OPEN_QUESTIONS.md. Triggers on phrases like
  "update ROADMAP", "현재 상태 STATUS.md 에 정리해줘", "<X>.md 갱신",
  "<도메인>.md 에 적어", "ROADMAP 업데이트", "PLAN.md 새로 만들어",
  "completed-form 으로 X 유지".
allowed-tools: Read, Write, Edit, Bash
---

# domain — UPPERCASE <DOMAIN>.md as living current-state snapshot

## When to use

The user wants a per-domain markdown file at the project root that holds the CURRENT state — not a log, not an append-only history.

Examples: `ROADMAP.md` · `STATUS.md` · `PLAN.md` · `GOAL.md` · `BACKLOG.md` · `NOTES.md` · `ARCHITECTURE.md` · `DECISIONS.md` · `OPEN_QUESTIONS.md` · `MILESTONES.md`.

## Invariants

- **UPPERCASE filename** at project root: `<DOMAIN>.md` (`ROADMAP.md`, not `roadmap.md`, not `docs/roadmap.md`).
- **Completed-form**: every read reflects the CURRENT state of the domain, NOT a log of changes.
- **No history inside the file**: no `## Changelog`, no `### 2026-05-22 update:` sections, no `OLD / NEW` blocks, no `~~struck-through~~` legacy items kept as record, no "last updated: ..." footer.
- **Overwrite, not append**: each update REWRITES the file. The merge happens in your head (read current → integrate update → write new snapshot), not in the file.
- **History lives in git log**: the file's git history is the only chronological record. Recover any past state via `git log -p <DOMAIN>.md`.

## How to update

1. **Locate target file**: `<project-root>/<DOMAIN>.md`. Project root = the git repo root (use `git rev-parse --show-toplevel`), NOT necessarily cwd.

2. **Read current** — if the file exists, `Read` it to understand the current shape.

3. **Integrate the user's update** semantically:
   - Add new items to the right section
   - Replace stale entries with their current form
   - Remove completed / abandoned items (unless user says preserve)
   - Re-shape sections if the structure no longer fits

4. **Write the result** — single `Write` call replaces the whole file. The output IS the new current state.

5. **Brief confirm** — 1-line recap of what changed (no need to enumerate every diff — `git diff <DOMAIN>.md` shows it).

## Scaffolding (file doesn't exist yet)

For a new `<DOMAIN>.md`, scaffold a minimal structure (no decorative scaffolding, no boilerplate sections that may not be needed):

```
# <Domain> — <one-line subject>

<short paragraph: what this file holds · who reads it · how it's updated>

## <Top-level section 1>
- ...

## <Top-level section 2>
- ...
```

NO `## History` section. NO `## Changelog`. NO version field. NO "last updated" line.

## Anti-patterns (REJECT these forms)

### ❌ Embedded changelog

```
# ROADMAP

## 2026-05-22 Update
- ...

## 2026-05-21 Update
- ...

## Original (2026-04-01)
- ...
```

— this is an append-only log disguised as a roadmap. The current roadmap can't be read in one pass. Use git log for history; the file shows only current.

### ❌ Preserved-legacy state

```
- ~~Feature X (done 2026-05-15)~~
- Feature Y (in progress, was "exploring" until 2026-05-10)
- Feature Z (DEPRECATED — moved to BACKLOG)
```

— stop preserving struck-through / annotated legacy. Delete completed items (or move to a separate `DONE.md` if the user explicitly wants a completion log). Keep only live items in the right format.

### ❌ Footer metadata

```
---

*Last updated: 2026-05-22 by Claude*
```

— this is automatic-history creep. Delete. Git log records who/when.

## Output style

- Markdown headings (`#`, `##`) for structure
- Bulleted lists for items
- No emojis unless the user's style explicitly uses them
- Tight prose — completed-form, declarative, present tense

## Related

- Cross-project rule `commons.tape` g15: "write docs in completed-form (describe current state) — history in CHANGELOG.md / git log territory".
- `CHANGELOG.md` (different file) IS the chronological log surface — that's where "what changed when" lives.
- Sidecar's own `project.tape` is the same pattern in `.tape` form (tape grammar instead of markdown).
