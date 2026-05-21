---
name: verify
description: |
  Run `hexa verify` (the cross-project tier rubric — TECS-L aligned,
  real-limits-first). Returns one of 🔵 SUPPORTED-FORMAL, 🟢
  SUPPORTED-NUMERICAL, 🟡 SUPPORTED-BY-CITATION, 🟠 INSUFFICIENT,
  🟠 DEFERRED, 🔴 FALSIFIED, ⚪ SPECULATION-FENCED. Invoke when the
  user wants a correctness · purity · grade · identity claim verified.
  Triggers on phrases like "verify this", "확인해", "검증해", "맞아?",
  "is this true?", "hexa verify 해", "이거 사실?".
allowed-tools: Bash
---

# verify — wrap `hexa verify` for tier-rubric verification

## When to use

The user wants a CLAIM verified — correctness · purity · grade · identity. The cross-project rule `commons.tape g5` mandates `hexa verify` (not LLM self-judge) for any of these.

## Forms (pick by claim shape)

| Form | Example | Use when |
|---|---|---|
| `hexa verify <id> [--absorb]` | `hexa verify ic02b1f9 --absorb` | claim is an atlas atom (id in the catalog) |
| `hexa verify --expr <fn> <n> <v>` | `hexa verify --expr sigma 6 24` | numerical recompute (1-operand) |
| `hexa verify --expr <fn> <a> <b> <v>` | `hexa verify --expr jacobi 7 11 -1` | 2-operand numerical recompute |
| `hexa verify --fence "<claim>"` | `hexa verify --fence "consciousness is computation"` | NL claim that isn't atlas / numerical — honest ⚪ SPECULATION-FENCED |
| `hexa verify rubric` | `hexa verify rubric` | print tier rubric |
| `hexa verify list` | `hexa verify list` | list registered atoms |

## Invocation

```
/verify <args>
```

Args pass through unchanged to `hexa verify`. For NL claims that don't match a form, hexa prints usage and the model reframes (e.g. wraps in `--fence`).

## Output discipline

Per `commons.tape g5`, paste the verdict tier badge **VERBATIM** (🔵 / 🟢 / 🟡 / 🟠 / 🔴 / ⚪) — never paraphrase, never auto-promote ⚪ → 🔵.

## Related

- `commons.tape g5` — use `hexa verify` for correctness claims; never LLM self-judge.
- `kick` — sibling wrapper for `hexa kick` (discovery side; verify is the verification side).
