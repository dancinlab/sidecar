---
description: wilson-resume — persistence + re-arm companion for Claude Code's native /goal command. Native /goal is session-scoped (no disk persistence), so a crash / usage limit loses the completion condition. wilson-resume captures the active /goal condition from the transcript on every Stop and re-surfaces it on SessionStart with the exact /goal line to re-arm. This command only inspects/clears the saved condition — capture is automatic.
argument-hint: "[status | show | clear | path]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/r.sh" cmd $ARGUMENTS`
