#!/usr/bin/env sh
# wilson-roi :: UserPromptSubmit hook.
# Thin wrapper: execs the real script so python3's stdin IS the Claude
# Code hook payload pipe. Logic + docs live in _roi.py.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_roi.py"
