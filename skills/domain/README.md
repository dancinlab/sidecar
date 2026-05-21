# domain

UPPERCASE `<DOMAIN>.md` files at project root as living current-state snapshots — overwrite, not append. History lives in `git log`.

## Trigger

- Slash: `/domain <NAME> [update directive]` — e.g. `/domain ROADMAP "Q3 priorities: X, Y, Z"`
- Natural language: *"ROADMAP 업데이트"*, *"STATUS.md 정리해줘"*, *"PLAN.md 새로 만들어"*, *"completed-form 으로 X 유지"*

## Targets

`<project-root>/<DOMAIN>.md` where project-root is the git repo root (`git rev-parse --show-toplevel`).

Examples: `ROADMAP.md` · `STATUS.md` · `PLAN.md` · `GOAL.md` · `BACKLOG.md` · `ARCHITECTURE.md` · `DECISIONS.md` · `OPEN_QUESTIONS.md` · `MILESTONES.md` · `NOTES.md`.

## Invariants

| Rule | Form |
|---|---|
| UPPERCASE filename | `ROADMAP.md` ✓ · `roadmap.md` ✗ |
| Project root | `<repo-root>/<DOMAIN>.md` ✓ · `docs/<DOMAIN>.md` ✗ |
| Completed-form | each read = current state ✓ · log of updates ✗ |
| No history inside | (clean snapshot) ✓ · `## 2026-XX-XX Update:` ✗ · `~~struck~~` ✗ · `Last updated:` footer ✗ |
| Overwrite | rewrite whole file each update ✓ · append section ✗ |

## History

`git log -p <DOMAIN>.md` is the only chronological record. The file itself never carries timestamps or change-log sections.

## Related

- `commons.tape` g15: "write docs in completed-form (describe current state) — history in CHANGELOG.md / git log territory"
- Sidecar's own `project.tape` is the same pattern in `.tape` form.
