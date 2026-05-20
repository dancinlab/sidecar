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
    # Two creation surfaces, both anchored on the DESTINATION token only —
    # the source (e.g. reading from a `.py`) never triggers.
    #
    # (1) Redirect (`>` / `>>`) or `tee [-a]` followed by a path ending in
    #     a protected ext. Closes heredoc / pipe / echo bypasses:
    #       cat > foo.py <<EOF   echo … > out.sh   tee log.c
    # (2) Rename / copy / link / touch where the LAST positional arg of the
    #     command ends in a protected ext. Closes the documented residual:
    #       cp tmpl dest.sh    mv tmp dispatch.sh    ln -s src link.sh
    #       install -m755 a b.sh    rsync a b.sh    touch new.sh
    #     "Last positional" = anchored at command terminator (EOL / `;`
    #     / `|` / `&`). Source-as-protected (`cp script.sh dest`) does
    #     NOT match — only the trailing destination counts.
    re_redirect="(>{1,2}[[:space:]]*|tee([[:space:]]+-a)?[[:space:]]+)[^[:space:]|;&<>]+\\.($EXTS_ALT)([^[:alnum:]./_-]|\$)"
    re_create="\\b(cp|mv|ln|install|rsync|touch)\\b[^|;&]*[[:space:]][^[:space:]|;&<>]+\\.($EXTS_ALT)[[:space:]]*(\$|[|;&])"
    match=$(printf '%s\n' "$cmd" | grep -oE "$re_redirect" | head -1)
    if [ -n "$match" ]; then
      f=$(printf '%s' "$match" \
          | sed -E 's/^(>>?|tee([[:space:]]+-a)?)[[:space:]]*//' \
          | sed -E 's/[^[:alnum:]./_-].*$//')
      trigger="bash_redirect_or_tee_to_protected_ext"
    else
      match=$(printf '%s\n' "$cmd" | grep -oE "$re_create" | head -1)
      [ -z "$match" ] && exit 0
      # The destination is the LAST token in the match ending in protected ext.
      f=$(printf '%s' "$match" | grep -oE "[^[:space:]|;&<>]+\\.($EXTS_ALT)" | tail -1)
      trigger="bash_create_via_cp_mv_ln_install_rsync_touch_to_protected_ext"
    fi
    ext="${f##*.}"
    [ -z "$ext" ] && ext="?"
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
