#!/usr/bin/env sh
# wilson-bash-guard :: PreToolUse hook wrapper. Execs the real script so
# python3's stdin IS the hook payload pipe. Logic in _bash_guard.py.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_bash_guard.py"
