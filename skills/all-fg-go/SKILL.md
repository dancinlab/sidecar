---
name: all-fg-go
description: Run the prior turn's branches one at a time in the foreground — reactive single fan-out of what the immediately-preceding turn offered, executed SEQUENTIALLY (no parallelism, no background). `/afg` is the 3-char alias. Triggers — "all fg go", "all fg", "afg", "다 순차", "전부 순차 실행", "하나씩 다 해", "run them all in order", "do them all sequentially". The foreground-sequential sibling of all-bg-go. For a self-generating loop use /cycle-fg.
allowed-tools: Agent, Bash, Read
---

@D all-fg-go := "run the prior turn's branches one at a time in the foreground" :: skill
  do   = "print a plan table · run each prior-turn branch sequentially (run_in_background:false) · ▶ i/N → ✅/⚠/❌ · halt on failure"
  dont = "parallelize · background-fan-out · re-ask which to pick · invent branches · fan out destructive ops · continue past a failed branch"
