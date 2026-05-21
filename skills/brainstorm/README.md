# brainstorm

Iterative brainstorming — given a seed concept, generate ideas in rounds and KEEP GOING until depletion. For width over selection.

## Trigger

- Natural language: *"brainstorm <X>"*, *"ideate on <X>"*, *"고갈까지 brainstorm"*, *"쥐어짜봐"*, *"모든 각도 생각해봐"*, *"exhaust the well"*.
- Slash command: `/brainstorm <seed>`.

## Loop

```
Round 1   → 5–8 ideas (obvious + unconventional + contrarian + hyper-narrow)
Self-check → name the quadrants covered, identify missing
Round N   → 3–5 more, each distinct + filling a gap OR going deeper/weirder
Depletion check after every round:
  - >50% new ideas are paraphrases of prior → STOP
  - can't generate non-paraphrased for a named missing quadrant → STOP
  - hard cap: 8 rounds
Depletion summary → total · quadrants · top-3 · unfilled gaps
```

## When NOT to use

For "give me 5 ideas" (one-shot list, not depletion). For "pick the best of these 3" (that's selection, not breadth).

## Related

- `hexa kick --seed "<expr>" [--rounds N]` — independent gap-discovery engine. For tech / research seeds, brainstorm may cite it as a complementary tool after round 1.
