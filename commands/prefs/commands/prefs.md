---
description: View or set language preferences. 3 axes — code authoring (.tape · .hexa · .py · .sh · ...) · doc authoring (.md · README · CHANGELOG · ...) · response language to user. Defaults: code=english, docs=english, response=korean. Storage at the fixed SSOT ~/.claude/plugins/data/prefs-sidecar/prefs.json. The prefs-hook plugin auto-injects current values on UserPromptSubmit + SessionStart + PreCompact + PostCompact.
argument-hint: "[show | code <lang> | docs <lang> | response <lang>]"
allowed-tools: Bash
---

!`V="$(ls -1 "$HOME/.claude/plugins/cache/sidecar/prefs-hook" 2>/dev/null | sort -V | tail -1)"; H="$HOME/.claude/plugins/cache/sidecar/prefs-hook/$V/bin/_prefs.hexa"; hexa run "$H" $ARGUMENTS`
