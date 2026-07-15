---
description: /ing [show|add|done|next|inject] — in-progress board → ING.jsonl (작업·next; done=scrub; my-repo only). Free text → `printf '%s' "<text>" | sidecar ing add --stdin`. Triggers — "진행보드", "ING 등록", "작업 남겨놔", "ing add", "인계", "/ing".
argument-hint: "[show|add|done|next|inject]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar ing $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
