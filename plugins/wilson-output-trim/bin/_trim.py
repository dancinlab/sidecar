#!/usr/bin/env python3
# wilson-output-trim :: PreToolUse hook. Rewrites a Bash command via
# `updatedInput` so its stdout flows through the salience filter before
# the model ingests it — the only real token-economy lever Claude Code
# exposes (PostToolUse cannot mutate tool_response; compaction is
# CC-internal). Verified against code.claude.com/docs/en/hooks.
#
# Safety: pipefail keeps the original command's exit code; only stdout is
# piped (stderr untouched); small outputs pass verbatim (filter no-op
# under its threshold). Skips heredocs / background / already-wrapped.
# Disable per session: SIDECAR_NO_OUTPUT_TRIM=1
import json
import os
import sys

MARK = "__SIDECAR_TRIM__"


def allow():
    sys.exit(0)  # no output → tool runs unchanged


if os.environ.get("SIDECAR_NO_OUTPUT_TRIM") == "1":
    allow()

try:
    payload = json.load(sys.stdin)
except Exception:
    allow()

if payload.get("tool_name") != "Bash":
    allow()

ti = payload.get("tool_input") or {}
if not isinstance(ti, dict):
    allow()
cmd = ti.get("command") or ""
if not cmd.strip():
    allow()

# don't double-wrap; skip constructs where a subshell+pipe is unsafe
if MARK in cmd or "<<" in cmd or cmd.rstrip().endswith("&"):
    allow()

salience = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "bin", "_salience.py",
)

new_cmd = (
    "set -o pipefail; ( %s ) | python3 %s  # %s"
    % (cmd, json.dumps(salience), MARK)
)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "updatedInput": dict(ti, command=new_cmd),
    }
}))
