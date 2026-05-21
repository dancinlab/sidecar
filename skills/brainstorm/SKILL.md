---
name: brainstorm
description: |
  Iterative brainstorming — given a seed concept, generate fresh angles
  in batches and KEEP GOING until depletion (no genuinely new ideas vs.
  prior rounds). Invoke when the user wants width over selection — they
  want every angle, not the "best" pick. Triggers on phrases like
  "brainstorm <X>", "ideate on <X>", "exhaust ideas on <X>",
  "고갈까지 brainstorm", "쥐어짜봐", "모든 각도 생각해봐",
  "ideate until empty", "exhaust the well".
allowed-tools: Bash
---

# brainstorm — ideate until depletion

## When to use

The user wants to widely explore a problem / opportunity space, NOT pick the best option yet. They want EVERY angle, however weird, until the well runs dry. Use this any time the user signals breadth over selection.

Do NOT use for "give me 5 ideas" (that's a one-shot list, not depletion).

## How to run (rounds)

### Round 1 — seed spread

Output a numbered list of **5–8 distinct ideas/angles** for the seed concept. Be wide, not safe:

- Include the OBVIOUS (the user probably already thought of these — name them anyway)
- Include the UNCONVENTIONAL (orthogonal axis the user didn't ask about)
- Include the CONTRARIAN (do the opposite of what's expected)
- Include at least one HYPER-NARROW (a tiny specific sub-case)

Format: `1. <idea> — <≤1 sentence why-or-how>`

### Self-check before round 2

Re-read what you produced. Identify the **SHAPE** of the space you covered. Name 3–5 quadrants/axes (e.g. for "improve API rate-limiting": *tech-side · ops-side · pricing-side · user-side · contrarian*). What quadrants are MISSING from round 1?

### Round N (N = 2, 3, …)

Generate **3–5 MORE ideas**, each MUST be:
- Distinct from ALL prior rounds (not a paraphrase / minor variant)
- Filling a missing quadrant, OR
- Going deeper / weirder / more contrarian inside an already-covered quadrant

Header each round `### Round N (M new)`.

### Depletion check — every round

Check after generating round N:
- If >50% of the new ideas are paraphrases / minor variants of earlier ones → **DEPLETED**
- If you can NAME a missing quadrant but can't generate non-paraphrased ideas for it → **DEPLETED**
- Hard cap: **8 rounds regardless**

### On depletion

Stop generating. Output a brief structural summary:

```
### Depleted — Round N · K total distinct ideas

**Quadrants covered:**
- <quadrant 1> (count)
- <quadrant 2> (count)
- ...

**Top-3 picks** (your judgment, for the user to narrow from):
1. <idea> — <why it stands out>
2. ...
3. ...

**Gaps** (quadrants you couldn't fill — possibly the right place for the user to push back):
- <unfilled quadrant>: <why depleted on this axis>
```

## Tips

- Number IDs are persistent (Round 2's first new idea is `6.` not `1.`) — easier reference.
- For tech / research seeds, recommend `hexa kick --seed "<expr>" --rounds N` after round 1 (it's an independent gap-discovery engine; cite it but don't substitute for the brainstorm itself).
- Reserve at least 1 contrarian per round through round 3 — that's where the breakthrough usually hides.
- If the user interrupts mid-round to pick / redirect, treat as "selection mode" and stop the depletion loop.

## Output style

- Numbered list, one idea per line, ≤ 2 sentences per idea
- Round headers as shown above
- No decorative prose, no "Here are some ideas:" preambles — just the round
