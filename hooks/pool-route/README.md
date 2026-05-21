# pool-route

PreToolUse(Bash) suggestion hook. When a bash command is host-specific, emit a non-blocking `additionalContext` suggesting `pool on <host> -- <cmd>`.

## Routing patterns

| Pattern | Host |
|---|---|
| `swift` · `xcodebuild` · `xcrun` · `pod install` | `mini` (macOS) |
| `nvidia-smi` · `nvcc` | `ubu-1` or `ubu-2` (linux GPU) |

Commands that already contain `pool on ` are skipped — no double-suggestion when routing is already in place.

## Opt out

- env var: `SIDECAR_NO_POOL_ROUTE=1`
- file: list `"pool-route"` in `~/.claude/sidecar/disabled.json`
