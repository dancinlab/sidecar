---
description: /accounts list|status|code|inbox|add|retire|init — multi-account roster over the secret store (patterns = data); code = newest OTP for one account, inbox = quick check across ALL; passwords never printed. Triggers — "다계정", "계정 관리", "인증 코드", "인증 메일", "account roster", "verification code", "/accounts".
argument-hint: "[list] [--group g] [--json] | status | code <n|email> [--window 10m] [--wait <sec>] | inbox [--window 15m] [--wait <sec>] | add [--index n] | retire <n> [--force] | init | help"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar accounts $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
