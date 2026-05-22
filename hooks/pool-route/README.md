# pool-route

PreToolUse(Bash) suggestion hook. When a bash command is host-specific, emit a non-blocking `additionalContext` suggesting `pool on <host> -- <cmd>`.

## Routing patterns

| Pattern | Host |
|---|---|
| `swift` · `xcodebuild` · `xcrun` · `pod install` | `mini` (macOS) |
| `nvidia-smi` · `nvcc` | `ubu-1` or `ubu-2` (linux GPU) |

Commands that already contain `pool on ` are skipped — no double-suggestion when routing is already in place.

## No opt-out

There is none — no env var, no config file, no exception list. A guard you can switch off is a guard you will switch off. The suggestion is non-blocking already; if `pool-route` is wrong for your workflow, uninstall the plugin rather than routing around it.
