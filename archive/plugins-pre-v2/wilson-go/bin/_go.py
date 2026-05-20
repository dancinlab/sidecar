#!/usr/bin/env python3
# wilson-go core — UserPromptSubmit hook.
#
# When the user types a bare AN10 fan-out keyword ("go" / "loop" /
# "병렬" / ...), inject an additionalContext instruction telling Claude
# to dispatch multiple `Agent` tool calls in a SINGLE message, each
# with run_in_background=true, treating the prior user request as the
# fan-out task.
#
# Origin: minimal port of dancinlab/archive-nexus rule AN10
# (rules/anima.json, added 2026-04-16) + tool/parallel_dispatch_guard
# .hexa. Sidecar-minimal — no agent-ledger, no DAG scheduler, no
# shadow comparator; just trigger detection + instruction injection.
# The model dispatches; the hook only nudges (same posture as
# wilson-frontdoor / wilson-decision-gate: a hook fires per turn, not
# per fork, so it cannot enforce parallel dispatch — only signal it).
#
# Match: exact-after-strip+lower against TRIGGERS. So "go to file X"
# does NOT trigger — only a bare keyword does. False positives are the
# main risk and a bare keyword is rare enough in normal chat to be a
# clean signal.
#
# Opt out: SIDECAR_NO_GO=1
# Toggle:  /sidecar off go
import json
import os
import sys

if os.environ.get("SIDECAR_NO_GO"):
    sys.exit(0)

# sidecar control — no-op when /sidecar disabled this plugin.
try:
    with open(os.path.join(os.path.expanduser("~"), ".claude", "sidecar",
                           "disabled.json"), encoding="utf-8") as f:
        if "go" in json.load(f):
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

# AN10 trigger set, from archive-nexus rules/anima.json::trigger_keywords
# + KR/shortcut additions (ㄱㄱ / 가자 / 가즈아 / 루프 / gogo / "keep
# going"). Exact-match after strip+lower against the full prompt.
TRIGGERS = {
    "go", "gogo", "ㄱㄱ", "가자", "가즈아",
    "keep", "keep going",
    "loop", "루프",
    "병렬", "동시", "백그라운드",
}

prompt = (payload.get("prompt") or "").strip().lower()
if prompt not in TRIGGERS:
    sys.exit(0)

INSTRUCTION = """\
## wilson-go — fan-out signal received

The user typed a bare AN10 fan-out keyword. Treat the prior user \
request (the message immediately before this trigger) as the fan-out \
task. Respond this turn by issuing multiple `Agent` tool calls in a \
SINGLE message, each with `run_in_background=true`.

Procedure:

1. Re-read the prior user request from your context.
2. Identify 2+ independent angles of attack — different specialty, \
different scope, or different approach.
3. In ONE message, call `Agent` once per angle, all with \
`run_in_background=true`.
4. Default subagent_type mapping:
   - exploration / search / "where is X" → `Explore`
   - planning / design / multi-step strategy → `Plan`
   - general implementation / investigation → `general-purpose`
   - Claude Code / SDK / Anthropic API questions → `claude-code-guide`
5. Give a one-line summary of which agents you launched, then stop \
the turn. Background completions notify you separately — do not block \
on them.

Anti-pattern (forbidden): launch one Agent, wait for its result, \
launch the next. That is sequential dispatch — exactly what AN10 \
prohibits. Independent work goes in a single message with parallel \
tool blocks.

Origin: ported from dancinlab/archive-nexus rule AN10 \
(rules/anima.json, added 2026-04-16) + tool/parallel_dispatch_guard\
.hexa.
"""

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": INSTRUCTION,
    }
}))
