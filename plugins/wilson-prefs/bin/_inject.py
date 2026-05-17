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
    lines.append("- Reply to the user in **%s**." % resp)
if code:
    lines.append("- When writing or editing code, comments, documentation: "
                  "use **%s**." % code)
lines.append("- Technical terms and code identifiers may stay as-is "
             "regardless of reply language.")
if style:
    lines.append("- Active response style: **%s**." % style)
lines.append("")

# inline the style file body. Resolution order: a language-localized
# variant for the active reply language wins, then the canonical file;
# user-custom (DATA) overrides shipped (ROOT) at each step.
if style:
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
