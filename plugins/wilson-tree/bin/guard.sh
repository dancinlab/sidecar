#!/usr/bin/env sh
# wilson-tree :: PreToolUse(Write|Edit|MultiEdit) guard.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_tree.py" guard "$@"
