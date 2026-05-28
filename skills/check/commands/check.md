---
description: /check — in-flight progress dashboard. Reports ONLY the progress of work that is currently running — background shell/agent jobs (ps) + their freshly-touched output files. Read-only; no side effects. Does NOT survey repo state (no domain backlog / open-PR / git-status enumeration).
allowed-tools: Bash
---

!`echo "=== in-flight background jobs (shell / ps) ==="

# Running background jobs: claude sub-agent eval'd commands, pool / verify / ssh / cloud jobs.
# Exclude this pipeline's own tools (grep/sed/awk/cut/ps) so the scan does not match itself.
# NOTE: the slash-command processor substitutes $<digit>, so use named vars (while read), not awk $1/$2.
JOBS=$(ps -eo pid,etime,command 2>/dev/null \
  | grep -E 'eval |__SIDECAR_POOL__|hexa (verify|run|atlas)|pool on |hexa cloud|ssh ' \
  | grep -vE 'grep -|ugrep|sed -E|awk |cut -c|ps -eo' \
  | while read -r pid etime rest; do printf '  %-7s %-9s %s\n' "$pid" "$etime" "$rest"; done \
  | cut -c1-180)
if [ -n "$JOBS" ]; then echo "$JOBS"; else echo "  (no background shell jobs running)"; fi

echo
echo "=== background task outputs (touched < 20m) ==="
# /tmp is a symlink to /private/tmp on macOS, dedupe by basename ($NF is safe; $<digit> is not) so each file shows once.
OUTS=$(find /private/tmp/claude-* /tmp/claude-* -path '*/tasks/*.output' -mmin -20 2>/dev/null | awk -F/ '!seen[$NF]++')
if [ -n "$OUTS" ]; then
  printf '%s\n' "$OUTS" | head -n 20 | while IFS= read -r f; do
    [ -f "$f" ] || continue
    SZ=$(wc -c < "$f" 2>/dev/null | tr -d ' ')
    MT=$(stat -f '%Sm' -t '%H:%M:%S' "$f" 2>/dev/null)
    LAST=$(tail -1 "$f" 2>/dev/null)
    echo
    case "$LAST" in
      '{'*)  echo "  > $(basename "$f")  agent transcript / ${SZ}B / last ${MT} (in-flight)" ;;
      *)     echo "  > $(basename "$f")  (${SZ}B / last ${MT})"
             tail -3 "$f" 2>/dev/null | cut -c1-160 | sed 's/^/      /' ;;
    esac
  done
else
  echo "  (no task output files touched in last 20m)"
fi

echo
echo "=== recent subagent dispatch (~/.sidecar/subagent-route.log / last 3) ==="
RL="$HOME/.sidecar/subagent-route.log.jsonl"
if [ -f "$RL" ]; then
  tail -3 "$RL" 2>/dev/null | sed -E 's/.*"t":"([^"]*)".*"prompt_preview":"([^"]*)".*/  \1  \2…/' | cut -c1-160
else
  echo "  (no subagent-route log yet)"
fi

echo
echo "--- tasks / monitors are agent-tool surfaces ---"
echo "  (the agent pairs this shell scan with TaskList + active monitors, see SKILL.md)"
`
