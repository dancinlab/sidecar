#!/usr/bin/env sh
# wilson-guards :: PreToolUse hook wrapper. Execs the real script so
# python3's stdin IS the hook payload pipe. Logic in _guards.py:
# ssot-lock / tape-append-only / domain-lint — each inert unless its
# dancinlab-workflow convention is present in the project.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_guards.py"
