---
description: /quota:refresh [<ref>] — re-fetch 5h/7d into the per-account cache. No arg → active account (live creds). With ref → a registered account (creds pulled from backup store). Renews expired tokens via refreshToken grant.
argument-hint: "[<nickname | email | index>]"
allowed-tools: Bash
---

!`H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/quota/$V/bin/_quota.hexa"
fi
[ -f "$H" ] || { echo "✗ _quota.hexa not found — run /reload-plugins or hx install sidecar"; exit 1; }
hexa run "$H" refresh $ARGUMENTS`
