---
description: /ing [show|add [--to <repo>]|done|next|pod ...|inject] — in-progress board → ING.jsonl (작업·POD·next; done=scrub; cross-repo handoff via --to). For free text with shell-special chars (parens·quotes·$·→) call Bash with the STDIN-safe form `printf '%s' "<text>" | harness ing add --stdin` (avoids unquoted-$ARGUMENTS breakage). Triggers — "진행보드", "ING 등록", "작업 남겨놔", "ing add", "인계", "/ing", "ING 에 남겨".
argument-hint: "[show|add [--to <repo>]|done|next|pod ...|inject]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness ing $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
