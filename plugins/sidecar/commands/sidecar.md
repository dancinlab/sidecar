---
description: Toggle sidecar plugins at runtime. /sidecar status shows all; /sidecar off <name> disables; /sidecar on <name> re-enables. Names: ssot readme-format hexa-verify prefs output-trim pool guards frontdoor (or `all`). Persists across sessions; the plugin's hook no-ops while disabled.
argument-hint: "[status | on <name> | off <name> | on all | off all]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/sidecar.sh" $ARGUMENTS`
