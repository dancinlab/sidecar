---
description: /brainstorm [seed] — iterative ideation rounds until depletion, dispatched to ONE subagent — breadth over selection. Triggers — "브레인스토밍", "아이디어 내줘", "brainstorm", "ideate", "발상", "/brainstorm".
argument-hint: "[seed]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar brainstorm "$ARGUMENTS" || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
