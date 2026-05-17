#!/usr/bin/env python3
# wilson-dangerous-path core — standalone port of wilson's
# guard-dangerous-path. Denies Write/Edit/MultiEdit whose target path
# starts with a protected system prefix or contains a credential
# substring. Faithful prefix/substring matrix from the wilson plugin.
#
# Opt out per session: SIDECAR_NO_DANGEROUS_PATH=1
import json
import os
import sys

# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "dangerous-path" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
        sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass

PREFIXES = ("/etc/", "/usr/", "/bin/", "/sbin/", "/System/",
            "/.ssh/", "/.git/", "/.gnupg/")
SUBSTRINGS = ("/.ssh/", "/.aws/", "/.config/gh/", "/keychain",
              "/credentials")


def allow():
    sys.exit(0)


if os.environ.get("SIDECAR_NO_DANGEROUS_PATH") == "1":
    allow()

try:
    payload = json.load(sys.stdin)
except Exception:
    allow()

if payload.get("tool_name") not in ("Write", "Edit", "MultiEdit"):
    allow()
ti = payload.get("tool_input") or {}
if not isinstance(ti, dict):
    allow()
path = ti.get("file_path") or ti.get("path") or ""
if not path:
    allow()

hit = ""
for p in PREFIXES:
    if path.startswith(p):
        hit = p
        break
if not hit:
    for s in SUBSTRINGS:
        if s in path:
            hit = s
            break
if not hit:
    allow()

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": (
            "wilson-dangerous-path: `%s` targets a protected path "
            "(matched `%s` — system or credential location). Edit it "
            "by hand if you really mean to. Opt out per session: "
            "SIDECAR_NO_DANGEROUS_PATH=1." % (path, hit)
        ),
    }
}))
