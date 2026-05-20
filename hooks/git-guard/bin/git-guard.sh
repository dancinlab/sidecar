#!/bin/sh
# PreToolUse(Bash) — deny force / no-verify git operations.
exec python3 "$(dirname "$0")/_git_guard.py"
