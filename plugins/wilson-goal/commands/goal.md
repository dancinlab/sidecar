---
description: wilson-goal — keep the session's high-level objective alive across a long session and context compaction. Persists the goal on disk (outside the transcript), restored at every SessionStart and re-asserted as a short reminder on each UserPromptSubmit. A project-local `GOAL.md` is used as the default when no per-session goal is set.
argument-hint: "[status | set \"<goal>\" | clear | show | path]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/g.sh" cmd $ARGUMENTS`
