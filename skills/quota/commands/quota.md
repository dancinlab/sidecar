---
description: /quota <args> — Claude account 5h/7d usage limits + multi-account registry + live credential swap. Verbs — status (default) · list · add (snapshot account + capture creds) · switch <ref> (live cred swap, verified + rollback) · remove <ref> (rm · delete · del) · refresh [<ref>] (re-fetch usage; renews tokens) · help. Live fetch via OAuth usage endpoint with 45s per-account cache; labelled-stale fallback (honest, never faked). Per-account OAuth blob in macOS keychain svc "sidecar-quota" / linux $HOME/.sidecar/quota/creds/<email>.json (0600). own-accounts-serial only. ⚠ uses non-public Anthropic OAuth endpoints — may break if rotated.
argument-hint: "[status | list | add | switch <ref> | remove <ref> | refresh [<ref>] | help]"
allowed-tools: Bash
---

!`H="$CLAUDE_PLUGIN_ROOT/bin/_quota.hexa"
if [ ! -f "$H" ]; then
    V="$(ls -1t "$HOME/.claude/plugins/cache/sidecar/quota" 2>/dev/null | head -1)"
    [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/quota/$V/bin/_quota.hexa"
fi
[ -f "$H" ] || { echo "✗ _quota.hexa not found — run /reload-plugins or hx install sidecar"; exit 1; }
hexa run "$H" $ARGUMENTS`
