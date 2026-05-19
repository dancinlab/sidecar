#!/usr/bin/env sh
# wilson-hexa-first-warn :: PreToolUse hook on Write AND Bash. Acts on
# the hexa-first principle when a new file in the protected set is about
# to land — prefer a hexa-native equivalent (stdlib / atlas-bound
# theorem / `hexa` CLI subcommand) before adding a hand-rolled artifact,
# or extend hexa-lang upstream PR-only (`hexa atlas register <file>` →
# `hexa atlas pr`) when no existing path fits.
#
# Protected extensions — scripting plus firmware authoring (the hexa
# absorption target). `.s` (lower) and `.S` (preprocessed asm) are
# listed separately, per toolchain convention:
#   scripting   .py .sh
#   C/C++       .c .h .cpp .hpp .cc .hh
#   assembly    .s .S
#   RTL         .v .sv .vhd .vhdl
#
# Two tool surfaces — both routed to the same decision logic:
#   Write   tool_input.file_path matches a protected ext.
#   Bash    tool_input.command contains a redirect (`>` / `>>`) or
#           `tee [-a]` whose target is a path ending in a protected
#           ext. This closes the heredoc/redirect bypass:
#             cat > foo.py <<EOF   echo … > out.sh   tee log.c
#           …would all be flagged the same way as a direct Write.
#
# Two modes, selected by SIDECAR_HEXA_FIRST_WARN_MODE (WILSON_ accepted):
#   block  (default)  DENY at PreToolUse — the model must pick a hexa-
#                     native path, extend hexa upstream via PR, or
#                     explicitly downgrade.
#   warn              a single-line advisory via additionalContext and
#                     the tool call proceeds unchanged.
# Any value other than `warn` resolves to `block` — block is the floor.
#
# Opt out entirely (no block, no warn): SIDECAR_NO_HEXA_FIRST_WARN=1 or
# WILSON_NO_HEXA_FIRST_WARN=1. Both env vars are accepted.
[ -n "$SIDECAR_NO_HEXA_FIRST_WARN" ] && exit 0
[ -n "$WILSON_NO_HEXA_FIRST_WARN" ] && exit 0

# Protected-ext alternation — keep the Write `case` list and this
# alternation in sync (used by the Bash regex).
EXTS_ALT='py|sh|c|h|cpp|hpp|cc|hh|s|S|v|sv|vhd|vhdl'

payload=$(cat)
tool=$(printf '%s' "$payload" | jq -r '.tool_name // empty')

f=""
ext=""
trigger=""

case "$tool" in
  Write)
    f=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')
    case "$f" in
      *.py|*.sh|*.c|*.h|*.cpp|*.hpp|*.cc|*.hh|*.s|*.S|*.v|*.sv|*.vhd|*.vhdl) ;;
      *) exit 0 ;;
    esac
    ext="${f##*.}"
    trigger="write_protected_ext"
    ;;
  Bash)
    cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')
    # Match a redirect (`>` / `>>`) or `tee [-a]` followed by a token
    # ending in a protected extension. Anchored so an unrelated `.py`
    # earlier in the command (e.g. `python3 src.py > out.txt`) does NOT
    # trigger — only the redirect TARGET matters.
    re="(>{1,2}[[:space:]]*|tee([[:space:]]+-a)?[[:space:]]+)[^[:space:]|;&<>]+\\.($EXTS_ALT)([^[:alnum:]./_-]|\$)"
    match=$(printf '%s\n' "$cmd" | grep -oE "$re" | head -1)
    [ -z "$match" ] && exit 0
    # Strip the redirect/tee prefix → the target path itself.
    f=$(printf '%s' "$match" \
        | sed -E 's/^(>>?|tee([[:space:]]+-a)?)[[:space:]]*//' \
        | sed -E 's/[^[:alnum:]./_-].*$//')
    ext="${f##*.}"
    [ -z "$ext" ] && ext="?"
    trigger="bash_redirect_or_tee_to_protected_ext"
    ;;
  *)
    exit 0
    ;;
esac

mode="${SIDECAR_HEXA_FIRST_WARN_MODE:-${WILSON_HEXA_FIRST_WARN_MODE:-block}}"
case "$mode" in
  warn)
    exec jq -n --arg t "$trigger" --arg p "$f" --arg e "$ext" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: ("HEXA_FIRST_WARN { trigger: " + $t + ", target: " + $p + ", ext: ." + $e + ", primary: write_dot_hexa_instead — .hexa absorbs scripts(.py .sh), C(.c .h .cpp .hpp .cc .hh), asm(.s .S), RTL(.v .sv .vhd .vhdl) in this project, extend: when no existing stdlib/atlas/CLI path fits, `hexa atlas register <file>` then `hexa atlas pr` extends hexa-lang upstream PR-only, optout: SIDECAR_NO_HEXA_FIRST_WARN=1 }")
      }
    }'
    ;;
  *)
    exec jq -n --arg t "$trigger" --arg p "$f" --arg e "$ext" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: ("HEXA_FIRST_BLOCK { trigger: " + $t + ", target: " + $p + ", ext: ." + $e + ", primary: write_dot_hexa_instead — .hexa absorbs scripts(.py .sh), C(.c .h .cpp .hpp .cc .hh), asm(.s .S), RTL(.v .sv .vhd .vhdl) in this project, extend: when no existing stdlib/atlas/CLI path fits, `hexa atlas register <file>` then `hexa atlas pr` extends hexa-lang upstream PR-only, downgrade: SIDECAR_HEXA_FIRST_WARN_MODE=warn }")
      }
    }'
    ;;
esac
