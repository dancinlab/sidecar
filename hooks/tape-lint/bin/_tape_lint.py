#!/usr/bin/env python3
# tape-lint — PreToolUse(Edit|Write) deny for `.tape` edits that introduce
# `@D` governance blocks with fields other than `do` / `dont`.
#
# Fires when:
#   * tool_name in {Edit, Write}
#   * tool_input.file_path ends with `.tape`
#
# Rule:
#   `@D <name> := ... :: ...` blocks may carry only `do` / `dont` indented
#   fields. Any other field (`why` · `tool` · `note` · `ref` · `ex` · ...)
#   in a NEWLY-INTRODUCED block (or newly added to an existing block) is
#   refused. Pre-existing violations on disk are grandfathered — only the
#   set difference (proposed_findings - current_findings) blocks the edit.
#
# Opt out:
#   * SIDECAR_NO_TAPE_LINT=1
#   * ~/.claude/sidecar/disabled.json  ->  {"disabled": ["tape-lint", ...]}

import json
import os
import re
import sys

EVENT = "PreToolUse"
ALLOWED_FIELDS = {"do", "dont"}

HEADER_RE = re.compile(r"^@D\s+([A-Za-z0-9_-]+)\s*:=")
FIELD_RE = re.compile(r"^[ \t]+([A-Za-z_][A-Za-z0-9_-]*)[ \t]*=")


def allow():
    sys.exit(0)


def deny(reason):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": EVENT,
        "permissionDecision": "deny",
        "permissionDecisionReason": reason}}))
    sys.exit(0)


def disabled():
    try:
        path = os.path.join(os.path.expanduser("~"),
                            ".claude", "sidecar", "disabled.json")
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        return "tape-lint" in d.get("disabled", [])
    except Exception:
        return False


def lint(text):
    """Return list of (block_name, bad_field) pairs for `@D` blocks with
    fields outside the allow-list. Preserves source order so set-diff
    against current state lets us isolate freshly-introduced violations."""
    findings = []
    lines = text.splitlines()
    i, n = 0, len(lines)
    while i < n:
        m = HEADER_RE.match(lines[i])
        if not m:
            i += 1
            continue
        name = m.group(1)
        i += 1
        while i < n:
            line = lines[i]
            stripped = line.strip()
            if stripped == "":
                i += 1
                continue
            # Block ends on a non-indented line or another @-declaration.
            if not (line.startswith(" ") or line.startswith("\t")):
                break
            if stripped.startswith("@"):
                break
            fm = FIELD_RE.match(line)
            if fm:
                field = fm.group(1)
                if field not in ALLOWED_FIELDS:
                    findings.append((name, field))
            i += 1
    return findings


def proposed(payload):
    """(file_path, new_content) for a .tape Edit/Write, else (None, None)."""
    tool = payload.get("tool_name")
    ti = payload.get("tool_input") or {}
    if not isinstance(ti, dict):
        return None, None
    fp = ti.get("file_path") or ""
    if not fp.endswith(".tape"):
        return None, None
    if tool == "Write":
        return fp, ti.get("content", "") or ""
    if tool == "Edit":
        old = ti.get("old_string", "") or ""
        new = ti.get("new_string", "") or ""
        cur = ""
        try:
            with open(fp, encoding="utf-8") as f:
                cur = f.read()
        except Exception:
            pass
        if not old:
            return fp, cur
        if ti.get("replace_all"):
            return fp, cur.replace(old, new)
        return fp, cur.replace(old, new, 1)
    return None, None


def current(fp):
    try:
        with open(fp, encoding="utf-8") as f:
            return f.read()
    except Exception:
        return ""


def main():
    if disabled():
        allow()
    if os.environ.get("SIDECAR_NO_TAPE_LINT") == "1":
        allow()
    try:
        payload = json.load(sys.stdin)
    except Exception:
        allow()

    fp, new_text = proposed(payload)
    if fp is None:
        allow()

    cur_findings = set(lint(current(fp)))
    new_findings = lint(new_text)
    introduced = [f for f in new_findings if f not in cur_findings]
    if not introduced:
        allow()

    bullets = "\n".join(
        f"  @D {name} <- new field `{field}`" for name, field in introduced[:8]
    )
    rel = os.path.basename(fp)
    deny(
        "TAPE_LINT_BLOCK { file: %s, rule: @D blocks accept only `do` / "
        "`dont` — fold rationale/tooling/refs into the do/dont prose or "
        "drop, action: edit refused (pre-existing fields grandfathered, "
        "only newly-introduced fields block). Findings:\n%s\nOverride: "
        "SIDECAR_NO_TAPE_LINT=1 }" % (rel, bullets)
    )


if __name__ == "__main__":
    main()
