---
description: /fable <지시> — delegate ONE instruction to the Fable 5 model via headless `claude -p` (sidecar fable · claude-fable-5 · per-call). Slash form = prompt-only, piped via stdin so parens/globs in free text are safe; flags are CLI-only (`sidecar fable help`). Triggers — "fable 한테", "fable 모델로", "파블 시켜", "/fable".
argument-hint: "<prompt — free text, shell-special chars OK>"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && printf '%s' "$ARGUMENTS" | sidecar fable - || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
