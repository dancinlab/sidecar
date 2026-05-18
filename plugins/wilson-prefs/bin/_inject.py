#!/usr/bin/env python3
# wilson-prefs core — SessionStart / UserPromptSubmit hook. Reads the
# persisted prefs and injects a "## Prefs" block as additionalContext,
# faithful to wilson's prefs_build_block wording.
#
# Honest public-plugin deviation from wilson: wilson always injects its
# defaults (ko/en/friendly). sidecar injects NOTHING until the user sets a
# preference via /wilson-prefs:prefs — a marketplace plugin must not
# silently impose a reply language on every host. No prefs.json => exit 0.
import json, os, sys

# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "prefs" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
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


def data_dir():
    d = os.environ.get("CLAUDE_PLUGIN_DATA") \
        or os.path.join(os.path.expanduser("~"), ".claude",
                        "plugin-data", "wilson-prefs")
    return d


def plugin_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


dd = data_dir()
state = os.path.join(dd, "prefs.json")
try:
    with open(state, "r", encoding="utf-8") as f:
        prefs = json.load(f)
    if not isinstance(prefs, dict) or not prefs:
        sys.exit(0)
except Exception:
    sys.exit(0)  # unset → impose nothing

resp = prefs.get("response_lang")
code = prefs.get("code_lang")
style = prefs.get("response_style")

lines = ["## Prefs", ""]
if resp:
    if resp.strip().lower() == "auto":
        lines.append("- Reply in the same language the user writes their "
                      "message in.")
    else:
        lines.append("- Reply to the user in **%s**." % resp)
if code:
    if code.strip().lower() == "auto":
        lines.append("- When writing or editing code, comments, "
                      "documentation: match the language already used in "
                      "the surrounding file / project.")
    else:
        lines.append("- When writing or editing code, comments, "
                      "documentation: use **%s**." % code)
lines.append("- Technical terms and code identifiers may stay as-is "
             "regardless of reply language.")
if style:
    lines.append("- Active response style: **%s**." % style)
lines.append("")

# inline the style file body — gated so we don't bloat every prompt
# (friendly.md ≈ 5–8 KB) but also don't fade out as a long session and
# its compactions erode the original SessionStart inject:
#
#   SessionStart      — full body (the session's baseline; CC also fires
#                       this on resume / clear / post-compact reloads,
#                       distinguishable by `source` ∈ {startup, resume,
#                       clear, compact})
#   PreCompact        — full body before compaction summarises (cheap
#                       belt-and-suspenders insurance — the post-summary
#                       PostCompact below is the strictly stronger one)
#   PostCompact       — full body AFTER compaction completes — lands in
#                       the clean post-summary context (the rules are
#                       guaranteed present, not buried inside a summary)
#   UserPromptSubmit  — compact directives only, EXCEPT every Nth turn
#                       (configurable; default 25) we refresh the body
#                       so the rules stay fresh across long sessions
#
# Resolution order: a language-localized variant for the active reply
# language wins, then the canonical file; user-custom (DATA) overrides
# shipped (ROOT) at each step.
def _should_full(event, prefs, payload, dd):
    if event in ("SessionStart", "PreCompact", "PostCompact"):
        return True
    if event != "UserPromptSubmit":
        return False
    try:
        n_every = int(prefs.get("refresh_every", 25))
    except Exception:
        n_every = 25
    if n_every <= 0:
        return False
    sid = str(payload.get("session_id") or "")
    if not sid:
        return False
    turns_dir = os.path.join(dd, "turns")
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


if style and _should_full(event, prefs, payload, dd):
    body = ""
    root = plugin_root()
    cands = []
    if resp:
        cands += [os.path.join(dd, "styles", "%s.%s.md" % (style, resp)),
                  os.path.join(root, "styles", "%s.%s.md" % (style, resp))]
    cands += [os.path.join(dd, "styles", "%s.md" % style),
              os.path.join(root, "styles", "%s.md" % style)]
    for cand in cands:
        if os.path.isfile(cand):
            try:
                body = open(cand, "r", encoding="utf-8",
                            errors="replace").read().strip()
            except OSError:
                body = ""
            break
    if body:
        lines.append("### Response style — %s" % style)
        lines.append("")
        lines.append(body)
        lines.append("")

ctx = "\n".join(lines).rstrip() + "\n"
print(json.dumps({
    "hookSpecificOutput": {"hookEventName": event, "additionalContext": ctx}
}))
