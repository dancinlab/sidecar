#!/bin/sh
# PreToolUse(Edit|Write) — deny edits introducing non-do/dont fields in @D blocks of .tape files.
exec python3 "$(dirname "$0")/_tape_lint.py"
