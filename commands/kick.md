---
description: /kick <natural-language seed> — runs `hexa kick --seed "<seed>"` via `sidecar kick` (gap-breakthrough discovery engine, aliased to `hexa drill`). Bare args join into the seed; leading flags (--rounds, --engine) pass through. Triggers — "kick this", "gap breakthrough on", "발산", "돌파해줘", "drill <X>", "/kick".
argument-hint: "<seed expression — natural language allowed>"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar kick $ARGUMENTS || echo "sidecar CLI not found"`
