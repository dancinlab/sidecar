#!/usr/bin/env python3
# wilson-roi core — UserPromptSubmit hook.
#
# When the user types a bare ROI keyword ("roi" / "ROI" / "투자대비" /
# "roi표"), inject an additionalContext instruction containing a
# 5-column traffic-light table skeleton (등급 · id · 프로젝트 · 한 줄 ·
# 효과). The model fills it in for the prior user context this turn.
#
# Color enum (sidecar canon, from archive-nexus
# tool/rules_loader.hexa::level_to_severity):
#   🔴 = Critical · 🟡 = Important · 🟢 = OK · ⚪ = Backlog
#
# Header label appears on the first row of each color group only;
# subsequent rows in the same group leave column-1 empty — the visual
# grouping pattern from archive-nexus docs/atlas_meta_dashboard.md
# (commit ab098d20, 2026-04-22).
#
# Match: exact-after-strip+lower against TRIGGERS. So "roi for the
# new module" does NOT trigger — only a bare keyword does.
#
# Sidecar-minimal: no scoring engine, no persistence, no ranking
# algorithm; the model dispatches and fills the table.
#
# Opt out: SIDECAR_NO_ROI=1
# Toggle:  /sidecar off roi
import json
import os
import sys

if os.environ.get("SIDECAR_NO_ROI"):
    sys.exit(0)

try:
    with open(os.path.join(os.path.expanduser("~"), ".claude", "sidecar",
                           "disabled.json"), encoding="utf-8") as f:
        if "roi" in json.load(f):
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
    "roi", "roi표", "roi 표",
    "투자대비", "투자 대비",
    "재무성", "roi분석", "roi 분석",
}

prompt = (payload.get("prompt") or "").strip().lower()
if prompt not in TRIGGERS:
    sys.exit(0)

INSTRUCTION = """\
## wilson-roi — ROI table signal received

The user typed a bare ROI keyword. Respond this turn by filling the \
5-column traffic-light ROI table below for the prior user context (the \
project / decision / option set under discussion in the message immediately \
before this trigger).

Schema (exactly 5 columns, in this order):

```
| 등급         | id | 프로젝트     | 한 줄                         | 효과                              |
|--------------|----|--------------|-------------------------------|-----------------------------------|
| 🔴 Critical  | 1  | <project>    | <one-line description>        | <expected effect / payoff>        |
|              | 2  | <project>    | <one-line>                    | <effect>                          |
| 🟡 Important | 3  | <project>    | <one-line>                    | <effect>                          |
| 🟢 OK        | 4  | <project>    | <one-line>                    | <effect>                          |
| ⚪ Backlog   | 5  | <project>    | <one-line>                    | <effect>                          |
```

Rules:

1. **Color enum (fixed)**: 🔴 Critical · 🟡 Important · 🟢 OK · ⚪ Backlog. \
Use exactly these four — no other tiers. Sourced from archive-nexus \
`tool/rules_loader.hexa::level_to_severity` (cross-repo signal canon).
2. **Grouping**: rows of the same color form a contiguous group. The \
**first row** of each group fills column 1 (e.g. `🔴 Critical`); \
subsequent rows in the same group leave column 1 **empty**. This is the \
dashboard-tri visual grouping from archive-nexus \
`docs/atlas_meta_dashboard.md` (commit ab098d20, 2026-04-22) — the \
header label registers once per tier so the eye finds it fast.
3. **id**: integer, 1..N, contiguous, never reset per group.
4. **한 줄**: ≤ 60 chars, what the project / option IS.
5. **효과**: ≤ 60 chars, what improves if it lands. Prefer measurable \
phrasing (`5× ↑`, `latency -30%`, `unblocks 3 downstream`) over vague \
("better", "improved"). Use `(N/A)` or `(관망)` when no clear effect.
6. **Column count is non-negotiable** (5). Do not add 건수 / 비용 / 등 \
extra columns — keep the table compact.
7. After the table, give a one-line takeaway (which 🔴 row to act on \
first, or why it's all 🟢/⚪).

If the prior context does not contain enough material to fill a useful \
ROI table (e.g. the user just opened the session), ask one clarifying \
question instead of inventing rows.

Origin: dashboard-tri visual pattern + color enum ported from \
dancinlab/archive-nexus (`docs/atlas_meta_dashboard.md` ab098d20 + \
`tool/rules_loader.hexa::level_to_severity`). Sidecar-minimal — no \
scoring engine, no persistence; the model fills the table.
"""

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": INSTRUCTION,
    }
}))
