#!/usr/bin/env sh
# wilson-schedule :: shared entrypoint.
#   sched.sh            — SessionStart / UserPromptSubmit hook (payload stdin)
#   sched.sh cmd <args> — /wilson-schedule:schedule slash command
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_sched.py" "$@"
