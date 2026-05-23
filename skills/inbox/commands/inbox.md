---
description: inbox — list inbox/ entries or scaffold a new one. Two verbs: list (enumerate) · new <kind> <slug> (scaffold inbox/<kind>/<slug>.md from template, kind ∈ notes | patches | poc | rfc_drafts).
argument-hint: "[list | new <kind> <slug>]"
allowed-tools: Bash
---

!`H="$(command -v _inbox.hexa)"; hexa run "$H" $ARGUMENTS`
