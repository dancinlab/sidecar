---
description: /pr-cycle [--no-reap] [gh flags] — push branch → open PR → self-merge (squash · admin · delete-branch) → local base ff-sync → reap stale PRs. Doc-gate enforced. ⚡ DIRECT-EXECUTE — run immediately, NO 4-axis box, NO confirmation. Triggers — "PR 돌려", "pr cycle", "머지해줘", "push and merge", "/pr-cycle".
argument-hint: "[--no-reap] [gh flags]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar pr-cycle $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
