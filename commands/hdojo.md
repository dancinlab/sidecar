---
description: /hdojo [<slug>] [--lang] — sidecar cloud training-job scaffolder (runbook + exports/dojo/<slug>/ emit). Renamed from /dojo (which now passes through to `hexa dojo`). Triggers — "sidecar 학습잡", "sidecar dojo", "사이드카 학습 스캐폴드", "/hdojo".
argument-hint: "[<slug>] [--lang]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar dojo $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
