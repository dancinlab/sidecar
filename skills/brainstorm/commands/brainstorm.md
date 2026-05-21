---
description: Iterative brainstorming — given a seed concept, generate ideas in rounds and KEEP GOING until depletion (no genuinely new ideas vs prior rounds; cap 8 rounds). For width over selection.
argument-hint: "<seed concept or question>"
allowed-tools: Bash
---

Engage the `brainstorm` skill with seed: `$ARGUMENTS`.

Run as a multi-round depletion loop per SKILL.md:

1. **Round 1** — 5–8 distinct angles (obvious + unconventional + contrarian + hyper-narrow).
2. **Self-check** — name the quadrants/axes covered; identify missing.
3. **Round N (2,3,…)** — 3–5 more, each distinct from prior and filling a gap or going deeper/weirder.
4. **Depletion check each round** — stop when >50% of new ideas are paraphrases OR can't generate non-paraphrased for a named gap. Hard cap 8 rounds.
5. **Depletion summary** — total count · quadrants covered · top-3 picks · unfilled gaps.

Number IDs are persistent across rounds (round 2's first new = `6.`).
