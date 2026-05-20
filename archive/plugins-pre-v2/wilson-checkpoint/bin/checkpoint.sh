#!/usr/bin/env sh
# wilson-checkpoint :: shared entrypoint.
#   checkpoint.sh hook        — hook payload on stdin (event from payload)
#   checkpoint.sh cmd <args>  — /wilson-checkpoint:checkpoint slash command
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_checkpoint.py" "$@"
