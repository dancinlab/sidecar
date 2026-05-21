#!/usr/bin/env sh
# research :: /research:yt command backend.
# Extracts a YouTube video's caption transcript; output goes to the
# model + user. Pure Python stdlib — no deps, no binaries.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_yt.py" "$@"
