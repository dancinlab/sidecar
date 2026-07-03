---
description: /reap [--dry-run|--max-refresh N|--no-close|--artifact RE] — drain stale open PRs — merge MERGEABLE (no-admin), refresh-merge CONFLICTING (doc files auto-resolved, code conflicts abort), ≥7d code-conflict PRs closed with branch preserved. Triggers — "PR 정리", "방치 PR", "PR 쌓였어", "reap", "/reap".
---

Run the stale-PR reaper in the current repo and relay its per-PR verdict lines verbatim:

```
!sidecar reap $ARGUMENTS
```

Start with `--dry-run` when the user asks for a triage/classification only (no pushes, merges, or closes). The engine never force-pushes and never deletes branches on close; external-author PRs are only counted, never touched.
