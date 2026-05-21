---
description: View or set language preferences. 3 axes — code authoring (.tape · .hexa · .py · .sh · ...) · doc authoring (.md · README · CHANGELOG · ...) · response language to user. Defaults: code=english, docs=english, response=korean. Storage at $CLAUDE_PLUGIN_DATA/prefs.json. Hook auto-injects current values on SessionStart + PreCompact + PostCompact.
argument-hint: "[show | code <lang> | docs <lang> | response <lang>]"
allowed-tools: Bash
---

!`sh "$CLAUDE_PLUGIN_ROOT/bin/prefs.sh" $ARGUMENTS`
