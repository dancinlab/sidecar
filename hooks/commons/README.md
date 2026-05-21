# commons

SessionStart + PreCompact + PostCompact hook that injects a cross-project **do / dont** layer above the per-project context. PostCompact fires after auto-compaction completes (the `※ recap: …` line in the TUI) so the do/dont layer is re-injected fresh on top of the post-compaction context.

## Carrier

`commons.tape` — single `@D commons :: governance` entry with `do` / `dont` fields. The hook reads the file every fire and emits it verbatim as `additionalContext`. Edit `commons.tape` to change the layer.
