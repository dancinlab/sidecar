#!/usr/bin/env python3
# hexa-native — PreToolUse(Write|Edit|NotebookEdit) hard block.
#
# If the target file path's enclosing project (any ancestor dir containing
# `project.tape`) exists AND the target ends in `.py` or `.sh`, deny the
# write with a fixed message redirecting the operator to `.hexa`.
#
# DESIGN NOTE — explicitly no opt-out: no env-var bypass (e.g. no
# BYPASS_HEXA_LANG), no ~/.claude/sidecar/disabled.json honoring, no
# per-project exception list. By user directive 2026-05-22: enforcement
# stands or the hook is uninstalled, nothing in between. Don't add an
# escape hatch; remove the plugin if you need a way out.

import json
import os
import sys

EVENT = "PreToolUse"
MARKER = "project.tape"
TARGETED_EXTS = (".py", ".sh")
TARGETED_TOOLS = ("Write", "Edit", "NotebookEdit")


def allow():
    sys.exit(0)


def deny(reason):
    out = {
        "hookSpecificOutput": {
            "hookEventName": EVENT,
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }
    print(json.dumps(out))
    sys.exit(0)


def find_hexa_root(target):
    """Walk up parent dirs from target; return the dir containing project.hexa, or None."""
    if not target:
        return None
    cur = os.path.abspath(target)
    if not os.path.isdir(cur):
        cur = os.path.dirname(cur)
    home = os.path.expanduser("~")
    while cur and cur != "/" and cur != home:
        if os.path.isfile(os.path.join(cur, MARKER)):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            break
        cur = parent
    return None


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        allow()

    if payload.get("tool_name") not in TARGETED_TOOLS:
        allow()

    tin = payload.get("tool_input") or {}
    # Write / Edit use `file_path`; NotebookEdit uses `notebook_path`.
    target = tin.get("file_path") or tin.get("notebook_path") or ""
    if not target:
        allow()

    if not target.lower().endswith(TARGETED_EXTS):
        allow()

    root = find_hexa_root(target)
    if not root:
        allow()

    ext = os.path.splitext(target)[1].lstrip(".") or "?"
    rel = os.path.relpath(target, root)
    reason = (
        f"hexa-native: this project ({os.path.basename(root)}) is hexa-native "
        f"— `project.tape` marker found at the project root.\n"
        f"  Refusing to write `{rel}` (.{ext}).\n"
        f"  `.py` / `.sh` are already supported as ai-native (English) "
        f"in other environments — this project intentionally only accepts "
        f"`.hexa` source.\n"
        f"  Write your logic in `.hexa` instead. There is no env-var / "
        f"flag override by design."
    )
    deny(reason)


if __name__ == "__main__":
    main()
