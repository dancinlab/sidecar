#!/bin/sh
# PreToolUse(Bash) — suggest `pool on <host>` for host-specific commands.
exec python3 "$(dirname "$0")/_pool_route.py"
