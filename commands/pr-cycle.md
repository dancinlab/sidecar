---
description: /pr-cycle [--no-reap] [gh flags] — push branch → open PR → self-merge (squash · admin · delete-branch) → local base ff-sync → reap stale open PRs (auto-merge mergeable · report conflicting · --no-reap skips). Doc-gate enforced. ⚡ DIRECT-EXECUTE — run immediately on request; NO 4-axis recommendation box, NO "진행할까요?" confirmation (the user asked to merge — just do it; doc-gate/branch-guard still protect). Triggers — "PR 돌려", "pr cycle", "머지해줘", "push and merge", "셀프머지", "/pr-cycle".
argument-hint: "[--no-reap] [gh flags]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness pr-cycle $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
