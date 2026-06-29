---
description: /switch {glm|claude|toggle|status} — swap Claude Code's backend between the official Anthropic API and Z.AI GLM (rewrites ~/.claude/settings.json env; key from `secret get zai.api_key`; needs a restart). Triggers — "GLM 으로 바꿔", "z.ai 로 전환", "클로드 공식으로", "백엔드 전환", "switch to glm", "switch to claude", "/switch".
argument-hint: "{glm|claude|toggle|status}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar switch $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
