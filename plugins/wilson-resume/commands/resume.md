---
description: wilson-resume — resume continuity across an abrupt session end. Every turn it snapshots the TodoWrite checklist progress, the last request and the git working-tree state to a per-project file; SessionStart re-injects a short `## Resume` briefing so the next session picks the work thread back up. Snapshots are automatic — this command only inspects/clears them.
argument-hint: "[status | show | clear | path]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/r.sh" cmd $ARGUMENTS`
