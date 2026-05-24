---
description: Atomic ship tail — stage explicit paths + credential-scan + commit + push origin/<branch> + sidecar sync. Bump ALL version surfaces FIRST (plugin.json · marketplace.json · README · CHANGELOG) per @D g22; then /ship -m "<msg>" <path>...
argument-hint: "-m \"<commit message>\" <path> [<path>...]"
allowed-tools: Bash
---

!`H="$CLAUDE_PLUGIN_ROOT/bin/_ship.hexa"; [ -f "$H" ] || { V="$(ls -1 "$HOME/.claude/plugins/cache/sidecar/ship" 2>/dev/null | sort -V | tail -1)"; [ -n "$V" ] && H="$HOME/.claude/plugins/cache/sidecar/ship/$V/bin/_ship.hexa"; }; hexa run "$H" $ARGUMENTS`
