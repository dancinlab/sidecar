# verify

`/verify <args>` — wrap `hexa verify` (cross-project tier rubric, TECS-L-aligned, real-limits-first).

## Verdict tiers (returned VERBATIM per `commons.tape g5`)

| Badge | Tier |
|---|---|
| 🔵 | SUPPORTED-FORMAL — hexa-native calc reproduces closed-form identity exactly |
| 🟢 | SUPPORTED-NUMERICAL — numerical recompute matches |
| 🟡 | SUPPORTED-BY-CITATION — atlas/literature registered, no hexa recompute |
| 🟠 | INSUFFICIENT / DEFERRED — no atlas + no calc path, or external hw/data dep |
| 🔴 | FALSIFIED — calc deterministically disagrees with the claim |
| ⚪ | SPECULATION-FENCED — imagination / metaphor (honest fence) |

## Forms

```
/verify <id> [--absorb]                    atlas atom lookup + recompute
/verify --expr <fn> <n> <v>                numerical 1-operand
/verify --expr <fn> <a> <b> <v>            numerical 2-operand
/verify --fence "<claim>"                  honest ⚪ for NL / metaphor claims
/verify rubric                             print tier rubric
/verify list                               list registered atoms
```

## Trigger

- Slash: `/verify <args>` — args pass through unchanged
- Natural language: *"verify this"*, *"확인해"*, *"검증해"*, *"맞아?"*, *"is this true?"*, *"hexa verify 해"*

## Related

- `commons.tape g5` — cross-project rule mandating `hexa verify` for correctness/purity/grade/identity claims; forbids LLM self-judge.
- `kick` — sibling wrapper for `hexa kick` (discovery side).
