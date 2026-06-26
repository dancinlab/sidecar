---
description: /email send|history|list|help — transactional email via the Postmark API. Server token from `secret get postmark.server_token` (never in argv); body read from a FILE. Flags → `--help`. Triggers — "이메일 보내", "메일 발송", "send an email", "이메일 전송", "postmark", "/email", "/mail".
argument-hint: "send --to <a> --subject <s> [--from <a>] [--text <file>|-m <inline>] [--html <file>] [--attach <f>] [--dry] | history | list | help"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar email $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
