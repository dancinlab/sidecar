#!/usr/bin/env sh
# wilson-secret-guard :: PreToolUse + UserPromptSubmit hook wrapper.
# Execs the real script so python3's stdin IS the hook payload pipe.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_secret_guard.py"
