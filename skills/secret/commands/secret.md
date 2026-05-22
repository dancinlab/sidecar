---
description: /secret <args> — runs the `secret` CLI (macOS Keychain-backed credentials). Verbs — get · set · rotate · check · delete · list · service. ⚠ `/secret get <k>` exposes the value in conversation context; prefer direct bash `$(secret get <k>)` inline for tool invocations. Slash form is best for rotate / check / list / delete / service / set (no value return).
argument-hint: "<get <k> | set [--allow-mnemonic] <k> [v] | rotate <k> [--bytes N|--hex N] | check <k> | delete <k> | list | service>"
allowed-tools: Bash
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/secret.sh" $ARGUMENTS`
