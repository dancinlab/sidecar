---
description: /email send --to <a> --subject <s> [--from <a>] [--text <file>|-m <inline>] [--html <file>] [--cc][--bcc][--reply-to][--tag][--stream][--attach <f>]... [--dry] | history | list | help — transactional email via the Postmark API. Server token from `secret get postmark.server_token` (curl -K · never in argv); body read from a FILE. Triggers — "이메일 보내", "메일 발송", "send an email", "이메일 전송", "postmark", "/email", "/mail".
argument-hint: "send --to <a> --subject <s> [--from <a>] [--text <file>|-m <inline>] [--html <file>] [--attach <f>] [--dry] | history | list | help"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness email $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
