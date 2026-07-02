---
description: /fable <지시> — delegate ONE instruction to the Fable 5 model via headless `claude -p` (sidecar fable · default model claude-fable-5 · per-call, session backend untouched). Triggers — "fable 한테", "fable 모델로", "파블 시켜", "ask fable", "fable 에게 물어봐", "/fable".
argument-hint: "<prompt> | --file <f> | - [-m model] [--json] [--dry] [-- claude flags]"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar fable $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
