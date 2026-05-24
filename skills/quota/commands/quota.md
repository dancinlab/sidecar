---
description: /quota <args> — Claude account 5h/7d usage limits (read-only · view-only in 0.1.0). Verbs — status (default) · list · help. Live fetch via OAuth usage endpoint (api.anthropic.com/api/oauth/usage) with 45s per-account cache; on live failure serves labelled-stale cache (honest, never faked). Multi-account registry at $HOME/.sidecar/quota/accounts.json. ⚠ uses non-public Anthropic OAuth endpoints — may break if rotated.
argument-hint: "[status | list | help]"
allowed-tools: Bash
---

!`H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/quota/$V/bin/_quota.hexa"
fi
[ -f "$H" ] || { echo "✗ _quota.hexa not found — run /reload-plugins or hx install sidecar"; exit 1; }
hexa run "$H" $ARGUMENTS`
