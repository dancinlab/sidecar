---
description: Search the arXiv API by free-text query, or look up a paper by arXiv id. Returns title / authors / date / categories / pdf link / abstract for each result. No API key needed.
argument-hint: "<query | arxiv-id> [--n N]"
allowed-tools: Bash
---

!`H="$CLAUDE_PLUGIN_ROOT/bin/_arxiv.hexa"; [ -f "$H" ] || { V="$(ls -1 "$HOME/.claude/plugins/cache/sidecar/research" 2>/dev/null | sort -V | tail -1)"; [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/research/$V/bin/_arxiv.hexa"; }; hexa run "$H" $ARGUMENTS`
