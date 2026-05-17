---
description: wilson-tape-recorder — recorded Claude Code sessions as `.tape` v1.2 execution traces (one file per session under <DATA>/sessions/). `status` shows ON/OFF + counts; `ls` lists recent sessions; `tail [N]` prints the last N entries of the current session; `cat [session_id]` dumps a session tape; `on`/`off` toggles recording; `path` shows the storage convention.
argument-hint: "[status | ls | tail [N] | cat [session_id] | path | on | off]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/tr.sh" cmd $ARGUMENTS`
