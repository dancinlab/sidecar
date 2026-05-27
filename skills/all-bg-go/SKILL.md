---
name: all-bg-go
description: Fan out the prior turn's branches in parallel — reactive single fan-out of what the immediately-preceding turn offered. `/abg` is the 3-char alias. Triggers — "all bg go", "all bg", "abg", "다 병렬", "전부 병렬 발사", "전부 다 가자", "fan it all out", "do them all in parallel". For a self-generating loop use /cycle.
allowed-tools: Agent, Bash, Read
---

@D all-bg-go := "fan out the prior turn's branches in parallel" :: skill
  do   = "print a plan table · spawn one background Agent per prior-turn branch in the SAME message"
  dont = "re-ask which to pick · invent branches · fan out destructive ops · nest fan-out in sub-agents"
