#!/usr/bin/env sh
# wilson-hexa-first-warn :: PreToolUse hook on Write that emits an
# AI-native single-line warn when the target path ends in .py or .sh.
# Non-blocking — the warn is advisory context for the model, parsed
# same-turn. Opt out via SIDECAR_NO_HEXA_FIRST_WARN=1 (sidecar) or
# WILSON_NO_HEXA_FIRST_WARN=1 (wilson). Both env vars are accepted.
[ -n "$SIDECAR_NO_HEXA_FIRST_WARN" ] && exit 0
[ -n "$WILSON_NO_HEXA_FIRST_WARN" ] && exit 0

f=$(jq -r '.tool_input.file_path // empty')
case "$f" in
  *.py|*.sh)
    ext="${f##*.}"
    exec jq -n --arg p "$f" --arg e "$ext" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: ("HEXA_FIRST_WARN { trigger: write_py_or_sh, target: " + $p + ", ext: ." + $e + ", action: prefer_hexa_native_alternative, rationale: hexa stdlib/atlas/CLI may already cover this, optout: SIDECAR_NO_HEXA_FIRST_WARN=1 }")
      }
    }'
    ;;
esac
exit 0
