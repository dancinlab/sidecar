---
description: /quota — Claude account 5h/7d usage limits + multi-account registry + live credential swap + per-account nicknames. Bare form → status. Each verb also has its own picker entry: /quota:status · /quota:list · /quota:add [<nick>] · /quota:nick <ref> [<nick>] · /quota:switch <ref> · /quota:remove <ref> · /quota:refresh [<ref>] · /quota:help. <ref> = nickname (e.g. claude1) · email · numeric index. Live fetch via OAuth usage endpoint with 45s per-account cache; labelled-stale fallback (honest, never faked). Per-account OAuth blob in macOS keychain svc "sidecar-quota" / linux $HOME/.sidecar/quota/creds/<email>.json (0600). own-accounts-serial only. ⚠ uses non-public Anthropic OAuth endpoints — may break if rotated.
argument-hint: "[status | list | add [<nick>] | nick <ref> [<nick>] | switch <ref> | remove <ref> | refresh [<ref>] | help]"
allowed-tools: Bash
---

!`H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/quota/$V/bin/_quota.hexa"
fi
[ -f "$H" ] || { echo "✗ _quota.hexa not found — run /reload-plugins or hx install sidecar"; exit 1; }
hexa run "$H" $ARGUMENTS`
