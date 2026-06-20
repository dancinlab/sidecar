---
description: /ci-track <pr#|branch|url> [--watch] [--interval=60] [--timeout=1800] [--merge-on-green] [-R owner/repo] — track a PR's remote CI checks via gh → aggregate pass/fail/pending + 🟢GREEN/🔴RED/🟡PENDING verdict. `--watch` polls in-process until terminal (replaces hand-rolled `gh pr checks | grep` + /tmp monitor sleep loops · c19-compatible); `--merge-on-green` auto squash-merges when all checks pass. Triggers — "CI 상태", "PR 체크 확인", "그린이면 머지", "watch ci", "merge on green", "pr checks", "/ci-track", "CI 추적".
argument-hint: "<pr#|branch|url> [--watch] [--merge-on-green]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness ci-track $ARGUMENTS || echo "harness CLI not found"`
