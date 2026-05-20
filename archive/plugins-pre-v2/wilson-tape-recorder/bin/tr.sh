#!/usr/bin/env sh
# wilson-tape-recorder :: shared entrypoint.
#   tr.sh            — hook (payload on stdin)
#   tr.sh cmd <args> — /wilson-tape-recorder slash command
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_tr.py" "$@"
