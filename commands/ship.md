---
description: /ship [--no-doc] — one-shot propagate an implementation to EVERY harness install surface in the one correct order: pr-cycle (doc-gate → push → PR → verified merge → local main sync) → self-update (git-pull the global CLI ~/.harness/cli) → shadow (re-mirror commands/ → ~/.claude/commands/ so new slash commands appear). Prevents the recurring gap where a change merges but a new slash command stays invisible because the shadow mirror was never refreshed. Run after every implementation. Triggers — "ship", "배포", "전파", "구현 끝 ship", "/ship".
argument-hint: "[--no-doc]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness ship $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
