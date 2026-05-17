#!/usr/bin/env sh
# wilson-gpu :: shared entrypoint.
#   gpu.sh            — SessionStart hook (payload on stdin)
#   gpu.sh cmd <args> — /wilson-gpu slash command
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_gpu.py" "$@"
