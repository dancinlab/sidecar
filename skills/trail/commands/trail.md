---
description: /trail — cross-repo main-flow return stack. push on deviation, pop on return. Verbs — `push <return-target>` (record where to climb back before diving into a sub-task) · `pop` (close the top detour + show what to resume) · bare/`show` (render the ladder, deepest = NOW) · `clear` · `help`. Store is HOME-global (~/.sidecar/trail.tape) so it survives cd across repos.
allowed-tools: Bash
---

!`set -e

VERB="${1:-show}"
TRAIL_DIR="$HOME/.sidecar"
TRAIL="$TRAIL_DIR/trail.tape"
mkdir -p "$TRAIL_DIR"
[ -f "$TRAIL" ] || : > "$TRAIL"

repo_tag() {
  local top
  top=$(git rev-parse --show-toplevel 2>/dev/null) || top="$PWD"
  basename "$top"
}

frame_count() {
  grep -c '[^[:space:]]' "$TRAIL" 2>/dev/null || echo 0
}

render() {
  awk -F'\t' '
    NF==0 { next }
    { ts[++n]=$1; repo[n]=$2; tgt[n]=$3 }
    END {
      if (n==0) { print "(trail empty — on the main flow · no active detour)"; exit }
      print "🧭 return-trail — deepest = NOW · climb back with /trail pop  (" n " frame" (n==1?"":"s") ")"
      print ""
      for (i=n; i>=1; i--) {
        pad=""
        for (j=2;j<=i;j++) pad=pad "  "
        if (i==n) lab="★ NOW  "
        else      lab="↑ back "
        printf "%s%s[%s]  -> %s   (%s)\n", pad, lab, repo[i], tgt[i], ts[i]
      }
    }
  ' "$TRAIL"
}

case "$VERB" in
  push)
    shift
    TARGET="$*"
    if [ -z "$TARGET" ]; then
      echo "x usage: /trail push <return-target>   (what to climb back to after this detour)" >&2
      exit 1
    fi
    TS=$(date -u +%Y-%m-%dT%H:%MZ)
    REPO=$(repo_tag)
    printf '%s\t%s\t%s\n' "$TS" "$REPO" "$TARGET" >> "$TRAIL"
    D=$(frame_count)
    echo "push (depth $D) — return target: $TARGET   [$REPO]"
    echo
    render
    ;;
  pop)
    N=$(frame_count)
    if [ "$N" -eq 0 ]; then
      echo "(trail empty — already on the main flow, nothing to pop)"
      exit 0
    fi
    POP_TGT=$(grep '[^[:space:]]' "$TRAIL" | tail -n1 | cut -f3)
    KEEP=$((N - 1))
    grep '[^[:space:]]' "$TRAIL" | head -n "$KEEP" > "$TRAIL.tmp" && mv "$TRAIL.tmp" "$TRAIL"
    echo "popped — closed detour: $POP_TGT"
    R=$(frame_count)
    if [ "$R" -eq 0 ]; then
      echo "-> back on the MAIN FLOW (trail empty)"
    else
      NEXT=$(grep '[^[:space:]]' "$TRAIL" | tail -n1 | cut -f3)
      echo "-> resume: $NEXT"
    fi
    echo
    render
    ;;
  ""|show)
    render
    ;;
  clear)
    N=$(frame_count)
    : > "$TRAIL"
    echo "trail cleared ($N frame(s) removed)"
    ;;
  help)
    echo "/trail — cross-repo main-flow return stack ($TRAIL)"
    echo
    echo "  /trail push <return-target>  deviating into a sub-task -> record where to climb back"
    echo "  /trail pop                   sub-task done -> drop the top frame + show what to resume"
    echo "  /trail            (or show)  render the trail (deepest = NOW)"
    echo "  /trail clear                 wipe the trail"
    echo "  /trail help                  this"
    echo
    echo "HOME-global so it survives cd across repos — the point is cross-repo detours."
    ;;
  *)
    echo "x unknown verb: $VERB  (push - pop - show - clear - help)" >&2
    exit 1
    ;;
esac
`
