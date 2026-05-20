#!/usr/bin/env python3
# wilson-hexa-verify :: PostToolUse watcher — new verified equation → PR.
#
# When a Bash `hexa verify` / `hexa atlas promote|append-witness` run
# reports a NEW SUPPORTED result (🔵 SUPPORTED-FORMAL / 🟢 SUPPORTED-
# NUMERICAL), this ships the equation into hexa-lang's atlas — the
# zero-I/O rodata that is baked into the `hexa` binary as a built-in.
# It fills `hexa atlas promote`'s stubbed `pr` step.
#
# Behaviour: PR PROCEEDS automatically — when the hexa-lang repo has a
# concrete atlas/ change to ship, this opens a real PR (worktree off
# origin's default branch → commit the atlas change → gh pr create; the
# PR is left for human review, never auto-merged). If the autonomous
# path is not possible (no repo / no atlas diff / no gh / any error) it
# FALLS BACK to prompting the agent to drive the equivalent git+gh
# workflow by hand.
#
# hexa-lang repo: $SIDECAR_HEXA_REPO, else ~/core/hexa-lang.
# Opt out per session: SIDECAR_NO_HEXA_VERIFY=1
import json
import os
import subprocess
import sys
import time

# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "hexa-verify" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
        sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass

if os.environ.get("SIDECAR_NO_HEXA_VERIFY") == "1":
    sys.exit(0)

try:
    payload = json.load(sys.stdin)
except Exception:
    sys.exit(0)
if payload.get("tool_name") != "Bash":
    sys.exit(0)
ti = payload.get("tool_input") or {}
cmd = (ti.get("command") or "") if isinstance(ti, dict) else ""
TRIGGERS = ("hexa verify", "hexa atlas promote", "hexa atlas append-witness",
            "atlas_verify")
if not any(t in cmd for t in TRIGGERS):
    sys.exit(0)
resp = payload.get("tool_response")
out = (" ".join(str(v) for v in resp.values())
       if isinstance(resp, dict) else str(resp or ""))
if not any(s in out for s in ("🔵", "🟢", "SUPPORTED-FORMAL",
                              "SUPPORTED-NUMERICAL")):
    sys.exit(0)


def emit(ctx):
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PostToolUse", "additionalContext": ctx}}))
    sys.exit(0)


FALLBACK = (
    "wilson-hexa-verify: a `hexa verify` run reported a new SUPPORTED "
    "equation (🔵/🟢) but the PR could not be opened automatically. Drive "
    "it by hand — the equation belongs in hexa-lang's atlas (baked into "
    "the `hexa` binary as a built-in):\n"
    "  1. in the hexa-lang repo: `git checkout -b atlas-builtin/<slug> origin/<base>`\n"
    "  2. land the atlas/ change (the verified equation) + commit\n"
    "  3. `git push -u origin atlas-builtin/<slug>`\n"
    "  4. `gh pr create --base <base> --title \"feat(atlas): bake <eq>\"`\n"
    "Opt out: SIDECAR_NO_HEXA_VERIFY=1."
)


def git(repo, *a, timeout=30):
    return subprocess.run(["git", "-C", repo, *a], capture_output=True,
                          text=True, timeout=timeout)


def autonomous_pr():
    repo = os.environ.get("SIDECAR_HEXA_REPO") or os.path.join(
        os.path.expanduser("~"), "core", "hexa-lang")
    if not os.path.isdir(os.path.join(repo, ".git")):
        return None
    # concrete atlas change to ship?
    st = git(repo, "status", "--porcelain", "--", "atlas")
    files = [ln[3:] for ln in st.stdout.splitlines() if ln[3:].strip()]
    if not files:
        return None
    if subprocess.run(["sh", "-c", "command -v gh"],
                      capture_output=True).returncode != 0:
        return None
    base = (git(repo, "symbolic-ref", "--short",
                "refs/remotes/origin/HEAD").stdout.strip() or "origin/main")
    base = base.split("/")[-1]
    slug = "atlas-builtin-%d" % int(time.time())
    br = "atlas-builtin/%s" % slug
    wt = os.path.join("/tmp", "hexapr-%s" % slug)
    git(repo, "fetch", "origin", base, timeout=60)
    if git(repo, "worktree", "add", wt, "-b", br,
           "origin/%s" % base).returncode != 0:
        return None
    try:
        for rel in files:
            src = os.path.join(repo, rel)
            dst = os.path.join(wt, rel)
            if not os.path.isfile(src):
                continue
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(src, "rb") as a, open(dst, "wb") as b:
                b.write(a.read())
        git(wt, "add", "atlas")
        msg = ("feat(atlas): bake verified equation into the built-in "
               "atlas\n\nA `hexa verify` run returned a SUPPORTED verdict "
               "(\xf0\x9f\x94\xb5/\xf0\x9f\x9f\xa2). This lands the "
               "equation in the atlas SSOT — zero-I/O rodata baked into "
               "the `hexa` binary as a built-in on the next build. Fills "
               "`hexa atlas promote`'s stubbed `pr` step.\n\n"
               "Opened by sidecar/wilson-hexa-verify (PostToolUse).")
        if git(wt, "commit", "-m", msg).returncode != 0:
            return None
        if git(wt, "push", "-u", "origin", br, timeout=60).returncode != 0:
            return None
        pr = subprocess.run(
            ["gh", "pr", "create", "-R", "dancinlab/hexa-lang",
             "--base", base, "--head", br,
             "--title", "feat(atlas): bake verified equation into the "
                         "binary built-in atlas",
             "--body", "Auto-opened by sidecar/wilson-hexa-verify when "
                       "`hexa verify` returned a SUPPORTED verdict. Lands "
                       "the equation in the atlas baked into the `hexa` "
                       "binary. Left for human review — not auto-merged.\n\n"
                       "\xf0\x9f\xa4\x96 Generated with Claude Code"],
            cwd=wt, capture_output=True, text=True, timeout=60)
        url = pr.stdout.strip().splitlines()[-1] if pr.stdout.strip() else ""
        if pr.returncode != 0 or not url.startswith("http"):
            return None
        return url
    finally:
        git(repo, "worktree", "remove", wt, "--force")
        git(repo, "worktree", "prune")


try:
    url = autonomous_pr()
except Exception:
    url = None

if url:
    emit("wilson-hexa-verify: new SUPPORTED equation — **PR opened** to "
         "bake it into hexa-lang's binary built-in atlas: %s (left for "
         "human review, not auto-merged)." % url)
else:
    emit(FALLBACK)
