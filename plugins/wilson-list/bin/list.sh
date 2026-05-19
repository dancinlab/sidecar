#!/usr/bin/env sh
# wilson-list :: UserPromptSubmit hook.
# Thin wrapper: execs the real script so python3's stdin IS the Claude
# Code hook payload pipe. Logic + docs live in _list.py.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_list.py"
