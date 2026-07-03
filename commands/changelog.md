---
description: /changelog {add|list|render|prune|autoprune|migrate} — append-only history as CHANGELOG.jsonl, or conflict-0 CHANGELOG.d/ shard mode (auto-detected when the dir exists). add appends(body via stdin)+auto-trims keep-N; prune/autoprune drop old. Triggers — "이력 정리", "오래된 changelog 삭제", "/changelog".
argument-hint: "{add \"<title>\"|list|render|prune --keep N|autoprune|migrate}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar changelog $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
