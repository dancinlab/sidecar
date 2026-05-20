#!/usr/bin/env python3
# wilson-list core — UserPromptSubmit hook.
#
# When the user types a bare LIST keyword ("list" / "리스트" / "다음"
# / "next" / "다음 할일"), inject an additionalContext instruction
# asking Claude to emit a SHORT ORDERED LIST (1./2./3.) of next-up
# actions for the prior user context.
#
# Differs from wilson-todo (5-col color-tier table = backlog snapshot)
# and wilson-roi (5-col table = option comparison): wilson-list is a
# simple ordered sequence — what to do FIRST, what to do SECOND, what
# to do THIRD. No color column, no tier grouping; the order itself IS
# the priority signal.
#
# Match: exact-after-strip+lower against TRIGGERS. So "list the files"
# does NOT trigger — only a bare keyword does.
#
# Sidecar-minimal: no persistence; the model emits from current
# context.
#
# Opt out: SIDECAR_NO_LIST=1
# Toggle:  /sidecar off list
import json
import os
import sys

if os.environ.get("SIDECAR_NO_LIST"):
    sys.exit(0)

try:
    with open(os.path.join(os.path.expanduser("~"), ".claude", "sidecar",
                           "disabled.json"), encoding="utf-8") as f:
        if "list" in json.load(f):
            sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass

try:
    payload = json.load(sys.stdin)
except Exception:
    sys.exit(0)

if payload.get("hook_event_name") != "UserPromptSubmit":
    sys.exit(0)

TRIGGERS = {
    "list", "리스트",
    "다음", "다음할일", "다음 할일", "다음할 일",
    "next", "next list", "nextlist",
    "up-next", "up next", "upnext",
}

prompt = (payload.get("prompt") or "").strip().lower()
if prompt not in TRIGGERS:
    sys.exit(0)

INSTRUCTION = """\
## wilson-list — next-up list signal received

The user typed a bare LIST keyword. Respond this turn by emitting a \
short ordered list of the next-up actions for the prior user context \
— what to do FIRST, what to do SECOND, what to do THIRD. The order \
itself IS the priority signal.

Format (markdown ordered list):

```
1. <verb-first action> — <one-line: why now / what unblocks>
2. <verb-first action> — <why>
3. <verb-first action> — <why>
...
```

Rules:

1. **Length**: 3-7 items. Default to 5 unless context demands fewer. \
More than 7 is a backlog, not a next-up list — use `wilson-todo` for \
that.
2. **Imperative, verb-first**: "rewrite session middleware", not \
"session middleware needs rewriting". Each item is a concrete next \
action a person could start in the next 30 minutes.
3. **One line each**: action + dash + 1-line reason. Keep ≤ 80 chars \
per line total. No nested bullets, no sub-tasks — they belong in \
`wilson-todo` rows.
4. **Order matters**: #1 is the SINGLE thing to do first. If two are \
genuinely tied, still pick one and say so in the reason \
("#1, #2 interchangeable — pick by context").
5. **No color tiers**, no priority badges. The number IS the priority. \
This is the explicit distinction from `wilson-todo` (which uses 🔴 \
🟡 🟢 ⚪ color groups) and `wilson-roi` (which uses 등급 column).
6. After the list, give a one-line takeaway (which #1 you'd start \
yourself, or whether the user should drop one before starting).

If the prior context does not contain enough material for a \
meaningful next-up list (e.g. the user just opened the session), ask \
one clarifying question instead of inventing items.

Pairs with `wilson-todo` (backlog table with color tiers) and \
`wilson-roi` (option comparison table). Use `list` when you want \
sequence; `todo` when you want grouped inventory.
"""

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": INSTRUCTION,
    }
}))
