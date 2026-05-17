---
description: Show or set sidecar user preferences (reply language / code language / response style). Language values accept `auto` — mirror the language the user writes in. Persisted across sessions; injected at SessionStart and on every prompt.
argument-hint: "[show | lang <code> | code <code> | style <name> | styles | reset]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/prefs.sh" $ARGUMENTS`
