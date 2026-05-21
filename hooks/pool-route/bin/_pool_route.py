#!/usr/bin/env python3
# pool-route — PreToolUse(Bash) suggest `pool on <host>` for host-specific
# commands. Non-blocking — never denies, only emits additionalContext.
#
# Patterns:
#   swift / xcodebuild / xcrun / pod install   →  pool on mini   (macOS)
#   nvidia-smi / nvcc                          →  pool on ubu-1 | ubu-2 (linux GPU)
#
# Skip when the command already contains `pool on `.
# Opt out: SIDECAR_NO_POOL_ROUTE=1, or list "pool-route" in ~/.claude/sidecar/disabled.json.
import json, os, re, sys

EVENT = "PreToolUse"

PATTERNS = [
    (re.compile(r"\b(swift|xcodebuild|xcrun|pod\s+install)\b"),
     "mini",
     "macOS-only command"),
    (re.compile(r"\b(nvidia-smi|nvcc)\b"),
     "ubu-1` or `ubu-2",
     "GPU/CUDA command"),
]
POOL_ON = re.compile(r"\bpool\s+on\b")


def allow():
    sys.exit(0)


def suggest(text):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": EVENT,
        "additionalContext": text,
    }}))
    sys.exit(0)


def main():
    try:
        if "pool-route" in json.load(open(os.path.join(
                os.path.expanduser("~"), ".claude", "sidecar",
                "disabled.json"), encoding="utf-8")):
            allow()
    except SystemExit:
        raise
    except Exception:
        pass

    if os.environ.get("SIDECAR_NO_POOL_ROUTE") == "1":
        allow()

    try:
        payload = json.load(sys.stdin)
    except Exception:
        allow()

    cmd = (payload.get("tool_input") or {}).get("command", "")
    if not cmd or POOL_ON.search(cmd):
        allow()

    for pat, host, label in PATTERNS:
        if pat.search(cmd):
            suggest(
                f"pool-route: {label} detected. "
                f"Consider dispatching on the appropriate host: "
                f"`pool on {host} -- <cmd>`. "
                f"Roster: `pool list`. Opt out: SIDECAR_NO_POOL_ROUTE=1."
            )
    allow()


if __name__ == "__main__":
    main()
