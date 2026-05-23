---
description: Immediately inject the latest sidecar commons.tape + project.tape into the current session AND sync the local install for next session. Runs `sidecar sync` (marketplace pull + cache copy + installed_plugins.json patch), then prints the current commons.tape + (cwd's) project.tape so the model picks them up THIS turn.
allowed-tools: Bash
---

!`set -e
sidecar sync
echo
COMMONS=~/.claude/plugins/marketplaces/sidecar/hooks/commons
VER=$(grep -o '"version"[^,}]*' "$COMMONS/.claude-plugin/plugin.json" | grep -o '[0-9][0-9.]*')
echo "═══ commons.tape (v$VER) ═══"
cat "$COMMONS/commons.tape"
if [ -f "$(pwd)/project.tape" ]; then
  echo
  echo "═══ project.tape ($(pwd)/project.tape) ═══"
  cat project.tape
fi`
