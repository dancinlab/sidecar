---
description: /init [--force] [--dry-run] [--config-only] — scaffold sidecar into a repo — config + .harness rules + gitignore + wrapper (agent hooks stay global). `--config-only` skips the doc scaffolds. Triggers — "사이드카 설치", "sidecar init", "repo 에 사이드카", "scaffold sidecar", "/init".
argument-hint: "[--force] [--dry-run] [--config-only]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar init $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
