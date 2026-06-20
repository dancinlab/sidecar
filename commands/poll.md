---
description: /poll [interval-seconds] [target] — self-paced ≥10-min polling runbook (c19-sanctioned). Wake on a timer, check the watched state ONCE per wake, fire-on-arrival, reschedule; interval clamped to a ≥600s floor (default 1200s). The sanctioned alternative to hand-rolled bash sleep loops and to reacting to every idle ping. Triggers — "10분 폴링", "주기적으로 확인", "폴링 모드", "poll every", "watch loop", "/poll", "n분마다 체크".
argument-hint: "[interval-seconds] [what to watch]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness poll $ARGUMENTS || echo "harness CLI not found"`
