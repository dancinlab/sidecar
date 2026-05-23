---
description: UPPERCASE <DOMAIN>.md (snapshot = final-goal milestone checkboxes) + <DOMAIN>.log.md (append-only step log). Verbs — `<NAME>` = SELECT the session's active domain (later verbs default to it) + show a final-goal progress bar (`▓▓▓░░ NN% · done/total` from the snapshot's checkboxes) · bare = show active · `<text>` = append `- [x]` to log · todo `<text>` = `- [ ]` · done `<match>` = flip `[ ]`→`[x]` · new `<header>` = new entry. Progress is final-goal-based (snapshot), not log-based.
argument-hint: "<NAME> | [todo|done|new|show] <text>"
allowed-tools: Bash
---

!`hexa run "$CLAUDE_PLUGIN_ROOT/bin/_domain.hexa" $ARGUMENTS`
