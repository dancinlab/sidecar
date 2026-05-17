#!/usr/bin/env sh
# wilson-git-guard :: PreToolUse hook wrapper. Execs the real script so
# python3's stdin IS the hook payload pipe. Logic in _git_guard.py.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_git_guard.py"
