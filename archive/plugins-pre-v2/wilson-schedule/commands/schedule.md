---
description: wilson-schedule — global daily-routine task list whose `run` fans every pending task out to a background subagent in parallel. `add "<task>"` registers a free-text task; `list` shows them; `run` (or `진행`, also triggered by typing the phrase `스케쥴 진행`) dispatches ALL pending tasks at once as background agents; `running <id|all>` / `done <id> ["<result>"]` move a task's state; `rm <id>` / `clear [done|all]` prune; `status` shows counts. State is one global JSON file.
argument-hint: "[status | add \"<task>\" | list | run | running <id|all> | done <id> [\"<result>\"] | rm <id> | clear [done|all]]"
allowed-tools: Bash
disable-model-invocation: true
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/sched.sh" cmd $ARGUMENTS`
