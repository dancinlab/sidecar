---
description: /ij — short alias for /inject. Immediately injects the latest sidecar commons.tape + project.tape into the current session AND syncs the local install for the next session.
allowed-tools: Bash
---

!`sidecar sync; echo; COMMONS=~/.claude/plugins/marketplaces/sidecar/hooks/commons; VER=$(grep -o '"version"[^,}]*' "$COMMONS/.claude-plugin/plugin.json" | grep -o '[0-9][0-9.]*' | head -1); echo "═══ commons.tape (v$VER) ═══"; cat "$COMMONS/commons.tape"; [ -f "$(pwd)/project.tape" ] && { echo; echo "═══ project.tape ($(pwd)/project.tape) ═══"; cat project.tape; }; true`
