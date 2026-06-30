---
description: /pi {install|status|remove} — wire sidecar into the Pi coding agent (earendil-works/pi). Symlinks the bridge extension into ~/.pi/agent/extensions/ + adds ~/.claude/skills to Pi settings; same engine as the CC plugin (Stop-gates stay CC-only). Triggers — "pi 호환", "pi 배선", "wire sidecar into pi", "/pi".
argument-hint: "[install|status|remove]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar pi $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
