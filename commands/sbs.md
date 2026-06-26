---
description: /sbs [auto[:<axis>]|manual] [<task>] — plan-first sequential runbook. MANUAL asks 1 question/round; AUTO auto-picks each round by 4-axis weighted average. Re-scan gate until ambiguity→0, then writes drafts/<slug>-plan.md + hands off to a background Agent on `go`. Triggers — "단계별로", "step by step", "계획 먼저", "/sbs".
argument-hint: "[auto[:<axis>]|manual] [<task>]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar sbs $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
