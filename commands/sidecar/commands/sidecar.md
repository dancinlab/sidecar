---
description: /sidecar <args> — runs `sidecar "$@"` (sidecar marketplace CLI). Verbs — init · sync · mirror · shadow [plan] · unshadow · sign · profile · enable · disable · reset. `shadow` drops the forced `plugin:command` namespace (#15882) — mirror+disable every command/skill plugin (hook/mcp kept), splicing SKILL.md triggers into the bare command so it stays lossless; `shadow plan` dry-runs, `unshadow` reverts. `sign <key>` mints a 5-min user sign-off token that unlocks agent edits to a sign-gated governance SSOT file (commons.tape · project.tape); bare `sign` / `sign clear [<key>]` list / clear tokens. `profile [minimal|hexa|full]` shows/sets the multi-user enable profile; `enable`/`disable`/`reset <plugin>` are per-plugin overrides. Pass args through unchanged.
argument-hint: "<init | sync | mirror | shadow [plan] | unshadow | sign <key> | profile [name] | enable <plugin> | disable <plugin> | reset <plugin>>"
allowed-tools: Bash
---

!`sidecar $ARGUMENTS`
