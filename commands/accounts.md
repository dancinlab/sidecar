---
description: /accounts list|status|code|add|retire|init — multi-account roster over the secret store (group patterns = data in ~/.sidecar/accounts.json); code = newest verification OTP via gmail API; passwords never printed. Triggers — "다계정", "계정 관리", "인증 코드", "account roster", "verification code", "/accounts".
argument-hint: "[list] [--group g] [--json] | status | code <n|email> [--window 10m] [--wait <sec>] | add [--index n] | retire <n> [--force] | init | help"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar accounts $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
