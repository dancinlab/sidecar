---
name: domain
description: |
  Maintain UPPERCASE <DOMAIN>.md (current snapshot) + sister
  <DOMAIN>.log.md (append-only checkbox-task log) at project root.
  NAME defaults to uppercase basename of git root if omitted.
  Auto-scaffolds both files when missing. Log entries use checkbox
  tasks (`- [x]` done · `- [ ]` pending) — flip with `done <match>`.
  Invoke when the user wants to record progress, plan next steps,
  or maintain a domain doc (ROADMAP · STATUS · PLAN · GOAL · ...).
  Triggers on phrases like "domain log", "기록해줘", "체크 추가",
  "이거 todo 로", "이것 완료 처리", "ROADMAP 업데이트", "STATUS.md
  정리해줘", "<X>.md 추가".
allowed-tools: Bash
---

# domain — UPPERCASE <DOMAIN>.md snapshot + <DOMAIN>.log.md checkbox log

## Two-file pattern (auto-scaffolded)

| File | Mode | Role |
|---|---|---|
| `<project-root>/<NAME>.md` | overwrite | living **current-state** snapshot |
| `<project-root>/<NAME>.log.md` | append-only · newest on top | checkbox-task log (`- [x]` done · `- [ ]` pending) |

**Default NAME** = uppercase basename of git root (e.g. cwd `~/core/demiurge` → `DEMIURGE`). If either file is missing on any invocation, both get scaffolded with the project-name fallback.

## Verbs (via `bin/domain.sh`)

```
/domain                           show <PROJECT>.md + .log.md (scaffold if missing)
/domain <NAME>                    show specific NAME.md + .log.md
/domain <task-text>               append "- [x] <task-text>" to top log entry
/domain todo <task-text>          append "- [ ] <task-text>"  (pending)
/domain done <match>              flip first "- [ ] *match*" → "- [x] ..."
/domain new <header>              start a new entry "## <ISO ts> — <header>"
/domain <NAME> <task-text>        same as above, targeting specific NAME
```

**NAME detection**: first arg is treated as NAME if it matches `^[A-Z][A-Z0-9_]*$` (uppercase alphanumeric + underscore). Otherwise it's task text and the project-default NAME applies.

## Record all steps as work proceeds

Per the user's "기록 하도록" intent — when the agent is doing multi-step work, each step gets logged as a checkbox:

- **Completed step** → `/domain "<step description>"` (defaults to `- [x]`)
- **Planned step** → `/domain todo "<step description>"` (`- [ ]`)
- **Finishing a pending step** → `/domain done "<match>"` (flip)
- **Starting a new session/topic** → `/domain new "<session topic>"` (new entry)

Default mode: every action the agent takes that's worth recording = `/domain "<action>"`. The log accumulates a checkbox audit trail of the session.

## Invariants

### `<NAME>.md` (snapshot)
- UPPERCASE filename at git root
- completed-form (current state, NOT a log)
- no `## Changelog` / `### YYYY-MM-DD update:` / `~~struck~~` / `Last updated:` footer inside

### `<NAME>.log.md` (checkbox log)
- append-only (new entries on top); checkboxes flip in-place via `done`
- new tasks inserted at TOP of most-recent entry
- entry header: `## <ISO timestamp UTC YYYY-MM-DDTHH:MM> — <session header>`
- bullet shape: `- [x] <text>` (done) · `- [ ] <text>` (pending)

## Anti-patterns

| ❌ Reject | ✅ Use instead |
|---|---|
| `## 2026-05-22 Update:` headings inside `<NAME>.md` | append entries to `<NAME>.log.md` |
| `~~struck-through~~` legacy items in snapshot | delete from snapshot; `[x]` in log |
| `Last updated: ...` footer | git log / log.md timestamps |
| Editing prior `.log.md` entry's text | new entry with correction note |
| Forgetting to record steps as work proceeds | `/domain <step>` per meaningful action |

## Related

- `commons.tape g15` — write docs in completed-form; history in dedicated surfaces.
- tape v1.2 spec — `<DOMAIN>.tape` + `<DOMAIN>.log.tape` is the official sister pattern this mirrors in markdown.
- sidecar's own `project.tape` — same snapshot pattern in `.tape` form.
