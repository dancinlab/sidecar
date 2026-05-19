#!/usr/bin/env sh
# wilson-tree :: PostToolUse(Write) auto-register.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_tree.py" register "$@"
