#!/usr/bin/env sh
# wilson-prefs :: /wilson-prefs:prefs command backend.
# Mutates/shows the persisted prefs; output is shown to the user + model.
# State lives in $CLAUDE_PLUGIN_DATA (persists across plugin updates).
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$dir/_prefs.py" "$@"
