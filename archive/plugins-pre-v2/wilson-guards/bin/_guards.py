#!/usr/bin/env python3
# wilson-guards core — three dancinlab-workflow guards in one bundle,
# standalone ports of wilson's governance + guard-* predicates.
#
#   ssot-lock         — deny a Write/Edit to a file matched by an
#                       `ssot-lock:` bullet in the nearest AGENTS.md
#                       `## Governance` section.
#   tape-append-only  — a `.log.tape` file is append-only event history
#                       (tape v1.2 architecture-vs-history split): deny an
#                       Edit that rewrites it / a Write that overwrites it.
#                       A plain `.tape` is EDITABLE architecture → inert.
#   domain-lint       — a root-level UPPERCASE.md topic roadmap must be
#                       `Head + --- + ## Log`; deny a Write that is not.
#
# Every guard is INERT unless its convention is actually present — no
# `ssot-lock:` bullet / no `.log.tape` file / no domain roadmap → zero
# behaviour. dancinlab-workflow specific; toggle off: /sidecar off guards.
#
# Opt out per session: SIDECAR_NO_GUARDS=1
import fnmatch
import json
import os
import re
import sys

# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "guards" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
        sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass

if os.environ.get("SIDECAR_NO_GUARDS") == "1":
    sys.exit(0)

# community-health filenames that are NOT dancinlab topic roadmaps
COMMUNITY = {
    "README", "CHANGELOG", "CHANGES", "SECURITY", "CONTRIBUTING",
    "CODE_OF_CONDUCT", "LICENSE", "LICENCE", "COPYING", "NOTICE",
    "AUTHORS", "SUPPORT", "GOVERNANCE", "MAINTAINERS", "CODEOWNERS",
    "INSTALL", "HISTORY", "TODO", "CITATION", "FUNDING", "HANDOFF",
}
# a root topic-roadmap filename: all-caps, `+` allowed for meta-domains
DOMAIN_RE = re.compile(r"^[A-Z][A-Z0-9]*(?:\+[A-Z][A-Z0-9]*)*\.md$")


def deny(reason):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": (
            "wilson-guards: %s Opt out: SIDECAR_NO_GUARDS=1." % reason)}}))
    sys.exit(0)


def find_agents_md(start_dir):
    """Walk up from start_dir; return path of the nearest AGENTS.md."""
    d = os.path.abspath(start_dir)
    while True:
        cand = os.path.join(d, "AGENTS.md")
        if os.path.isfile(cand):
            return cand
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def ssot_patterns(agents_path):
    """Parse `ssot-lock:` bullets from the AGENTS.md ## Governance block."""
    try:
        with open(agents_path, encoding="utf-8") as f:
            lines = f.read().splitlines()
    except Exception:
        return []
    pats, in_gov = [], False
    for ln in lines:
        h = re.match(r"^(#{1,6})\s+(.*)", ln)
        if h:
            in_gov = "governance" in h.group(2).strip().lower()
            continue
        if in_gov:
            m = re.match(r"^\s*[-*]\s*ssot-lock:\s*(.+?)\s*$", ln)
            if m:
                pats.append(m.group(1).strip().strip("`"))
    return pats


def guard_ssot(tool, ti, path):
    if not path:
        return
    agents = find_agents_md(os.path.dirname(os.path.abspath(path)))
    if not agents:
        return                                   # no convention → inert
    pats = ssot_patterns(agents)
    if not pats:
        return
    root = os.path.dirname(agents)
    rel = os.path.relpath(os.path.abspath(path), root)
    base = os.path.basename(path)
    for p in pats:
        if (fnmatch.fnmatch(rel, p) or fnmatch.fnmatch(base, p)
                or fnmatch.fnmatch(os.path.abspath(path), p)):
            deny("`%s` is SSOT-locked by `ssot-lock: %s` in %s — edit the "
                 "single source of truth, not this projection / copy."
                 % (rel, p, os.path.relpath(agents, root)))


def guard_tape(tool, ti, path):
    # tape v1.2 architecture-vs-history split (governance `g_arch_vs_log_split`,
    # tape spec §"Architecture-vs-history split"): a plain `<NAME>.tape` is
    # EDITABLE architecture — declarative entries evolve, latest-wins per id.
    # The append-only event history lives in the `<NAME>.log.tape` sibling.
    # So the guard locks `.log.tape` files and is INERT for an editable
    # `.tape` — a blanket whole-`.tape` lock contradicts the v1.2 governance.
    if not path or not path.endswith(".log.tape"):
        return                                   # editable / not history → inert
    if tool == "Write":
        if os.path.isfile(path):
            deny("`%s` is a `.log.tape` event history — append-only. A full "
                 "Write would overwrite recorded history; append a new "
                 "event at the bottom instead." % os.path.basename(path))
        return                                   # new .log.tape → allow
    edits = ti.get("edits") if tool == "MultiEdit" else [ti]
    for e in (edits or []):
        if not isinstance(e, dict):
            continue
        old = e.get("old_string") or ""
        new = e.get("new_string") or ""
        if old and not new.startswith(old):
            deny("`%s` is a `.log.tape` event history — append-only. This "
                 "edit rewrites existing content rather than appending a new "
                 "event at the bottom. (A plain `.tape` is editable v1.2 "
                 "architecture — only the `.log.tape` sibling is locked.)"
                 % os.path.basename(path))


def guard_domain(tool, ti, path):
    if tool != "Write" or not path:
        return                          # only a full Write is checkable
    base = os.path.basename(path)
    if not DOMAIN_RE.match(base):
        return
    if base[:-3].split("+")[0] in COMMUNITY:
        return                                   # community file → inert
    parent = os.path.dirname(os.path.abspath(path))
    if not os.path.exists(os.path.join(parent, ".git")):
        return                          # not a repo root → not a roadmap
    content = ti.get("content") or ""
    has_hr = re.search(r"^---\s*$", content, re.M) is not None
    has_log = re.search(r"^#{1,6}\s+Log\s*$", content, re.M) is not None
    if not (has_hr and has_log):
        miss = " and ".join(
            x for x, ok in (("a `---` separator", has_hr),
                             ("a `## Log` section", has_log)) if not ok)
        deny("`%s` is a root topic roadmap — the domain-meta-domain "
             "convention requires `Head + --- + ## Log` (append log at "
             "the bottom, chronological). Missing: %s." % (base, miss))


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    tool = payload.get("tool_name")
    if tool not in ("Write", "Edit", "MultiEdit"):
        sys.exit(0)
    ti = payload.get("tool_input") or {}
    if not isinstance(ti, dict):
        sys.exit(0)
    path = ti.get("file_path") or ti.get("path") or ""

    guard_ssot(tool, ti, path)
    guard_tape(tool, ti, path)
    guard_domain(tool, ti, path)
    sys.exit(0)


if __name__ == "__main__":
    main()
