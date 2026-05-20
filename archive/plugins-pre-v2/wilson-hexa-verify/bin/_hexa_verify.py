#!/usr/bin/env python3
# wilson-hexa-verify core — standalone port of wilson's guard-hexa-verify.
# Denies Bash commands that invoke a non-hexa verifier and redirects to the
# hexa CLI. Faithful pattern list (conservative, near-zero false positives).
#
# GATE (per user requirement): INERT unless the `hexa` binary is on PATH —
# a "use hexa instead" redirect is meaningless on a machine without hexa,
# so the plugin no-ops there. Opt out per session: SIDECAR_NO_HEXA_VERIFY=1
import json
import os
import shutil
import sys

# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "hexa-verify" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
        sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass

# faithful pattern list (most-specific first, for the diagnostic)
PATTERNS = [
    "python -m sympy", "python3 -m sympy", "import sympy", "from sympy ",
    "python -m pyphi", "python3 -m pyphi", "import pyphi", "from pyphi ",
    "wolframscript", "mathematica ", "mathkernel ",
]


def allow():
    sys.exit(0)


if os.environ.get("SIDECAR_NO_HEXA_VERIFY") == "1":
    allow()

# hexa-presence gate — inert without it
if shutil.which("hexa") is None:
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
if not cmd:
    allow()

hit = next((p for p in PATTERNS if p in cmd), "")
if not hit:
    allow()

reason = (
    "wilson-hexa-verify: external verifier detected (`%s`) — verification "
    "must use the hexa CLI. Use `hexa run tool/atlas_verify.hexa "
    "[--domain D]`, `hexa run <plugin>/verify.hexa`, or `hexa <verb>`; "
    "external-verifier output cited as a verdict is forbidden. Opt out per "
    "session: SIDECAR_NO_HEXA_VERIFY=1." % hit
)
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason,
    }
}))
