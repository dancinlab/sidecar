#!/usr/bin/env sh
# wilson-hexa-verify :: PostToolUse hook wrapper. Execs the real script so
# python3's stdin IS the hook payload pipe. Logic in _verify_watch.py.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_verify_watch.py"
