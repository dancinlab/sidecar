---
description: Immediately inject the latest sidecar commons.tape + project.tape into the current session AND sync the local install for next session. Runs `sidecar sync` (marketplace pull + cache copy + installed_plugins.json patch), then prints the current commons.tape + (cwd's) project.tape so the model picks them up THIS turn.
allowed-tools: Bash
---

!`set -e
sidecar sync
echo
LATEST_COMMONS=$(ls -1v ~/.claude/plugins/cache/sidecar/commons/ | tail -1)
echo "═══ commons.tape (v$LATEST_COMMONS) ═══"
cat ~/.claude/plugins/cache/sidecar/commons/$LATEST_COMMONS/commons.tape
if [ -f "$(pwd)/project.tape" ]; then
  echo
  echo "═══ project.tape ($(pwd)/project.tape) ═══"
  cat project.tape
fi`
