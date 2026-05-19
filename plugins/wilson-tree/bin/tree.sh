#!/usr/bin/env sh
# wilson-tree :: /wilson-tree slash command entrypoint.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_tree.py" cmd "$@"
