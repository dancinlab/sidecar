---
description: /imagine <prompt-file> <out.png> [-s size] [-b backend] [-m model] — generic AI image generator. Backends — fal (queue+poll fal.ai, default) or openai (sync /v1/images/generations). Canonical sizes — square_hd / landscape_16_9 / portrait_16_9 / square. API keys via `secret get fal.api_key` / `secret get openai.api_key`. Prompt read from file (provenance) and routed via mktemp (no argv leak). Also — /imagine list · /imagine help.
argument-hint: "<prompt-file> <out.png> [-s size] [-b fal|openai] [-m model] | list | help"
allowed-tools: Bash
---

!`R="$CLAUDE_PLUGIN_ROOT"; H="$R/bin/_imagine.hexa"; [ -f "$H" ] || { V="$(ls -1 "$HOME/.claude/plugins/cache/sidecar/imagine" 2>/dev/null | sort -V | tail -1)"; [ -n "$V" ] && { R="$HOME/.claude/plugins/cache/sidecar/imagine/$V"; H="$R/bin/_imagine.hexa"; }; }; hexa run "$H" --root "$R" $ARGUMENTS`
