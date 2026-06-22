---
description: /verify [rubric | fence "<claim>"] — tier-rubric claim verification — colored g5 badges, no LLM self-judge. Triggers — "검증", "claim 검증", "verify claim", "tier 판정", "/verify", "팩트체크".
argument-hint: "[rubric | fence '<claim>']"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness verify $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
