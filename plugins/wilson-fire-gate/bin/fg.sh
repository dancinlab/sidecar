#!/usr/bin/env sh
# wilson-fire-gate :: shared entrypoint.
#   fg.sh            — SessionStart / UserPromptSubmit / PostCompact hook
#   fg.sh cmd <args> — /wilson-fire-gate slash command
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_fg.py" "$@"
