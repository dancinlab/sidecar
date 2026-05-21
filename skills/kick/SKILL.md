---
name: kick
description: |
  Run `hexa kick --seed "<expr>"` (the hexa-lang gap-breakthrough /
  discovery engine, aliased to `hexa drill`). Invoke when the user
  wants to surface non-obvious angles, traverse gaps, or kick a
  stuck thread. Triggers on phrases like "kick this", "gap
  breakthrough on", "discover for", "발산", "돌파해줘", "이거 hexa
  kick 해", "쥐어짜봐 (hexa)", "hexa drill <X>". Natural-language
  arg is passed straight to `--seed`.
allowed-tools: Bash
---

# kick — wrap `hexa kick` for breakthroughs / discovery

## When to use

The user wants the hexa-lang discovery engine to chew on a seed expression / topic / question. Used when:

- Hitting a wall on a problem and wanting non-obvious angles
- Want a structured gap traversal (engine-driven, not LLM-only)
- Wanting to convert a vague idea into testable hypotheses

Pairs with the cross-project rule `commons.tape g6` (use `hexa kick` for gap breakthroughs · discovery) and the `brainstorm` / `gap` skills (different breadth-vs-engine angles).

## Invocation

```
/kick <natural-language seed>
```

All args after `/kick` are joined into the `--seed` argument. The bin wrapper runs `hexa kick --seed "$*"`.

For advanced flags (`--rounds N`, `--engine mk9|mk10`), call `hexa kick` directly via Bash — the slash form is intentionally NL-only.

## Output

Whatever `hexa kick --seed "<expr>"` emits to stdout — paste-as-is into the conversation; the model reads it on the next turn.

## Related

- `commons.tape g6` — cross-project rule that surfaces `hexa kick` as the canonical breakthrough tool.
- `brainstorm` skill — depletion-style ideation (model-driven, not engine-driven).
- `gap` command — multi-axis lens sweep (model-driven, structured but lens-based).

These three complement each other: brainstorm = breadth, gap = structured-lens audit, kick = engine-driven gap traversal.
