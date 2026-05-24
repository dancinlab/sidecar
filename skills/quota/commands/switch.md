---
description: /quota:switch <ref> — switch the live Claude account (verified + rollback on failure). <ref> = nickname (e.g. claude1) · email · numeric index. Restart `claude` after a successful switch.
argument-hint: "<nickname | email | index>"
allowed-tools: Bash
---

!`H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/quota/$V/bin/_quota.hexa"
fi
[ -f "$H" ] || { echo "✗ _quota.hexa not found — run /reload-plugins or hx install sidecar"; exit 1; }
hexa run "$H" switch $ARGUMENTS`
