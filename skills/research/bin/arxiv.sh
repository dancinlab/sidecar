#!/usr/bin/env sh
# research :: /research:arxiv command backend.
# Searches / fetches arXiv via the official API; output goes to the
# model + user. Pure stdlib — no deps, no binaries, no API key.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_arxiv.py" "$@"
