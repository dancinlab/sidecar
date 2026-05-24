---
description: /sidecar <args> — runs `sidecar "$@"` (sidecar marketplace CLI). Verbs — init · sync · sign · profile · enable · disable · reset. `sign <key>` mints a 5-min user sign-off token that unlocks agent edits to a sign-gated governance SSOT file (commons.tape · project.tape); bare `sign` / `sign clear [<key>]` list / clear tokens. `profile [minimal|hexa|full]` shows/sets the multi-user enable profile; `enable`/`disable`/`reset <plugin>` are per-plugin overrides. Pass args through unchanged.
argument-hint: "<init | sync | sign <key> | profile [name] | enable <plugin> | disable <plugin> | reset <plugin>>"
allowed-tools: Bash
---

!`sidecar $ARGUMENTS`
