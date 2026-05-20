---
description: wilson-checkpoint — show / restore / clear the non-destructive WIP snapshots this plugin takes every turn (git stash create, pinned under refs/wilson-checkpoint/). `restore` only PRINTS the git command, never auto-applies.
argument-hint: "[status | restore [sha] | done | clear]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/checkpoint.sh" cmd $ARGUMENTS`
