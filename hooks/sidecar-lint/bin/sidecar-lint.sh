#!/bin/sh
# PreToolUse(Bash) — auto-lint on `git commit` in Claude Code marketplace plugin packs.
exec python3 "$(dirname "$0")/_sidecar_lint.py"
