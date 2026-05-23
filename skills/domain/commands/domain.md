---
description: UPPERCASE <DOMAIN>.md (current snapshot) + <DOMAIN>.log.md (checkbox-task append-only log). Auto-scaffolds both files; defaults to project name (uppercase basename of git root) when NAME omitted. Verbs — bare = show · <text> = append `- [x] <text>` · todo <text> = `- [ ]` · done <match> = flip `[ ]` → `[x]` · new <header> = start new entry.
argument-hint: "[NAME] [todo|done|new|show] <text>"
allowed-tools: Bash
---

!`H="$(command -v _domain.hexa)"; hexa run "$H" $ARGUMENTS`
