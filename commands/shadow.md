---
description: /shadow [plan|remove] — mirror sidecar's own plugin commands into ~/.claude/commands/ as bare /cmd delegators (so /arxiv /paper … resolve to sidecar, not /sidecar:cmd). Marker-tracked · regenerable; `remove` deletes only generated shadows. Triggers — "셰도우 생성", "shadow commands", "/shadow", "mirror plugin commands".
argument-hint: "[plan|remove]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar shadow $ARGUMENTS || echo "sidecar CLI not found"`
