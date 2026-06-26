---
description: /ci-track <pr#|branch|url> [flags] — track a PR's remote CI checks via gh → aggregate pass/fail/pending + 🟢/🔴/🟡 verdict; `--watch` polls until terminal, `--merge-on-green` auto squash-merges. Flags → `--help`. Triggers — "CI 상태", "PR 체크 확인", "그린이면 머지", "watch ci", "merge on green", "/ci-track", "CI 추적".
argument-hint: "<pr#|branch|url> [--watch] [--merge-on-green]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar ci-track $ARGUMENTS || echo "sidecar CLI not found"`
