#!/usr/bin/env sh
# wilson-hexa-first-warn :: PreToolUse hook on Write. When the target
# path ends in .py or .sh it acts on the hexa-first principle — prefer a
# hexa-native equivalent (stdlib / atlas-bound theorem / `hexa` CLI
# subcommand) before adding a hand-rolled script.
#
# Two modes, selected by SIDECAR_HEXA_FIRST_WARN_MODE (WILSON_ accepted):
#   block  (default)  the Write is DENIED at PreToolUse — the model must
#                     pick a hexa-native path or explicitly downgrade.
#   warn              a single-line advisory is injected via
#                     additionalContext and the Write proceeds unchanged.
# Any value other than `warn` resolves to `block` — block is the floor.
#
# Opt out entirely (no block, no warn): SIDECAR_NO_HEXA_FIRST_WARN=1 or
# WILSON_NO_HEXA_FIRST_WARN=1. Both env vars are accepted.
[ -n "$SIDECAR_NO_HEXA_FIRST_WARN" ] && exit 0
[ -n "$WILSON_NO_HEXA_FIRST_WARN" ] && exit 0

f=$(jq -r '.tool_input.file_path // empty')
case "$f" in
  *.py|*.sh) ;;
  *) exit 0 ;;
esac
ext="${f##*.}"

mode="${SIDECAR_HEXA_FIRST_WARN_MODE:-${WILSON_HEXA_FIRST_WARN_MODE:-block}}"
case "$mode" in
  warn)
    exec jq -n --arg p "$f" --arg e "$ext" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: ("HEXA_FIRST_WARN { trigger: write_py_or_sh, target: " + $p + ", ext: ." + $e + ", action: prefer_hexa_native_alternative, rationale: hexa stdlib/atlas/CLI may already cover this, optout: SIDECAR_NO_HEXA_FIRST_WARN=1 }")
      }
    }'
    ;;
  *)
    exec jq -n --arg p "$f" --arg e "$ext" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: ("HEXA_FIRST_BLOCK { trigger: write_py_or_sh, target: " + $p + ", ext: ." + $e + ", action: prefer hexa-native (stdlib/atlas/CLI) — or set SIDECAR_HEXA_FIRST_WARN_MODE=warn to downgrade to advisory }")
      }
    }'
    ;;
esac
