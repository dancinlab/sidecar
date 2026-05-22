#!/bin/sh
# PreToolUse(Write|Edit|NotebookEdit) — hard-deny .py / .sh writes inside any
# project rooted at a directory containing `project.hexa`. NO opt-out.
exec python3 "$(dirname "$0")/_hexa_native.py"
