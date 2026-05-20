# commons

SessionStart hook that injects `commons.tape` as `additionalContext`. The tape carries a single `@D :: governance` entry with `do` / `dont` fields — a cross-project common layer that sits above the per-project `AGENTS.tape`.

Edit `commons.tape` to change the layer; the hook reads it verbatim every SessionStart.
