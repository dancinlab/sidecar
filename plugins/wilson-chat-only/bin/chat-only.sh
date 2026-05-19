#!/usr/bin/env sh
# wilson-chat-only :: PreToolUse hook denying the AskUserQuestion tool so
# that options must be presented inline as plain text and the agent waits
# for a plain-text reply. The deny reason is an AI-native single-line
# directive parsed by the model. Opt out via SIDECAR_NO_CHAT_ONLY=1
# (sidecar convention) or WILSON_NO_CHAT_ONLY=1 (wilson convention).
[ -n "$SIDECAR_NO_CHAT_ONLY" ] && exit 0
[ -n "$WILSON_NO_CHAT_ONLY" ] && exit 0
exec jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: "CHAT_ONLY_MODE { rule: ask_user_question_forbidden, action: present_options_inline_as_plain_text_and_wait_for_plain_text_reply, scope: user_global, optout: SIDECAR_NO_CHAT_ONLY=1 }"
  }
}'
