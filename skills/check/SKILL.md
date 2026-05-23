---
name: check
description: Task dashboard — print current-state status across surfaces: <UPPERCASE>.log.md checkbox tasks (open vs done) · `gh pr list` open PRs · `git status` uncommitted · `git log` recent merges. Triggers — "/check", "상태", "체크", "현황", "status check", "dashboard".
allowed-tools: Bash
---

@D check := "task dashboard — single-shot status across surfaces" :: skill
  do   = "`/check` aggregates `.log.md` checkboxes · gh open PRs · git status · recent merges"
  dont = "wing a custom status report when /check already aggregates the canonical surfaces"
