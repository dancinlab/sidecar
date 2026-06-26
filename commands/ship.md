---
description: /ship [--no-doc] — one-shot propagate an implementation to EVERY sidecar surface in order: pr-cycle (verified merge) → self-update (global CLI) → shadow (re-mirror slash commands). Run after every implementation. Triggers — "ship", "배포", "전파", "구현 끝 ship", "/ship".
argument-hint: "[--no-doc]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar ship $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
