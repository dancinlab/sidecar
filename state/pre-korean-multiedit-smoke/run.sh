#!/usr/bin/env bash
# Smoke: INJECT-NON-ENGLISH (english-only CLAUDE.md/commons.md SAVE-time guard) must cover
# the MultiEdit tool shape ({file_path, edits:[{old_string,new_string},…]}) — its Korean prose
# used to slip through because parseToolInput yielded no content (bug: CLAUDE.md-Korean-via-MultiEdit).
# Runs against the sidecar binary in this worktree/repo. Exit 0 only if every case behaves.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SIDE="$(cd "$HERE/../.." && pwd)/bin/sidecar"
fail=0

deny() { # payload label — expect a permissionDecision:"deny"
  out="$(printf '%s' "$1" | "$SIDE" pre write 2>/dev/null)"
  if printf '%s' "$out" | grep -q '"permissionDecision":"deny"'; then
    echo "PASS (deny)  $2"
  else echo "FAIL (want deny) $2"; fail=1; fi
}
allow() { # payload label — expect NO deny
  out="$(printf '%s' "$1" | "$SIDE" pre write 2>/dev/null)"
  if printf '%s' "$out" | grep -q '"permissionDecision":"deny"'; then
    echo "FAIL (want allow) $2"; fail=1
  else echo "PASS (allow) $2"; fi
}

deny  '{"tool_input":{"file_path":"/x/CLAUDE.md","edits":[{"old_string":"a","new_string":"한글 산문 추가"}]}}' 'MultiEdit CLAUDE.md korean'
deny  '{"tool_input":{"file_path":"/x/commons.md","edits":[{"old_string":"a","new_string":"english ok"},{"old_string":"b","new_string":"한글 산문"}]}}' 'MultiEdit commons.md korean in 2nd edit'
allow '{"tool_input":{"file_path":"/x/CLAUDE.md","edits":[{"old_string":"a","new_string":"english only here"}]}}' 'MultiEdit english-only'
allow '{"tool_input":{"file_path":"/x/CLAUDE.md","edits":[{"old_string":"a","new_string":"see `한글` english"}]}}' 'MultiEdit korean inside backticks (exempt)'
deny  '{"tool_input":{"file_path":"/x/CLAUDE.md","new_string":"한글"}}' 'Edit new_string korean (regression)'
deny  '{"tool_input":{"file_path":"/x/CLAUDE.md","content":"한글 산문"}}' 'Write full korean (regression)'

[ "$fail" = 0 ] && echo "ALL PASS" || echo "SMOKE FAILED"
exit "$fail"
