---
description: /naming audit [path] [--ing] [--gate] — repo-wide non-canonical filename auditor: scans the tracked tree for the backlog (version/copy/dup suffixes) the write-time guard doesn't cover. `--ing` summary to this repo's board; `--gate` exits 1 on any hit. Triggers — "네이밍 감사", "naming audit", "파일명 검사", "비표준 이름", "/naming".
argument-hint: "audit [path] [--ing] [--gate]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar naming $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
