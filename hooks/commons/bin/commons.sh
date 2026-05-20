#!/bin/sh
# SessionStart + PreCompact hook — emit commons.tape as additionalContext.
# event name read from stdin payload so re-injection on context compaction
# is treated as a real PreCompact response (not a stale SessionStart).
TAPE="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}/commons.tape"
python3 -c "
import json, pathlib, sys
payload = {}
try:
    payload = json.load(sys.stdin)
except Exception:
    pass
event = payload.get('hookEventName', 'SessionStart')
body = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
print(json.dumps({'hookSpecificOutput': {
    'hookEventName': event,
    'additionalContext': body,
}}))
" "$TAPE"
