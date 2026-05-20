#!/bin/sh
# SessionStart hook — emit commons.tape as additionalContext (JSON-escaped).
TAPE="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}/commons.tape"
python3 -c "
import json, pathlib, sys
body = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
print(json.dumps({'hookSpecificOutput': {
    'hookEventName': 'SessionStart',
    'additionalContext': body,
}}))
" "$TAPE"
