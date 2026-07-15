---
description: /pod — GPU cloud pod 로스터 + dispatch + auto-polling (공용 ~/.sidecar/pods.jsonl SSOT). `pod add/rm/list` = 실행중 팟 로스터(was `ing pod`). `pod poll <id>` = one-shot via hexa cloud(READ-ONLY 기본). `pod watch/unwatch` = ≥10분 cadence. Triggers — "GPU 포드", "pod 발사", "rent gpu", "pod 폴링", "watch pod", "/pod".
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar pod $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
