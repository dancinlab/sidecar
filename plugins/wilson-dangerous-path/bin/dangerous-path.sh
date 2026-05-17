#!/usr/bin/env sh
# wilson-dangerous-path :: PreToolUse hook wrapper. Execs the real script
# so python3's stdin IS the hook payload pipe. Logic in _dangerous_path.py.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_dangerous_path.py"
