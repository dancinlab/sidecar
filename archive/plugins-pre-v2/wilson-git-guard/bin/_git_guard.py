#!/usr/bin/env python3
# wilson-git-guard core — standalone port of wilson's git-guard. Denies a
# force-push at the PreToolUse layer: a Bash `git push` carrying any of
#   --force            long flag
#   -f                 short flag (token-isolated — won't match --format)
#   +<refspec>         force refspec, e.g. `git push origin +main`
#   --force-with-lease the safer form — blocked by default; allow with
#                      SIDECAR_ALLOW_FORCE_WITH_LEASE=1
# Opt out entirely: SIDECAR_NO_GIT_GUARD=1
import json
import os
import re
import shlex
import sys

# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "git-guard" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
        sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass


def allow():
    sys.exit(0)


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


if os.environ.get("SIDECAR_NO_GIT_GUARD") == "1":
    allow()

try:
    payload = json.load(sys.stdin)
except Exception:
    allow()
if payload.get("tool_name") != "Bash":
    allow()
ti = payload.get("tool_input") or {}
cmd = (ti.get("command") or "") if isinstance(ti, dict) else ""
if "push" not in cmd or "git" not in cmd:
    allow()

allow_lease = os.environ.get("SIDECAR_ALLOW_FORCE_WITH_LEASE") == "1"

# split on shell separators → inspect each simple command for `git push`
for seg in re.split(r"&&|\|\||[;|\n]", cmd):
    try:
        toks = shlex.split(seg)
    except ValueError:
        toks = seg.split()
    # locate `git [-c ...] push`
    gi = -1
    for i, t in enumerate(toks):
        if t == "git":
            gi = i
            break
    if gi < 0:
        continue
    rest = toks[gi + 1:]
    # skip global `-c key=val` / `-C dir` options before the subcommand
    j = 0
    while j < len(rest) and rest[j].startswith("-"):
        j += 2 if rest[j] in ("-c", "-C") else 1
    if j >= len(rest) or rest[j] != "push":
        continue
    args = rest[j + 1:]
    for a in args:
        if a == "--force" or a == "-f":
            deny("wilson-git-guard: force-push blocked — `%s` carries "
                 "`%s`. Force-push rewrites published history; do it by "
                 "hand if you truly intend to. Opt out: "
                 "SIDECAR_NO_GIT_GUARD=1." % (seg.strip(), a))
        if a == "--force-with-lease" or a.startswith("--force-with-lease="):
            if allow_lease:
                continue
            deny("wilson-git-guard: `--force-with-lease` blocked by "
                 "default (still rewrites history). Allow it with "
                 "SIDECAR_ALLOW_FORCE_WITH_LEASE=1, or opt out entirely "
                 "with SIDECAR_NO_GIT_GUARD=1.")
        if a.startswith("+") and len(a) > 1 and a[1] not in ("-",):
            deny("wilson-git-guard: force refspec `%s` blocked — a "
                 "leading `+` on a push refspec force-updates the remote "
                 "branch. Opt out: SIDECAR_NO_GIT_GUARD=1." % a)
allow()
