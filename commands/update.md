---
description: /update [--hooks] — bump the .harness-engine submodule to latest + optional hook refresh. Triggers — "사이드카 업데이트", "sidecar update", "/update".
argument-hint: "[--hooks]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar update $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
