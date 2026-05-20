#!/usr/bin/env python3
# wilson-todo core — UserPromptSubmit hook.
#
# When the user types a bare TODO keyword ("todo" / "TODO" / "할일" /
# "할 일"), inject an additionalContext instruction containing a
# 5-column traffic-light table skeleton (우선 · id · 카테고리 · 설명 ·
# 효과). The model surfaces pending work from the prior user context
# and fills the table this turn.
#
# Color enum (sidecar canon, from archive-nexus
# tool/rules_loader.hexa::level_to_severity):
#   🔴 = Critical · 🟡 = Important · 🟢 = OK · ⚪ = Backlog
#
# Header label appears on the first row of each color group only;
# subsequent rows in the same group leave column-1 empty — the
# dashboard-tri visual grouping from archive-nexus
# docs/atlas_meta_dashboard.md (commit ab098d20, 2026-04-22).
#
# Match: exact-after-strip+lower against TRIGGERS. So "todo for the
# next sprint" does NOT trigger — only a bare keyword does.
#
# Sidecar-minimal: no codebase scanner, no persistence, no auto
# detection; the model surfaces and fills the table from context.
# Pairs with wilson-roi (same 5-col schema, different headers) and
# wilson-list (next-up ordered sequence, no color).
#
# Opt out: SIDECAR_NO_TODO=1
# Toggle:  /sidecar off todo
import json
import os
import sys

if os.environ.get("SIDECAR_NO_TODO"):
    sys.exit(0)

try:
    with open(os.path.join(os.path.expanduser("~"), ".claude", "sidecar",
                           "disabled.json"), encoding="utf-8") as f:
        if "todo" in json.load(f):
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
    "todo", "todos",
    "할일", "할 일",
    "todo표", "todo 표",
    "백로그", "backlog",
}

prompt = (payload.get("prompt") or "").strip().lower()
if prompt not in TRIGGERS:
    sys.exit(0)

INSTRUCTION = """\
## wilson-todo — TODO table signal received

The user typed a bare TODO keyword. Respond this turn by surfacing the \
pending work items from the prior user context (current session work, \
unresolved issues, deferred items) into the 5-column traffic-light \
table below.

Schema (exactly 5 columns, in this order):

```
| 우선         | id | 카테고리   | 설명                          | 효과                                |
|--------------|----|------------|-------------------------------|-------------------------------------|
| 🔴 Critical  | 1  | <category> | <one-line: what to do>        | <expected effect when done>         |
|              | 2  | <category> | <one-line>                    | <effect>                            |
| 🟡 Important | 3  | <category> | <one-line>                    | <effect>                            |
| 🟢 OK        | 4  | <category> | <one-line>                    | <effect>                            |
| ⚪ Backlog   | 5  | <category> | <one-line>                    | <effect>                            |
```

Rules:

1. **Color enum (fixed)**: 🔴 Critical · 🟡 Important · 🟢 OK · ⚪ Backlog. \
Use exactly these four. From archive-nexus \
`tool/rules_loader.hexa::level_to_severity` (cross-repo signal canon).
2. **Grouping**: rows of the same color form a contiguous group. The \
**first row** of each group fills column 1 (e.g. `🔴 Critical`); \
subsequent rows in the same group leave column 1 **empty**. \
Dashboard-tri visual grouping from archive-nexus \
`docs/atlas_meta_dashboard.md` (commit ab098d20, 2026-04-22).
3. **id**: integer, 1..N, contiguous, never reset per group.
4. **카테고리**: short noun phrase (`auth` / `docs` / `tests` / `infra` \
/ `goal.md` / etc.) — what kind of work.
5. **설명**: ≤ 60 chars, what to DO (imperative). Verb-first if possible \
("rewrite session middleware", not "session middleware needs rewriting").
6. **효과**: ≤ 60 chars, what improves once done. Prefer measurable \
("unblocks 3 downstream", "test flake → 0", "API surface -200 LOC") \
over vague. Use `(N/A)` or `(유지)` when no clear effect.
7. **Column count is non-negotiable** (5). Do not add 건수 / 담당 / \
due / etc. extra columns — keep the table compact.
8. After the table, give a one-line takeaway (which 🔴 row to start \
on, or whether the user should clear 🟡 first).

If the prior context does not contain enough material to populate a \
meaningful TODO table (e.g. the user just opened the session), ask \
one clarifying question instead of inventing rows.

Pairs with `wilson-roi` (same 5-col schema, "등급/프로젝트" headers) \
and `wilson-list` (next-up ordered sequence, no color column).

Origin: dashboard-tri visual pattern + color enum ported from \
dancinlab/archive-nexus (`docs/atlas_meta_dashboard.md` ab098d20 + \
`tool/rules_loader.hexa::level_to_severity`). Sidecar-minimal — no \
codebase scanner, no persistence; the model surfaces from context.
"""

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": INSTRUCTION,
    }
}))
