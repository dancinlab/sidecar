---
description: /changelog {add|list|render|fold|prune|autoprune|migrate} — append-only history as CHANGELOG.jsonl (add appends+trims keep-N). Opt-in fragment mode: with a CHANGELOG.d/ dir, add writes one file per PR (conflict-free concurrent PRs); fold/render collect them. Triggers — "이력 정리", "/changelog".
argument-hint: "{add \"<title>\"|list|render|fold|prune --keep N|autoprune|migrate}"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar changelog $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
