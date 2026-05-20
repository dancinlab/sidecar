#!/usr/bin/env python3
# wilson-frontdoor core — SessionStart / PostCompact / UserPromptSubmit
# hook. Injects the `frontdoor` operating principle (정공법 — take the
# orthodox path at a fork) as additionalContext.
#
# Pure text contributor — NO enforcement. A hook fires per tool/turn, not
# per *fork*: it cannot detect "the agent is about to take a workaround
# instead of the root-cause fix" (the same reason wilson-decision-gate is
# text-only). So this keeps the principle in context and the model
# self-applies it at the fork.
#
# Cadence (Decision 55 — the wilson-prefs / wilson-decision-gate two-tier
# pattern; a principle injected only at SessionStart fades structurally
# as the session and its compactions erode it — see memory
# feedback_style_fade_drift):
#   SessionStart (source != compact) — FULL body (session baseline)
#   PostCompact                      — FULL body (clean post-summary)
#   UserPromptSubmit, every Nth turn — FULL body refresh
#   UserPromptSubmit, off-turns      — MICRO one-liner (never a bare label)
#
# Opt out: SIDECAR_NO_FRONTDOOR=1 (sidecar) or WILSON_NO_FRONTDOOR=1
# (wilson) — both accepted. Runtime toggle: /sidecar off frontdoor.
import json
import os
import sys

if os.environ.get("SIDECAR_NO_FRONTDOOR") \
        or os.environ.get("WILSON_NO_FRONTDOOR"):
    sys.exit(0)

# sidecar control — no-op when /sidecar disabled this plugin. Shared
# state lives at a FIXED absolute path (cross-plugin coordination needs
# one well-known file; $CLAUDE_PLUGIN_DATA is per-plugin and isolated).
try:
    with open(os.path.join(os.path.expanduser("~"), ".claude", "sidecar",
                           "disabled.json"), encoding="utf-8") as f:
        if "frontdoor" in json.load(f):
            sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass

try:
    payload = json.load(sys.stdin)
except Exception:
    payload = {}
event = payload.get("hook_event_name") or payload.get("hookEventName") \
    or "SessionStart"

# SessionStart fires with source ∈ {startup, resume, clear, compact};
# the compact path overlaps PostCompact for the same compaction event.
# Skip it here so PostCompact (the strictly cleaner post-summary moment)
# owns the full-body reload alone, never doubled.
if event == "SessionStart" and payload.get("source") == "compact":
    sys.exit(0)

# Decision 3 (design.md Decision 54) — nudge + escalation ladder: the
# principle does not only say "fix the root", it says what to do when
# the root is out of reach (escalate via wilson-inbox), because the most
# common real failure is "root is upstream, so I quietly worked around
# it downstream".
FULL = """\
## frontdoor

**frontdoor** (정공법 — take the orthodox path at a fork). When you hit a \
wall and see two ways forward — a quick workaround that papers over the \
symptom *here*, vs the front-door fix at the root cause — default to the \
front-door fix. A silent workaround is debt that compounds: it hides the \
real defect, survives in the tree, and the next agent inherits a mystery.

At a fork:

1. Name the **root cause**, not just the symptom.
2. Root is in **this repo** → fix it there, even if it is more work than \
the workaround.
3. Root is in an **upstream / another SSOT repo** → do NOT silently work \
around it downstream. Escalate via `wilson-inbox`: file a structured \
handoff (note / patch / poc / rfc) in that repo so the fix lands where \
the defect is, not as scar tissue here.
4. A workaround is acceptable ONLY as an **explicitly recorded stopgap** \
— a decision-gate entry plus a TODO pointing at the root — never as the \
silent default.

Test: would the next agent, reading this diff with no other context, see \
an obvious fix — or a trap? Front-door reads obvious; a silent \
workaround reads as a trap."""

MICRO = (
    "**frontdoor** — at a wall, prefer the root-cause fix over a "
    "downstream workaround. Root in an upstream / another SSOT repo → "
    "escalate via `wilson-inbox`, don't paper over it here. A workaround "
    "is OK only as an explicitly recorded stopgap, never the silent "
    "default."
)


def _data_dir():
    return os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
        os.path.expanduser("~"), ".claude", "plugin-data",
        "wilson-frontdoor")


def _should_full():
    """FULL on SessionStart / PostCompact; on UserPromptSubmit, FULL
    every Nth turn (per-session counter), MICRO otherwise."""
    if event in ("SessionStart", "PostCompact"):
        return True
    if event != "UserPromptSubmit":
        return False
    try:
        n_every = int(os.environ.get("SIDECAR_FRONTDOOR_REFRESH", "10"))
    except Exception:
        n_every = 10
    if n_every <= 0:
        return False
    sid = str(payload.get("session_id") or "")
    if not sid:
        return False
    turns_dir = os.path.join(_data_dir(), "turns")
    try:
        os.makedirs(turns_dir, exist_ok=True)
    except Exception:
        return False
    tp = os.path.join(turns_dir, sid + ".json")
    try:
        ts = json.load(open(tp, encoding="utf-8"))
    except Exception:
        ts = {"n": 0}
    ts["n"] = ts.get("n", 0) + 1
    try:
        with open(tp, "w", encoding="utf-8") as f:
            json.dump(ts, f)
    except Exception:
        pass
    return ts["n"] > 0 and ts["n"] % n_every == 0


ctx = FULL if _should_full() else MICRO
print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": event,
        "additionalContext": ctx,
    }
}))
