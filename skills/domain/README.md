# domain

UPPERCASE `<NAME>.md` (current-state snapshot) + sister `<NAME>.log.md` (append-only checkbox-task log) at project root. NAME defaults to uppercase basename of git root. Auto-scaffolds both files.

## Verbs

```
/domain                       show <PROJECT>.md + .log.md (scaffold if missing)
/domain <NAME>                show specific NAME.md + .log.md
/domain <task-text>           append "- [x] <task-text>" to top log entry
/domain todo <task-text>      append "- [ ] <task-text>"  (pending)
/domain done <match>          flip first "- [ ] *match*" → "- [x] ..."
/domain new <header>          start new entry "## <ISO ts> — <header>"
/domain <NAME> <task-text>    same as above, targeting specific NAME
```

NAME detection: first arg = NAME if `^[A-Z][A-Z0-9_]*$`, else task text.

## Two-file shape

| File | Mode |
|---|---|
| `<NAME>.md` | overwrite — current-state snapshot |
| `<NAME>.log.md` | append-only — newest entry on top, checkbox tasks inside |

Default NAME = `$(basename $(git rev-parse --show-toplevel) | upper)`.

## Record all steps as work proceeds

For multi-step agent work, each step gets logged as a checkbox:

```
/domain "step 1 done"            → - [x] step 1 done
/domain "step 2 done"            → - [x] step 2 done
/domain todo "step 3 planned"    → - [ ] step 3 planned
... work happens ...
/domain done "step 3"            → flip step 3 to [x]
```

The log accumulates a checkbox audit trail.

## Auto-scaffold

If `<NAME>.md` or `<NAME>.log.md` is missing, both get scaffolded with the project-name fallback (`$(basename $(git rev-parse --show-toplevel) | upper)`). No setup needed — just `/domain "first step"` in a fresh repo and the files appear.

## Related

- `commons.tape g15` — completed-form docs; history in dedicated surfaces.
- tape v1.2 — `<DOMAIN>.tape` + `<DOMAIN>.log.tape` (this is the markdown analog).
