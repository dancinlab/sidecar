---
description: /uninstall [--dry-run] [--keep-logs] — remove sidecar-injected files (config/.harness/hooks/wrapper); keeps user content. Triggers — "사이드카 제거", "uninstall sidecar", "/uninstall".
argument-hint: "[--dry-run] [--keep-logs]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar uninstall $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
