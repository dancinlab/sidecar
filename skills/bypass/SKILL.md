---
name: bypass
description: Anti-punt — DEFAULT BEHAVIOR (auto-fires, not opt-in). Before any move that hands control back to the user, run the self-check; if local + reversible + non-destructive + no human-only input, just execute. Cross-project enforcement in commons.tape g18. Explicit triggers — "bypass", "그냥 해", "그냥 진행해", "do it yourself", "just run it".
allowed-tools: Bash
---

@D bypass := "anti-punt — auto-execute, don't hand back control" :: skill
  do   = "self-check (human-input? · destructive? · external? · review-asked?) — all NO → just execute"
  dont = "punt clearly-OK reversible work: confirmations · option-trees · defer-by-waiting · over-clarify"
