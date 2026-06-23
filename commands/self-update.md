---
description: /self-update — git-pull the sidecar CLI clone this binary runs from (~/.sidecar/cli) to latest main. Triggers — "사이드카 자체 업데이트", "self-update", "sidecar 최신화", "/self-update".
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar self-update $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
