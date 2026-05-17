#!/usr/bin/env python3
# wilson-secret-guard core — block live secrets before they land.
#
#   PreToolUse  (Write/Edit/MultiEdit) — deny writing a real .env file,
#     or any content carrying a high-confidence credential.
#   UserPromptSubmit — block a prompt that pastes such a credential.
#
# High-confidence patterns ONLY (specific provider token prefixes + PEM
# private-key blocks) — near-zero false positives by design. Generic
# `KEY=value` and BIP39 mnemonics are deliberately NOT matched (not
# reliably detectable without false positives).
#
# Opt out per session: SIDECAR_NO_SECRET_GUARD=1
import json
import os
import re
import sys

# sidecar control — no-op when /sidecar disabled this plugin
try:
    if "secret-guard" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8")):
        sys.exit(0)
except SystemExit:
    raise
except Exception:
    pass

if os.environ.get("SIDECAR_NO_SECRET_GUARD") == "1":
    sys.exit(0)

# name → compiled regex (high-confidence credential fingerprints)
SECRETS = {
    "AWS access key": re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
    "GitHub token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36}\b"),
    "GitHub fine-grained PAT": re.compile(r"\bgithub_pat_[A-Za-z0-9_]{60,}"),
    "GitLab PAT": re.compile(r"\bglpat-[A-Za-z0-9_-]{20,}"),
    "Anthropic API key": re.compile(r"\bsk-ant-[A-Za-z0-9_-]{24,}"),
    "OpenAI project key": re.compile(r"\bsk-proj-[A-Za-z0-9_-]{20,}"),
    "OpenAI API key": re.compile(r"\bsk-[A-Za-z0-9]{32,}\b"),
    "Slack token": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}"),
    "Google API key": re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
    "Stripe live key": re.compile(r"\bsk_live_[0-9a-zA-Z]{24,}"),
    "PEM private key": re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----"),
}
# a real .env file (NOT a template that is meant to be edited)
ENV_FILE = re.compile(r"^\.env(\.[A-Za-z0-9_-]+)?$")
ENV_OK = (".example", ".sample", ".template", ".dist", ".md")


def scan(text):
    for name, rx in SECRETS.items():
        if rx.search(text or ""):
            return name
    return None


def main():
    try:
        p = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    event = p.get("hook_event_name") or p.get("hookEventName") or ""

    if event == "UserPromptSubmit":
        hit = scan(p.get("prompt") or "")
        if hit:
            print(json.dumps({
                "decision": "block",
                "reason": ("wilson-secret-guard: your prompt contains what "
                           "looks like a live %s. Blocked before it reached "
                           "the model — remove the credential (use a "
                           "placeholder / env var) and resend. Opt out: "
                           "SIDECAR_NO_SECRET_GUARD=1." % hit),
            }))
        sys.exit(0)

    # PreToolUse — Write / Edit / MultiEdit
    if p.get("tool_name") not in ("Write", "Edit", "MultiEdit"):
        sys.exit(0)
    ti = p.get("tool_input") or {}
    if not isinstance(ti, dict):
        sys.exit(0)
    path = ti.get("file_path") or ti.get("path") or ""

    def deny(reason):
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason}}))
        sys.exit(0)

    base = os.path.basename(path)
    if ENV_FILE.match(base) and not base.endswith(ENV_OK):
        deny("wilson-secret-guard: refusing to write `%s` — a real .env "
             "file. Put committed defaults in `.env.example` instead and "
             "keep the live `.env` hand-managed. Opt out: "
             "SIDECAR_NO_SECRET_GUARD=1." % path)

    # content being written / inserted
    if p.get("tool_name") == "Write":
        content = ti.get("content") or ""
    elif p.get("tool_name") == "MultiEdit":
        content = "\n".join(str(e.get("new_string", ""))
                            for e in (ti.get("edits") or [])
                            if isinstance(e, dict))
    else:
        content = ti.get("new_string") or ""
    hit = scan(content)
    if hit:
        deny("wilson-secret-guard: the content for `%s` contains what "
             "looks like a live %s. Blocked — never commit credentials; "
             "use an env var or a secrets manager. Opt out: "
             "SIDECAR_NO_SECRET_GUARD=1." % (path, hit))
    sys.exit(0)


if __name__ == "__main__":
    main()
