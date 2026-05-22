#!/usr/bin/env python3
# tape-lint — PreToolUse(Edit|Write) lint for `.tape` files.
#
# Checks (all `.tape`):
#   * fields rule: `@D` blocks accept only `do` / `dont` fields. Any other
#     field (`why` · `tool` · `note` · `ref` · `ex` · ...) newly introduced
#     is refused.
#
# Checks (commons.tape, project.tape only):
#   * length cap: `do` / `dont` value content (between the quotes) longer
#     than VALUE_CAP characters is refused — minimal phrasing required;
#     split overflow into multiple do/dont entries or distinct @D blocks.
#   * authoring-language: lines containing scripts outside what the
#     `sidecar prefs` `code` axis allows are refused (currently enforced
#     when code=english — non-Latin scripts blocked). Read at run-time
#     from prefs storage, so `/prefs code <lang>` reshapes the rule.
#
# Diff-aware on every check: a finding present on disk is grandfathered;
# only newly introduced or worsened items block.
#
# Opt out:
#   * SIDECAR_NO_TAPE_LINT=1
#   * ~/.claude/sidecar/disabled.json  ->  {"disabled": ["tape-lint", ...]}

import json
import os
import re
import sys

EVENT = "PreToolUse"
ALLOWED_FIELDS = {"do", "dont"}
LENGTH_FILES = {"commons.tape", "project.tape"}
VALUE_CAP = 100

HEADER_RE = re.compile(r"^@D\s+([A-Za-z0-9_-]+)\s*:=")
FIELD_RE = re.compile(r"^[ \t]+([A-Za-z_][A-Za-z0-9_-]*)[ \t]*=")
VALUE_RE = re.compile(r'^[ \t]+[A-Za-z_][A-Za-z0-9_-]*[ \t]*=[ \t]*"(.*)"[ \t]*$')

# Hangul · Hiragana · Katakana · CJK Unified ranges.
NON_LATIN_RE = re.compile(
    r"[ᄀ-ᇿ぀-ヿ㄰-㆏一-鿿가-힯]"
)

PREFS_PATH = os.path.join(
    os.path.expanduser("~"),
    ".claude", "plugins", "data", "prefs-sidecar", "prefs.json"
)


def allow():
    sys.exit(0)


def deny(reason):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": EVENT,
        "permissionDecision": "deny",
        "permissionDecisionReason": reason}}))
    sys.exit(0)


def disabled():
    try:
        path = os.path.join(os.path.expanduser("~"),
                            ".claude", "sidecar", "disabled.json")
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
        return "tape-lint" in d.get("disabled", [])
    except Exception:
        return False


def prefs_code():
    try:
        with open(PREFS_PATH, encoding="utf-8") as f:
            return json.load(f).get("code", "english")
    except Exception:
        return "english"


def parse_blocks(text):
    """Yield (block_name, field_type, value_len). value_len is the length of
    the quoted value content for do/dont (-1 if the line shape is not the
    canonical `key = "value"`), None for any other field type."""
    cur = None
    for line in text.splitlines():
        m = HEADER_RE.match(line)
        if m:
            cur = m.group(1)
            continue
        if cur is None:
            continue
        stripped = line.strip()
        if stripped == "":
            continue
        if not (line.startswith(" ") or line.startswith("\t")):
            cur = None
            continue
        if stripped.startswith("@"):
            cur = None
            continue
        fm = FIELD_RE.match(line)
        if not fm:
            continue
        field = fm.group(1)
        if field in ALLOWED_FIELDS:
            vm = VALUE_RE.match(line)
            yield (cur, field, len(vm.group(1)) if vm else -1)
        else:
            yield (cur, field, None)


def field_violations(text):
    return {(b, f) for b, f, n in parse_blocks(text)
            if f not in ALLOWED_FIELDS}


def length_map(text):
    out = {}
    for b, f, n in parse_blocks(text):
        if f in ALLOWED_FIELDS and n is not None and n >= 0:
            out[(b, f)] = n
    return out


def non_latin_lines(text):
    return {line.rstrip() for line in text.splitlines()
            if NON_LATIN_RE.search(line)}


def current(fp):
    try:
        with open(fp, encoding="utf-8") as f:
            return f.read()
    except Exception:
        return ""


def proposed(payload):
    tool = payload.get("tool_name")
    ti = payload.get("tool_input") or {}
    if not isinstance(ti, dict):
        return None, None
    fp = ti.get("file_path") or ""
    if not fp.endswith(".tape"):
        return None, None
    if tool == "Write":
        return fp, ti.get("content", "") or ""
    if tool == "Edit":
        old = ti.get("old_string", "") or ""
        new = ti.get("new_string", "") or ""
        cur = current(fp)
        if not old:
            return fp, cur
        if ti.get("replace_all"):
            return fp, cur.replace(old, new)
        return fp, cur.replace(old, new, 1)
    return None, None


def main():
    if disabled():
        allow()
    if os.environ.get("SIDECAR_NO_TAPE_LINT") == "1":
        allow()
    try:
        payload = json.load(sys.stdin)
    except Exception:
        allow()

    fp, new_text = proposed(payload)
    if fp is None:
        allow()
    cur_text = current(fp)
    base = os.path.basename(fp)
    in_scope = base in LENGTH_FILES

    new_fields = sorted(field_violations(new_text) - field_violations(cur_text))

    length_findings = []
    if in_scope:
        prop = length_map(new_text)
        curr = length_map(cur_text)
        for key, plen in prop.items():
            if plen <= VALUE_CAP:
                continue
            clen = curr.get(key, 0)
            if plen <= clen:
                continue
            length_findings.append((key, plen, clen))

    lang_findings = []
    code_lang = prefs_code() if in_scope else None
    if in_scope and code_lang == "english":
        new_lang = non_latin_lines(new_text) - non_latin_lines(cur_text)
        lang_findings = sorted(new_lang)

    if not new_fields and not length_findings and not lang_findings:
        allow()

    sections = []
    if new_fields:
        bullets = "\n".join(
            "    @D {} <- new field `{}`".format(n, f)
            for n, f in new_fields[:8]
        )
        sections.append(
            "fields rule (@D blocks accept only `do` / `dont` — fold "
            "rationale/tooling/refs into prose or drop):\n" + bullets
        )
    if length_findings:
        bullets = "\n".join(
            "    @D {} {}: {} chars > {} cap{}".format(
                n, f, plen, VALUE_CAP,
                " (was {})".format(clen) if clen else "")
            for (n, f), plen, clen in length_findings[:8]
        )
        sections.append(
            "length cap (do/dont value > {} chars in commons.tape / "
            "project.tape — keep each line minimal; split overflow into "
            "multiple do/dont entries or distinct @D blocks):\n{}".format(
                VALUE_CAP, bullets)
        )
    if lang_findings:
        bullets = "\n".join(
            "    {}".format(line[:120]) for line in lang_findings[:6]
        )
        sections.append(
            "authoring language (prefs.code = {} — non-Latin script on a "
            "new line; switch to the configured authoring language or run "
            "`/prefs code <lang>` to update the pref):\n{}".format(
                code_lang, bullets)
        )
    deny(
        "TAPE_LINT_BLOCK { file: " + base + ", "
        "rule: see findings, action: edit refused (pre-existing violations "
        "grandfathered, only newly-introduced or worsened items block). "
        "Findings:\n\n" + "\n\n".join(sections) +
        "\n\nOverride: SIDECAR_NO_TAPE_LINT=1 }"
    )


if __name__ == "__main__":
    main()
