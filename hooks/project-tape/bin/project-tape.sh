#!/bin/sh
# PreCompact + PostCompact hook — emit <cwd>/project.tape as additionalContext
# so the project's identity + governance survive auto-compaction (SessionStart
# is skipped because the harness already loads CLAUDE.md → project.tape via
# symlink at session bootstrap). No-op when project.tape is absent. Event name
# is read from the stdin payload so each fire reports the actual event.
TAPE="${PWD}/project.tape"
python3 -c "
import json, pathlib, sys
payload = {}
try:
    payload = json.load(sys.stdin)
except Exception:
    pass
event = payload.get('hookEventName', 'PreCompact')
tape = pathlib.Path(sys.argv[1])
out = {'hookSpecificOutput': {'hookEventName': event}}
if tape.exists():
    out['hookSpecificOutput']['additionalContext'] = tape.read_text(encoding='utf-8')
print(json.dumps(out))
" "$TAPE"
