#!/usr/bin/env python3
# wilson-ssot core — invoked by ssot.sh so that sys.stdin is the Claude Code
# hook payload (a heredoc in the sh wrapper would otherwise steal stdin).
import json, os, sys

try:
    payload = json.load(sys.stdin)
except Exception:
    payload = {}

event = payload.get("hook_event_name") or payload.get("hookEventName") or "SessionStart"
start = payload.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()

MAX_FILES = 8
MAX_TOTAL = 24000  # char budget across collected SSOT files

collected, total, seen = [], 0, set()
d = os.path.abspath(start)
while True:
    for fname in ("AGENTS.md", "CLAUDE.md"):
        fp = os.path.join(d, fname)
        if fp in seen:
            continue
        if os.path.isfile(fp):
            seen.add(fp)
            try:
                text = open(fp, "r", encoding="utf-8", errors="replace").read()
            except OSError:
                continue
            if total + len(text) > MAX_TOTAL:
                text = text[: max(0, MAX_TOTAL - total)] + "\n…[truncated]"
            collected.append((fp, text))
            total += len(text)
            break  # AGENTS.md preferred over CLAUDE.md in the same dir
    parent = os.path.dirname(d)
    if parent == d or len(collected) >= MAX_FILES or total >= MAX_TOTAL:
        break
    d = parent

if not collected:
    sys.exit(0)  # no SSOT found — inject nothing, never fabricate

# nearest-first collected → reverse so broadest (farthest) context comes first
parts = [f"===== SSOT: {fp} =====\n{text.strip()}" for fp, text in reversed(collected)]
ctx = (
    "sidecar/wilson-ssot — AGENTS.md walk-up SSOT (nearest dir wins on conflict):\n\n"
    + "\n\n".join(parts)
)

print(json.dumps({
    "hookSpecificOutput": {"hookEventName": event, "additionalContext": ctx}
}))
