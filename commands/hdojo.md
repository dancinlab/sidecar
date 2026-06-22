---
description: /hdojo [<slug>] [--lang] — harness cloud training-job scaffolder (runbook + exports/dojo/<slug>/ emit). Renamed from /dojo (which now passes through to `hexa dojo`). Triggers — "harness 학습잡", "harness dojo", "하네스 학습 스캐폴드", "/hdojo".
argument-hint: "[<slug>] [--lang]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness dojo $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
