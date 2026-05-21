# commons

SessionStart + PreCompact + PostCompact hook that injects a cross-project **do / dont** layer above the per-project context. PostCompact fires after auto-compaction completes (the `※ recap: …` line in the TUI) so the do/dont layer is re-injected fresh on top of the post-compaction context.

## Carrier

`commons.json` — structured data:

```json
{
  "do":   [ "ai-native", "hexa-native first", ... ],
  "dont": [ "implement workarounds for known gaps", ... ]
}
```

The hook renders it to markdown (`# commons …  ## Do … ## Don't …`) and emits the markdown as `additionalContext`. Edit `commons.json` to change the layer; the hook reads it every fire (SessionStart + PreCompact).
