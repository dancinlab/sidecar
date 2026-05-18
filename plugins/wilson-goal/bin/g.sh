#!/usr/bin/env sh
# wilson-goal :: shared entrypoint.
#   g.sh            — SessionStart / UserPromptSubmit hook (payload stdin)
#   g.sh cmd <args> — /wilson-goal slash command
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_g.py" "$@"
