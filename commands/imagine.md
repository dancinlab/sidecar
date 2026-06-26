---
description: /imagine <prompt-file> <out.png> [flags] | list | help | history — generic AI image generator (fal default / openai). Keys via `secret get`; prompt read from a FILE (no argv leak). Flags → `--help`. Triggers — "이미지 생성", "이미지 만들어", "그림 그려줘", "표지 만들어", "generate an image", "draw a cover".
argument-hint: "<prompt-file> <out.png> [-s size] [-b fal|openai] [-m model] | list | help | history"
allowed-tools: Bash
---

!`command -v sidecar >/dev/null 2>&1 && sidecar imagine $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
