---
description: wilson-decision-gate — step-by-step decision gate. One user-confirmation gate per decision, never batched (options + recommendation + 3+ rationale → wait for the pick → next). Maintains the design.md `Decision N:` audit ledger. `decide` appends an entry; `log` shows the ledger; `on`/`off` toggles principle injection; `path` sets the design.md file; `sample` prints the bundled 5-language template.
argument-hint: "[status | on | off | decide \"<picked>\" \"<rationale>\" | log | path <file> | sample [en|ko|ja|zh|ru]]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/dg.sh" cmd $ARGUMENTS`
