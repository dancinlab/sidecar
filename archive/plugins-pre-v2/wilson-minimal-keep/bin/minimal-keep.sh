#!/usr/bin/env sh
# wilson-minimal-keep :: PreToolUse hook (v0.1.0)
#
# Thin wrapper: execs the real script so python3's stdin IS the Claude Code
# PreToolUse payload pipe. Logic + docs live in _minimal_keep.py. Args are
# forwarded so the `scan` audit verb works too.
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_minimal_keep.py" "$@"
