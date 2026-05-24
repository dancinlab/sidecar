---
description: /quota:add [<nick>] — register the live ~/.claude.json account + capture its OAuth blob into the per-account backup store. Nickname is optional; re-adding an existing account with a new nick UPDATES the nick in place (no dup row, no cred re-capture).
argument-hint: "[<nickname>]"
allowed-tools: Bash
---

!`H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/quota/$V/bin/_quota.hexa"
fi
[ -f "$H" ] || { echo "✗ _quota.hexa not found — run /reload-plugins or hx install sidecar"; exit 1; }
hexa run "$H" add $ARGUMENTS`
