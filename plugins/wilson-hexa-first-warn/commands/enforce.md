---
description: Print the one-time `sudo install` recipe that lands managed-settings.json deny entries — closes the gap where defaultMode:bypassPermissions silently ignores wilson-hexa-first-warn's PreToolUse deny. Output is a copy-paste block; this command does NOT run sudo for you.
allowed-tools: Bash
disable-model-invocation: true
---

!`hexa run "$CLAUDE_PLUGIN_ROOT/bin/enforce.hexa"`
