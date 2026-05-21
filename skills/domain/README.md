# domain

Maintain UPPERCASE `<DOMAIN>.md` (living current-state snapshot) + sister `<DOMAIN>.log.md` (append-only history) at project root. Single invocation writes BOTH.

## Two-file pattern

| File | Mode | Role |
|---|---|---|
| `<DOMAIN>.md` | overwrite | living current-state snapshot |
| `<DOMAIN>.log.md` | append-only · newest on top | chronological history sister |

Markdown analog of tape v1.2's `<DOMAIN>.tape` + `<DOMAIN>.log.tape` sister pattern.

## Trigger

- Slash: `/domain <NAME> [update directive]` — e.g. `/domain ROADMAP "Q3 priorities: X, Y, Z"`
- Natural language: *"ROADMAP 업데이트"*, *"STATUS.md 정리해줘"*, *"PLAN.md 새로 만들어"*, *"completed-form 으로 X 유지"*

## Targets

`<project-root>/<DOMAIN>.md` + `<project-root>/<DOMAIN>.log.md` where project-root is the git repo root (`git rev-parse --show-toplevel`).

Examples: `ROADMAP.md`+`ROADMAP.log.md` · `STATUS.md`+`STATUS.log.md` · `PLAN.md`+`PLAN.log.md` · `GOAL.md`+`GOAL.log.md` · `BACKLOG.md`+`BACKLOG.log.md` · `ARCHITECTURE.md`+`ARCHITECTURE.log.md` · `DECISIONS.md`+`DECISIONS.log.md`.

## Invariants

### `<DOMAIN>.md` (snapshot)

| Rule | Form |
|---|---|
| UPPERCASE filename | `ROADMAP.md` ✓ · `roadmap.md` ✗ |
| Project root | `<repo-root>/<DOMAIN>.md` ✓ · `docs/<DOMAIN>.md` ✗ |
| Completed-form | each read = current state ✓ · log of updates ✗ |
| No history inside | clean snapshot ✓ · `## 2026-XX-XX Update:` ✗ · `~~struck~~` ✗ · `Last updated:` footer ✗ |
| Overwrite | rewrite whole file ✓ · append section ✗ |

### `<DOMAIN>.log.md` (history sister)

| Rule | Form |
|---|---|
| Same dir as `<DOMAIN>.md` | `<repo-root>/<DOMAIN>.log.md` ✓ |
| Append-only | never edit prior entries ✓ · corrections = NEW entry ✓ |
| Newest on top | reverse chronological ✓ |
| Entry header | `## <ISO timestamp> — <one-line summary>` ✓ · `## Latest update:` ✗ |
| Body | optional 1-3 lines (semantic delta, NOT full snapshot) |

## Example session

```
$ /domain ROADMAP "Q3 priorities: ship sidecar v0.8 · finish bench v4 · roll out project.tape to remaining 60 repos"
```

→ writes:
- `ROADMAP.md` (overwrite) with the new current roadmap
- `ROADMAP.log.md` (prepend at top): `## 2026-05-22T01:35 — Q3 priorities set: sidecar v0.8 · bench v4 · project.tape rollout`

Recap: `✓ ROADMAP.md (current) + ROADMAP.log.md (entry N)`

## Related

- `commons.tape` g15: "write docs in completed-form (describe current state) — history in CHANGELOG.md / git log territory"
- `CHANGELOG.md` — repo-wide chronological log (cross-domain). `<DOMAIN>.log.md` is per-domain.
- tape v1.2 spec — `<DOMAIN>.tape` + `<DOMAIN>.log.tape` is the official sister pattern this mirrors in markdown form.
- Sidecar's own `project.tape` is the same snapshot pattern in `.tape` form.
