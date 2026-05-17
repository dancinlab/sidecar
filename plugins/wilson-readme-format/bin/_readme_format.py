#!/usr/bin/env python3
# wilson-readme-format core — standalone port of wilson's guard-readme-format
# plugin (no wilson binary dependency). Invoked by readme-format.sh so that
# sys.stdin is the Claude Code PreToolUse payload.
#
# Denies Write/Edit/MultiEdit on a REPO-ROOT README.md violating the four
# readme-format anti-patterns (faithful to wilson principle #16):
#   L4 forbidden `#### ` heading            (push deeper docs into docs/)
#   L2 multi-glyph H1   (>=2 SMP-emoji prefix glyphs in the first `# ` line)
#   L1 emoji-in-prose   (SMP emoji in a body paragraph line)
#   L3 At-a-glance fence non-English        (write only — needs full doc)
# Lint order matches wilson: L4 -> L2 -> L1 -> L3.
#
# Opt out per session: SIDECAR_NO_README_FORMAT_GUARD=1
#                       (also honors WILSON_NO_README_FORMAT_GUARD=1)
import json, os, sys

EVENT = "PreToolUse"


def allow():
    sys.exit(0)  # no output = allow


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": EVENT,
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


if os.environ.get("SIDECAR_NO_README_FORMAT_GUARD") == "1" \
        or os.environ.get("WILSON_NO_README_FORMAT_GUARD") == "1":
    allow()

try:
    payload = json.load(sys.stdin)
except Exception:
    allow()

tool = payload.get("tool_name") or ""
ti = payload.get("tool_input") or {}
if not isinstance(ti, dict):
    allow()

path = ti.get("file_path") or ti.get("path") or ""


# ── path scoping: repo-root README.md only ──────────────────────────
def path_is_root_readme(p):
    if not p or os.path.basename(p) != "README.md":
        return False
    excluded = ("/docs/", "/examples/", "/templates/", "/sample",
                "/scratch/", "/.git/", "/test/", "/tests/", "/archive/",
                "/old/", "/vendor/", "/third_party/", "/node_modules/",
                "/.venv/")
    return not any(s in p for s in excluded)


if not path_is_root_readme(path):
    allow()

# ── content slice (write = full file; edit = inserted new_string) ───
is_write = tool == "Write"
if is_write:
    content = ti.get("content") or ""
elif tool == "MultiEdit":
    content = "\n".join(
        str(e.get("new_string", "")) for e in (ti.get("edits") or [])
        if isinstance(e, dict)
    )
else:  # Edit
    content = ti.get("new_string") or ""
if not content:
    allow()


# ── emoji / script helpers ──────────────────────────────────────────
def count_smp_emoji(s):
    # wilson counts the UTF-8 prefix 0xF0 0x9F == codepoints U+1F000..U+1FFFF
    return sum(1 for c in s if 0x1F000 <= ord(c) <= 0x1FFFF)


def has_script_chars(s):
    # wilson allows U+0080..U+2FFF (Latin ext, punctuation, arrows, box,
    # geometric ⚙ ⏺). Flags U+3000+ (CJK punct/Hiragana/Katakana/CJK
    # ideographs/Hangul) and U+10000+ (SMP). Threshold: ord >= 0x3000.
    return any(ord(c) >= 0x3000 for c in s)


def clip(s, n):
    return s if len(s) <= n else s[:n] + "…"


lines = content.split("\n")


# ── L4: forbidden #### heading ──────────────────────────────────────
def lint_l4():
    for i, raw in enumerate(lines):
        if raw.strip().startswith("#### "):
            return ("L4 forbidden `####` heading on line %d — push deeper "
                    "docs into `docs/`" % (i + 1))
    return ""


# ── L2: multi-glyph H1 ──────────────────────────────────────────────
def lint_l2():
    for i, raw in enumerate(lines):
        t = raw.strip()
        if t.startswith("# ") and not t.startswith("## "):
            rest = t[2:]
            sp = rest.find(" ")
            prefix = rest if sp < 0 else rest[:sp]
            n = count_smp_emoji(prefix)
            if n > 1:
                return ("L2 multi-glyph H1 on line %d — `%s` has %d emoji "
                        "prefix glyphs; one Unicode glyph (or pure ASCII) "
                        "only" % (i + 1, clip(t, 60), n))
            return ""  # first H1 found and passed
    return ""


# ── L1: emoji-in-prose ──────────────────────────────────────────────
def lint_l1():
    in_fence = False
    for i, raw in enumerate(lines):
        t = raw.strip()
        if t.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence or t == "":
            continue
        if t.startswith("# ") and not t.startswith("## "):
            continue                       # first H1 — one glyph allowed
        if t.startswith("#"):
            continue                       # other headings
        if t.startswith("[![") or t.startswith("<") \
                or t.startswith("> [!") or t == "---":
            continue                       # badges / HTML chrome / callouts
        if count_smp_emoji(raw) > 0:
            return ("L1 emoji-in-prose on line %d — `%s` (emojis belong in "
                    "badges and the H1 glyph; never in body paragraphs)"
                    % (i + 1, clip(raw, 60)))
    return ""


# ── L3: At-a-glance fence non-English (write only) ──────────────────
def lint_l3():
    in_section = False
    in_fence = False
    for i, raw in enumerate(lines):
        t = raw.strip()
        if not in_section:
            if t.startswith("## At a glance"):
                in_section = True
            continue
        if t.startswith("## "):
            return ""                      # section ended, no fence
        if t.startswith("```"):
            if in_fence:
                return ""                  # fence closed clean
            in_fence = True
            continue
        if in_fence and has_script_chars(raw):
            return ("L3 At-a-glance fence non-English on line %d — `%s` (the "
                    "eye-catcher block MUST be English-only; CJK content "
                    "goes in the per-row prose below)"
                    % (i + 1, clip(raw, 60)))
    return ""


violation = lint_l4() or lint_l2() or lint_l1()
if not violation and is_write:
    violation = lint_l3()

if violation:
    deny("wilson-readme-format: `%s` violates readme-format — %s. "
         "Opt out per session: SIDECAR_NO_README_FORMAT_GUARD=1." %
         (path, violation))
allow()
