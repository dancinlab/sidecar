---
description: Extract a YouTube video's caption transcript (manual or auto-generated, any available language). Pass a video URL or 11-char id, optionally a language code. No API key needed.
argument-hint: "<youtube-url-or-id> [lang]"
allowed-tools: Bash
---

!`H="$CLAUDE_PLUGIN_ROOT/bin/_yt.hexa"; [ -f "$H" ] || { V="$(ls -1 "$HOME/.claude/plugins/cache/sidecar/research" 2>/dev/null | sort -V | tail -1)"; [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/research/$V/bin/_yt.hexa"; }; hexa run "$H" $ARGUMENTS`
