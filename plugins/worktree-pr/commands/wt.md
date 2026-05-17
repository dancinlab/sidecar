---
description: Safe worktree → PR → merge → cleanup workflow. Subcommands — start <name> (worktree+branch off origin default); ship <name> "<title>" (push + open PR); finish <name> (merge PR + remove worktree + delete branch + refresh); status; abort <name>. Never touches the main working tree.
argument-hint: "start <name> | ship <name> \"<title>\" | finish <name> | status | abort <name>"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/worktree-pr.sh" $ARGUMENTS`
