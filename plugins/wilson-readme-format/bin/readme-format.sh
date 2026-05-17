#!/usr/bin/env sh
# wilson-readme-format :: PreToolUse hook (v0.1.0)
#
# Thin wrapper: execs the real script so python3's stdin IS the Claude Code
# PreToolUse payload pipe. Logic + docs live in _readme_format.py.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_readme_format.py"
