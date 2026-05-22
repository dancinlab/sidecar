---
name: cycle
description: Autonomous work-loop driver — self-enumerate next work → plan table → fan out one background Agent per item → loop. Triggers — "/cycle", "사이클", "계속 진행", "다음 라운드 진행", "keep cycling", "march on", "next round". Distinct from all-bg-go (reactive); /cycle self-generates each round.
allowed-tools: Agent, Bash, Read
---

@D cycle := "autonomous loop — next-list → plan → fan-out → loop" :: skill
  do   = "self-enumerate next disjoint work · print plan table · fan out 1 bg Agent per item, one msg"
  dont = "poll/sleep · fan destructive ops · nest /cycle · serialize disjoint items · fabricate filler"
