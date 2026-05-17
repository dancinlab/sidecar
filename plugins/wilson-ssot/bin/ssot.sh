#!/usr/bin/env sh
# wilson-ssot :: SessionStart / UserPromptSubmit hook (v0.0.0)
#
# Thin wrapper: execs the real script so python3's stdin IS the Claude Code
# hook payload pipe (a `python3 - <<EOF` heredoc would consume stdin itself).
# Logic + docs live in _ssot.py.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_ssot.py"
