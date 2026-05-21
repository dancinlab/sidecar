#!/bin/sh
# SessionStart + PreCompact + PostCompact hook — render commons.json
# (do/dont) as additionalContext. Event name is read from the stdin
# payload so each fire reports the actual event (SessionStart on session
# bootstrap, PreCompact before compaction, PostCompact after the recap
# to re-inject fresh into the post-compaction context).
DATA="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}/commons.json"
python3 -c "
import json, pathlib, sys
payload = {}
try:
    payload = json.load(sys.stdin)
except Exception:
    pass
event = payload.get('hookEventName', 'SessionStart')
data = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
lines = ['# commons — cross-project do/dont', '', '## Do']
lines += [f'- {x}' for x in data.get('do', [])]
lines += ['', \"## Don't\"]
lines += [f'- {x}' for x in data.get('dont', [])]
body = '\n'.join(lines) + '\n'
print(json.dumps({'hookSpecificOutput': {
    'hookEventName': event,
    'additionalContext': body,
}}))
" "$DATA"
