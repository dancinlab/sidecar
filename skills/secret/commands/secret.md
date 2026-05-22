---
description: /secret <args> — runs the `secret` CLI (macOS Keychain-backed credentials, dual-channel sync). Verbs — get · set · rotate · check · delete · list · service · init [icloud|github <url>] · backup [enable <url>|disable|status] · sync · migrate. ⚠ `/secret get <k>` exposes the value in conversation context; prefer direct bash `$(secret get <k>)` inline for tool invocations. Slash form is best for management verbs (no value return).
argument-hint: "<get <k> | set [--allow-mnemonic] <k> [v] | rotate <k> [--bytes N|--hex N] | check <k> | delete <k> | list | service | init icloud | init github <url> | backup [enable <url>|disable|status] | sync | migrate [--apply] [--purge-source]>"
allowed-tools: Bash
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/secret.sh" $ARGUMENTS`
