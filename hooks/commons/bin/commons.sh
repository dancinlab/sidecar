#!/bin/sh
# SessionStart + PreCompact + PostCompact hook — emit commons.tape as
# additionalContext. Event name is read from the stdin payload so each
# fire reports the actual event (SessionStart on session bootstrap,
# PreCompact before compaction, PostCompact after the recap to re-inject
# fresh into the post-compaction context).
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
