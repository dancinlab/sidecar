---
description: /shadow [plan|remove] — mirror harness's own plugin commands into ~/.claude/commands/ as bare /cmd delegators, so /arxiv /dojo /paper … resolve to harness (not the namespaced /harness:cmd form). Sidecar-free · marker-tracked · regenerable. `plan` dry-runs; `remove` deletes only harness-generated shadows (hand-authored same-name commands are never touched). Triggers — "셰도우 생성", "바레 명령 생성", "shadow commands", "/shadow", "mirror plugin commands".
argument-hint: "[plan|remove]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness shadow $ARGUMENTS || echo "harness CLI not found"`
