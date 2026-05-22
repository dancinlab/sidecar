---
description: /secret <args> — runs the `secret` CLI (macOS Keychain-backed credentials). Verbs — get · set · delete · list · service. ⚠ `/secret get <k>` exposes the value in conversation context; prefer direct bash `$(secret get <k>)` inline for tool invocations. Slash form is most useful for list / delete / service / set (management).
argument-hint: "<get <k> | set <k> [v] | delete <k> | list | service>"
allowed-tools: Bash
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/secret.sh" $ARGUMENTS`
