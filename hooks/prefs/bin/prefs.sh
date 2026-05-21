#!/bin/sh
# prefs — user language preferences: code authoring · doc authoring · response.
# Storage: $CLAUDE_PLUGIN_DATA/prefs.json (or ~/.claude/plugins/data/prefs-sidecar/).
# Defaults: code=english, docs=english, response=korean.
#
# Verbs:
#   prefs              show current values
#   prefs show         (same)
#   prefs code <lang>  set code-authoring language (.tape · .hexa · .py · .sh · ...)
#   prefs docs <lang>  set doc-authoring language (.md · README · CHANGELOG · ...)
#   prefs response <lang>  set response language to user
#   prefs inject       (hook handler — emits additionalContext)
set -eu

DATA="${CLAUDE_PLUGIN_DATA:-$HOME/.claude/plugins/data/prefs-sidecar}"
mkdir -p "$DATA"
FILE="$DATA/prefs.json"

if [ ! -f "$FILE" ]; then
  cat > "$FILE" <<'JSON'
{
  "code": "english",
  "docs": "english",
  "response": "korean"
}
JSON
fi

VERB="${1:-show}"
[ $# -ge 1 ] && shift || true

case "$VERB" in
  inject)
    python3 -c "
import json, pathlib, sys
event = 'SessionStart'
try:
    payload = json.load(sys.stdin)
    event = payload.get('hookEventName', 'SessionStart')
except Exception:
    pass
p = json.loads(pathlib.Path('$FILE').read_text())
body = ('# prefs\n'
        '- code authoring (.tape · .hexa · .py · .sh · .swift · ...): ' + p.get('code','english') + '\n'
        '- doc authoring (.md · README · CHANGELOG · ...): ' + p.get('docs','english') + '\n'
        '- response language to user: ' + p.get('response','korean') + '\n')
print(json.dumps({'hookSpecificOutput': {'hookEventName': event, 'additionalContext': body}}))
"
    ;;
  show|"")
    cat "$FILE"
    ;;
  code|docs|response)
    if [ $# -lt 1 ]; then
      echo "usage: prefs $VERB <lang>" >&2
      exit 1
    fi
    LANG="$1"
    python3 -c "
import json, pathlib
p = pathlib.Path('$FILE')
d = json.loads(p.read_text())
d['$VERB'] = '$LANG'
p.write_text(json.dumps(d, indent=2) + chr(10))
print(json.dumps(d, indent=2))
"
    ;;
  -h|--help)
    sed -n '2,16p' "$0" | sed 's/^#\{0,1\} \{0,1\}//'
    ;;
  *)
    echo "prefs: unknown verb '$VERB'" >&2
    echo "  valid: show | code <lang> | docs <lang> | response <lang>" >&2
    exit 1
    ;;
esac
