#!/usr/bin/env sh
# wilson-hexa-verify :: PreToolUse hook wrapper. Execs the real script so
# python3's stdin IS the hook payload pipe. Logic + docs in _hexa_verify.py.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_hexa_verify.py"
