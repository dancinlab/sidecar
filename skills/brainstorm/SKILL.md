---
name: brainstorm
description: Iterative brainstorming — given a seed, generate ideas in rounds and keep going until depletion (breadth over selection). Triggers — "brainstorm <X>", "ideate on <X>", "exhaust ideas on <X>", "쥐어짜봐", "모든 각도 생각해봐", "ideate until empty", "exhaust the well".
allowed-tools: Bash
---

@D brainstorm := "ideate in rounds until depletion" :: skill
  do   = "5-8 ideas round 1 · 3-5 new per round filling missing quadrants · stop at depletion (cap 8)"
  dont = "one-shot list · paraphrase prior ideas · preamble prose · skip the contrarian angle"
