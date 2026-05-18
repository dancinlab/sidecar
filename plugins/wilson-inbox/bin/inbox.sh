#!/usr/bin/env sh
# wilson-inbox :: shared entrypoint.
#   inbox.sh            — SessionStart hook (payload on stdin)
#   inbox.sh cmd <args> — /wilson-inbox:inbox slash command
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_inbox.py" "$@"
