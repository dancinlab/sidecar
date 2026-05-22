# cycle

Autonomous work-loop driver: **next-list → parallel-plan → fan-out → loop**. Repeat `/cycle` to march through a goal in parallel batches.

## The loop

```
next-list  →  parallel-plan  →  fan-out  →  loop
   │              │               │           │
   │              │               │           └ "/cycle" again → next round
   │              │               └ M background Agents, one per item, ONE message
   │              └ print plan table (item · type · iso · goal) BEFORE dispatch
   └ SELF-enumerate next viable work from current context
```

## vs `all bg go`

| | source | mode |
|---|---|---|
| `all bg go` | branches the PRIOR turn offered | reactive single fan-out |
| `/cycle` | SELF-enumerated next work | proactive repeatable loop |

## Trigger

- Slash: `/cycle [scope hint]`
- Natural language: *"사이클"*, *"계속 진행"*, *"다음 라운드 진행"*, *"keep cycling"*, *"march on"*, *"next round"*

## Guardrails

- Self-enumerate only when next work is genuinely inferable (else ask — no filler).
- Disjoint items only (parallelizable, no shared-file clashes).
- No destructive fan-out (force-push · prod deploy · external messages · data drops → confirm first).
- Cap >8 items with confirm.
- No nesting (sub-agents don't invoke `/cycle` / `all bg go`).

## Related

- `all-bg-go` — reactive single fan-out (non-loop sibling).
- `commons.tape g24` — research = explore all viable paths in parallel (cycle is the loop form).
- `commons.tape g12` — fan out up to 8 pods when wall time shrinks.
