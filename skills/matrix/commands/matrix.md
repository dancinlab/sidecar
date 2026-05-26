---
description: /matrix — axis cross-product coverage tracker (cwd-local MATRIX.tape SSOT). Bare/show = render grid + per-axis coverage bars + next unfilled cells. Verbs — axes <a…> (square mode) · rows <a…> / cols <a…> (rectangular mode) · done <i> <j> (mark a cell) · undone <i> <j> · next [N] (suggest unfilled) · help. Cells are explicit (toggled like /domain milestones), not auto-detected.
allowed-tools: Bash
---

!`set -e

F="MATRIX.tape"
VERB="${1:-show}"

# ── helpers ──────────────────────────────────────────────────────────
_get_line() { grep -E "^$1:" "$F" 2>/dev/null | head -1 | sed -E "s/^$1:[[:space:]]*//"; }
_csv_to_lines() { echo "$1" | tr ',' '\n' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' | grep -v '^$'; }
_norm() { echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[[:space:]]+/_/g'; }
_ensure() {
  if [ ! -f "$F" ]; then
    {
      echo "# MATRIX.tape — axis cross-product coverage (managed by /matrix)"
      echo "mode: $1"
      echo "title:"
      [ "$1" = "square" ] && echo "axes:"
      if [ "$1" = "rectangular" ]; then echo "rows:"; echo "cols:"; fi
    } > "$F"
  fi
}
_set_field() {  # _set_field <field> <value>
  if grep -qE "^$1:" "$F"; then
    tmp=$(mktemp); sed -E "s|^$1:.*|$1: $2|" "$F" > "$tmp" && mv "$tmp" "$F"
  else
    echo "$1: $2" >> "$F"
  fi
}

case "$VERB" in
  help)
    echo "/matrix — axis cross-product coverage tracker (SSOT: ./MATRIX.tape)"
    echo
    echo "  /matrix axes <a> <b> …       square mode: one axis set, pairs = upper-triangle + diagonal"
    echo "  /matrix rows <a> <b> …       rectangular mode: row axes (e.g. BIO mechanisms)"
    echo "  /matrix cols <a> <b> …       rectangular mode: col axes (e.g. anima axes)"
    echo "  /matrix done <i> <j>         mark cell (i,j) filled"
    echo "  /matrix undone <i> <j>       unmark"
    echo "  /matrix next [N]             list N unfilled cells (default 10)"
    echo "  /matrix  |  /matrix show      render grid + coverage bars + next"
    ;;

  axes)
    shift; _ensure square; _set_field mode square
    JOINED=$(printf '%s, ' "$@" | sed 's/, $//'); _set_field axes "$JOINED"
    echo "✓ axes set ($#): $JOINED"
    ;;

  rows)
    shift; _ensure rectangular; _set_field mode rectangular
    JOINED=$(printf '%s, ' "$@" | sed 's/, $//'); _set_field rows "$JOINED"
    echo "✓ rows set ($#): $JOINED"
    ;;

  cols)
    shift; _ensure rectangular; _set_field mode rectangular
    JOINED=$(printf '%s, ' "$@" | sed 's/, $//'); _set_field cols "$JOINED"
    echo "✓ cols set ($#): $JOINED"
    ;;

  done|undone)
    [ -f "$F" ] || { echo "✗ no MATRIX.tape — run /matrix axes … or /matrix rows …/cols … first" >&2; exit 1; }
    I=$(_norm "${2:-}"); J=$(_norm "${3:-}")
    [ -n "$I" ] && [ -n "$J" ] || { echo "✗ usage: /matrix $VERB <i> <j>" >&2; exit 1; }
    MODE=$(_get_line mode)
    # square mode pairs are unordered → sort for a canonical key
    if [ "$MODE" = "square" ] && [ "$I" \> "$J" ]; then T="$I"; I="$J"; J="$T"; fi
    KEY="$I*$J"
    if [ "$VERB" = "done" ]; then
      if grep -qxF -- "- $KEY" "$F"; then echo "(already done: $I × $J)"; else echo "- $KEY" >> "$F"; echo "✓ done: $I × $J"; fi
    else
      tmp=$(mktemp); grep -vxF -- "- $KEY" "$F" > "$tmp" && mv "$tmp" "$F"; echo "✓ undone: $I × $J"
    fi
    ;;

  next|show|"")
    [ -f "$F" ] || { echo "(no MATRIX.tape — /matrix axes … or /matrix rows …/cols … to start · /matrix help)"; exit 0; }
    MODE=$(_get_line mode); TITLE=$(_get_line title)
    DONE=$(grep -E '^- ' "$F" 2>/dev/null | sed -E 's/^- //')
    is_done() { echo "$DONE" | grep -qxF -- "$1"; }

    if [ "$MODE" = "rectangular" ]; then
      ROWS=$(_csv_to_lines "$(_get_line rows)"); COLS=$(_csv_to_lines "$(_get_line cols)")
      NR=$(echo "$ROWS" | grep -c . || true); NC=$(echo "$COLS" | grep -c . || true)
      TOTAL=$((NR * NC))
    else
      AX=$(_csv_to_lines "$(_get_line axes)"); ROWS="$AX"; COLS="$AX"
      NA=$(echo "$AX" | grep -c . || true); TOTAL=$(( NA * (NA + 1) / 2 ))
    fi

    # collect unfilled (respecting square upper-triangle+diagonal)
    UNFILLED=""; NDONE=0
    while IFS= read -r r; do [ -z "$r" ] && continue
      while IFS= read -r c; do [ -z "$c" ] && continue
        rn=$(_norm "$r"); cn=$(_norm "$c"); i="$rn"; j="$cn"
        if [ "$MODE" != "rectangular" ]; then
          [ "$rn" \> "$cn" ] && continue   # skip lower triangle in square mode
        fi
        if [ "$MODE" = "square" ] && [ "$i" \> "$j" ]; then T="$i"; i="$j"; j="$T"; fi
        if is_done "$i*$j"; then NDONE=$((NDONE+1)); else UNFILLED="$UNFILLED$r × $c"$'\n'; fi
      done <<< "$COLS"
    done <<< "$ROWS"

    PCT=0; [ "$TOTAL" -gt 0 ] && PCT=$(( NDONE * 100 / TOTAL ))
    echo "═══ matrix${TITLE:+ · $TITLE} ═══"
    echo "  mode: ${MODE:-square} · coverage: $NDONE/$TOTAL ($PCT%)"

    if [ "$VERB" = "next" ]; then
      N="${2:-10}"
      echo; echo "── next $N unfilled ──"
      echo "$UNFILLED" | grep -v '^$' | head -"$N" | sed 's/^/  /'
      exit 0
    fi

    # full grid only when small enough to be legible
    if [ "$MODE" = "rectangular" ] && [ "${NR:-0}" -le 14 ] && [ "${NC:-0}" -le 14 ] && [ "${NC:-0}" -gt 0 ]; then
      echo; printf "  %-14s" ""; while IFS= read -r c; do [ -z "$c" ] && continue; printf "%-5s" "$(echo "$c" | cut -c1-4)"; done <<< "$COLS"; echo
      while IFS= read -r r; do [ -z "$r" ] && continue
        printf "  %-14s" "$(echo "$r" | cut -c1-13)"
        while IFS= read -r c; do [ -z "$c" ] && continue
          if is_done "$(_norm "$r")*$(_norm "$c")"; then printf "%-5s" "✓"; else printf "%-5s" "·"; fi
        done <<< "$COLS"; echo
      done <<< "$ROWS"
    elif [ "$MODE" != "rectangular" ] && [ "${NA:-0}" -le 12 ] && [ "${NA:-0}" -gt 0 ]; then
      echo; printf "  %-14s" ""; while IFS= read -r c; do [ -z "$c" ] && continue; printf "%-5s" "$(echo "$c" | cut -c1-4)"; done <<< "$AX"; echo
      while IFS= read -r r; do [ -z "$r" ] && continue
        printf "  %-14s" "$(echo "$r" | cut -c1-13)"
        while IFS= read -r c; do [ -z "$c" ] && continue
          rn=$(_norm "$r"); cn=$(_norm "$c")
          if [ "$rn" \> "$cn" ]; then printf "%-5s" " "; else
            i="$rn"; j="$cn"; [ "$i" \> "$j" ] && { T="$i"; i="$j"; j="$T"; }
            if is_done "$i*$j"; then printf "%-5s" "✓"; else printf "%-5s" "·"; fi
          fi
        done <<< "$AX"; echo
      done <<< "$AX"
    else
      # large matrix → per-row coverage bars
      echo; echo "── per-row coverage ──"
      while IFS= read -r r; do [ -z "$r" ] && continue
        rd=0; rt=0
        while IFS= read -r c; do [ -z "$c" ] && continue
          rn=$(_norm "$r"); cn=$(_norm "$c")
          if [ "$MODE" != "rectangular" ] && [ "$rn" \> "$cn" ]; then continue; fi
          i="$rn"; j="$cn"; if [ "$MODE" = "square" ] && [ "$i" \> "$j" ]; then T="$i"; i="$j"; j="$T"; fi
          rt=$((rt+1)); is_done "$i*$j" && rd=$((rd+1))
        done <<< "$COLS"
        bar=""; filled=$(( rt>0 ? rd*5/rt : 0 )); k=0
        while [ "$k" -lt 5 ]; do [ "$k" -lt "$filled" ] && bar="$bar▓" || bar="$bar░"; k=$((k+1)); done
        printf "  %-16s %s %d/%d\n" "$(echo "$r" | cut -c1-15)" "$bar" "$rd" "$rt"
      done <<< "$ROWS"
    fi

    echo; echo "── next 5 unfilled ──"
    UN=$(echo "$UNFILLED" | grep -v '^$')
    if [ -z "$UN" ]; then echo "  🎉 matrix complete — all $TOTAL cells filled"; else echo "$UN" | head -5 | sed 's/^/  /'; fi
    ;;

  *)
    echo "✗ unknown verb: $VERB (try /matrix help)" >&2; exit 1
    ;;
esac
`
