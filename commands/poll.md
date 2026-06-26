---
description: /poll [interval-seconds] [target] — self-paced ≥10-min polling runbook (c19): wake on a timer, check the watched state ONCE per wake, fire-on-arrival, reschedule; interval clamped to ≥600s (default 1200s). Triggers — "10분 폴링", "주기적으로 확인", "폴링 모드", "poll every", "watch loop", "/poll".
argument-hint: "[interval-seconds] [what to watch]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar poll $ARGUMENTS || echo "sidecar CLI not found"`
