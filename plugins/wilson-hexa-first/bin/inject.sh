#!/usr/bin/env sh
# wilson-hexa-first :: SessionStart / PostCompact text injector for the
# canonical `hexa-first` operating principle. Verbatim port of wilson
# plugins/principle-hexa-first/main.hexa::principle_hexa_first_text.
# Pure text — no enforcement. Soft-enforcement complement: wilson-hexa-
# first-warn (.py/.sh write nudge). Opt out via SIDECAR_NO_HEXA_FIRST=1
# (sidecar) or WILSON_NO_HEXA_FIRST=1 (wilson). Both accepted.
[ -n "$SIDECAR_NO_HEXA_FIRST" ] && exit 0
[ -n "$WILSON_NO_HEXA_FIRST" ] && exit 0

event=$(jq -r '.hook_event_name // "SessionStart"' 2>/dev/null)
[ -z "$event" ] && event="SessionStart"

text=$(cat <<'EOF'
hexa-first — prefer the hexa way: the hexa-native path over an external CLI or a non-hexa dep; hexa's absorbed intrinsics over forking a shell (no fork-storm — SPEC §16); the absorbed stdlib / atlas (proven constants & formulas) over hand-rolling; and when the constraint lives in hexa-lang itself, fix it there — **PR-only**: `hexa atlas register <file>` → `hexa atlas pr` (branch + `gh pr create`). Direct fold-to-live is forbidden even on the owner repo — every new equation / constant / law lands via reviewable PR so the history stays one shape across owners and non-owners (consistent with hexa-lang `AGENTS.tape` g7 `inbox-patches-pipeline`). Each verified contribution grows the atlas (constants + formulas). Secondary, once you're on the hexa path: weigh ROI — prefer lossless gains (perf/resources/speed up, no offsetting regression).
EOF
)

exec jq -n --arg ev "$event" --arg t "$text" '{
  hookSpecificOutput: {
    hookEventName: $ev,
    additionalContext: ("## hexa-first\n\n" + $t)
  }
}'
