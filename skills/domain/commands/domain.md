---
description: UPPERCASE <DOMAIN>.md (snapshot = final-goal milestone checkboxes) + <DOMAIN>.log.md (append-only step log). Subcommands — set `<NAME>` (or bare `<NAME>`) = SELECT the session's active domain · goal `<text>` = add a snapshot final-goal milestone (counts toward the progress bar; goal done `<match>` flips it `[ ]`→`[x]`) · bare = show active domain + progress bar `▓▓▓░░ NN% · done/total` · done `<match>` = complete a snapshot goal, else flip a log task · todo `<text>` / `<text>` / new `<header>` = log. Progress is final-goal-based (snapshot completion), not log-based.
argument-hint: "set <NAME> | goal <text> | goal done <match> | done <match> | todo <text>"
allowed-tools: Bash
---

!`hexa run "$CLAUDE_PLUGIN_ROOT/bin/_domain.hexa" $ARGUMENTS`
