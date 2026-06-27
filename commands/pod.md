---
description: /pod — GPU cloud pod dispatch runbook + auto-polling. `pod poll <id>` one-shot checks a pod via hexa cloud (alive→util) — READ-ONLY unless --teardown-on-done/--pull. `pod watch <id> [--cron]`/`unwatch`/`list` = ≥10-min cadence polling. Triggers — "GPU 포드", "pod 발사", "rent gpu", "pod 폴링", "watch pod", "/pod".
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar pod $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
