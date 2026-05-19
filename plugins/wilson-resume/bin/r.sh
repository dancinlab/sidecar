#!/usr/bin/env sh
# wilson-resume :: shared entrypoint.
#   r.sh            — Stop / SessionEnd / SessionStart hook (payload stdin)
#   r.sh cmd <args> — /wilson-resume slash command
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_r.py" "$@"
