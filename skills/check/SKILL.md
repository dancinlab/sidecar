---
name: check
description: In-flight progress dashboard — report ONLY the progress of work currently running: TaskList state · active monitors · background shell/agent jobs (ps) + their fresh output. Triggers — "/check", "상태", "체크", "현황", "진행상황", "status check", "dashboard".
allowed-tools: Bash
---

@D check := "in-flight progress dashboard — tasks · monitors · shell jobs only" :: skill
  do   = "`/check` reports running-work progress only — pair the shell job scan with TaskList state + active monitors"
  dont = "survey repo state — no `.log.md` backlog · open-PR list · git status · recent-merge enumeration"
