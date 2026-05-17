#!/usr/bin/env sh
# wilson-decision-gate :: shared entrypoint.
#   dg.sh            — SessionStart / UserPromptSubmit hook (payload stdin)
#   dg.sh cmd <args> — /wilson-decision-gate slash command
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_dg.py" "$@"
