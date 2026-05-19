#!/usr/bin/env sh
# wilson-tree :: SessionStart / UserPromptSubmit / PostCompact hook.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_tree.py" inject "$@"
