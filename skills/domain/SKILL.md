---
name: domain
description: |
  Maintain UPPERCASE <DOMAIN>.md files at project root as living
  current-state snapshots — NOT append-only. A sister append-only
  history file <DOMAIN>.log.md is auto-written in the same dir.
  Invoke when the user wants to update, create, or sync a domain
  doc like ROADMAP.md, STATUS.md, PLAN.md, GOAL.md, BACKLOG.md,
  NOTES.md, ARCHITECTURE.md, DECISIONS.md, OPEN_QUESTIONS.md.
  Triggers on phrases like "update ROADMAP", "현재 상태 STATUS.md
  에 정리해줘", "<X>.md 갱신", "<도메인>.md 에 적어", "ROADMAP
  업데이트", "PLAN.md 새로 만들어", "completed-form 으로 X 유지".
allowed-tools: Read, Write, Edit, Bash
---

# domain — UPPERCASE <DOMAIN>.md (snapshot) + <DOMAIN>.log.md (history sister)

## Two-file pattern

| File | Mode | Role |
|---|---|---|
| `<project-root>/<DOMAIN>.md` | overwrite each update | living **current-state** snapshot (the file readers consult) |
| `<project-root>/<DOMAIN>.log.md` | **append-only** | chronological history sister (one entry per update) |

Every `domain` invocation writes BOTH — single user call, two-file sync.

## When to use

The user wants a per-domain markdown file at the project root that holds the CURRENT state — not a log, not an append-only history.

Examples: `ROADMAP.md` · `STATUS.md` · `PLAN.md` · `GOAL.md` · `BACKLOG.md` · `NOTES.md` · `ARCHITECTURE.md` · `DECISIONS.md` · `OPEN_QUESTIONS.md` · `MILESTONES.md`.

## Invariants — `<DOMAIN>.md` (snapshot)

- **UPPERCASE filename** at project root: `<DOMAIN>.md` (`ROADMAP.md`, not `roadmap.md`, not `docs/roadmap.md`).
- **Completed-form**: every read reflects the CURRENT state, NOT a log of changes.
- **No history inside the file**: no `## Changelog`, no `### 2026-05-22 update:` sections, no `OLD / NEW` blocks, no `~~struck-through~~` legacy items, no "last updated: ..." footer.
- **Overwrite, not append**: each update REWRITES the file. The merge happens in your head (read current → integrate update → write new snapshot).

## Invariants — `<DOMAIN>.log.md` (history sister)

- **Same directory** as `<DOMAIN>.md`, with `.log.md` suffix.
- **Append-only**: never edit prior entries.
- **One entry per update**: header line + optional body lines.
- **Entry shape**:
  ```
  ## <ISO timestamp> — <one-line summary>
  
  <optional 1–3 line body — what changed semantically, not the full new snapshot>
  ```
- **ISO timestamp**: `YYYY-MM-DDTHH:MM` (UTC; minute precision is enough).
- **Newest entry on TOP** (reverse chronological — most recent first when reading).
- **Body is optional** — if the one-line summary suffices, omit body.

## How to update (every invocation does BOTH)

1. **Resolve target dir**: project root = `git rev-parse --show-toplevel` (NOT cwd if differs).
2. **Read current** `<DOMAIN>.md` if it exists.
3. **Integrate the user's update** semantically into the current snapshot.
4. **Write `<DOMAIN>.md`** — single `Write` call, whole-file overwrite, NEW current state.
5. **Append to `<DOMAIN>.log.md`** — prepend a new entry at TOP under a `# <Domain> — log` header. If the file doesn't exist, scaffold it (see below).
6. **Brief confirm**: `✓ ROADMAP.md (current) + ROADMAP.log.md (entry N)` — 1-line recap.

## Scaffolding (new domain)

**`<DOMAIN>.md`** — minimal structure, no boilerplate:

```
# <Domain> — <one-line subject>

<short paragraph: what this file holds · who reads it · how it's updated>

## <Top-level section 1>
- ...

## <Top-level section 2>
- ...
```

NO `## History` / `## Changelog` / version field / `Last updated:` footer.

**`<DOMAIN>.log.md`** — sister scaffold:

```
# <Domain> — log

Append-only history sister of `<DOMAIN>.md`. Each entry = `## <ISO timestamp> — <one-line summary>` (newest on top). The current state lives in [`<DOMAIN>.md`](<DOMAIN>.md).

## <ISO timestamp> — initial <domain> created

<optional 1–3 line body describing the initial content>
```

## Anti-patterns (REJECT in `<DOMAIN>.md`)

### ❌ Embedded changelog (this is what `.log.md` is for)

```
# ROADMAP

## 2026-05-22 Update
- ...

## 2026-05-21 Update
- ...
```

— that history goes in `ROADMAP.log.md`, NOT inside `ROADMAP.md`.

### ❌ Preserved-legacy state

```
- ~~Feature X (done 2026-05-15)~~
- Feature Y (was "exploring" until 2026-05-10)
```

— delete completed/abandoned items. The `.log.md` entry records the removal.

### ❌ Footer metadata

```
*Last updated: 2026-05-22 by Claude*
```

— this is automatic-history creep. The `.log.md` has the timestamps.

## Anti-patterns (REJECT in `<DOMAIN>.log.md`)

### ❌ Mutating prior entries

Once an entry is appended, never edit it. Corrections go in a NEW entry (`## <ts> — correction: <prior-entry-summary> was inaccurate, actual: ...`).

### ❌ Full snapshot dump in the body

The body summarizes WHAT CHANGED, not the full new snapshot — that's what `<DOMAIN>.md` is for. `git diff HEAD~1 <DOMAIN>.md` shows the actual diff.

### ❌ Entry without timestamp

Every entry MUST start with `## <ISO timestamp> — <summary>`. No `## Latest update:` / `## Yesterday:` placeholders.

## Output style

- Markdown headings (`#`, `##`) for structure
- Bulleted lists for items
- No emojis unless the user's project style explicitly uses them
- Tight prose — completed-form, declarative, present tense in `<DOMAIN>.md`; past tense in `.log.md` entries

## Related

- Cross-project rule `commons.tape` g15: "write docs in completed-form (describe current state) — history in CHANGELOG.md / git log territory". The `.log.md` sister is the per-domain markdown sibling of `CHANGELOG.md` / `git log`.
- Sidecar's own `project.tape` is the same snapshot pattern in `.tape` form (tape grammar instead of markdown).
- tape v1.2 spec has the official sister pattern `<DOMAIN>.tape` (current) + `<DOMAIN>.log.tape` (append). `.log.md` is the markdown analog.
