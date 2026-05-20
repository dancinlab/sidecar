#!/usr/bin/env sh
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_inject.py" "$@"
