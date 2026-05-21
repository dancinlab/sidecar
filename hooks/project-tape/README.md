# project-tape

PreCompact + PostCompact hook that re-injects `<project-root>/project.tape` as `additionalContext` so the project's identity + governance survive auto-compaction.

## Setup

```
sidecar init
```

Drops a `project.tape` template into the current dir and symlinks `CLAUDE.md → project.tape`. The harness loads `CLAUDE.md` automatically on SessionStart; this hook fires only on PreCompact + PostCompact (the two events where the original load gets summarized away).

No-op when `project.tape` is absent — safe to install in any project.

## Carrier

`project.tape` uses the canonical `.tape` v1.2 grammar:

```
@V := "tape" :: spec [active]
  version = "1.2"

@I := "<name>" :: identity [active]
  kind   = "..."
  brief  = "..."
  layout = "..."

@D := "<name>" :: governance [active]
  do   = "..."
  dont = "..."
```

Add additional `@D <slug> := ... :: governance` blocks for named rules.
