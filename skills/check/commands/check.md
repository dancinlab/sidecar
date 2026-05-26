---
description: /check — task dashboard. Aggregates current-state status across surfaces in one shot — domain log checkboxes (open vs done), gh open PRs in this repo, git status (uncommitted / ahead / behind), recent merged commits. Read-only; no side effects.
allowed-tools: Bash
---

!`set -e

echo "═══ domain log (checkbox tasks) ═══"
shopt -s nullglob 2>/dev/null || true
LOGS=( *.log.md )
if [ ${#LOGS[@]} -eq 0 ]; then
  echo "(no <UPPERCASE>.log.md at repo root)"
else
  for f in "${LOGS[@]}"; do
    echo
    echo "── $f ──"
    OPEN=$(grep -c '^- \[ \]' "$f" 2>/dev/null || true)
    DONE=$(grep -c '^- \[x\]' "$f" 2>/dev/null || true)
    echo "  open: $OPEN · done: $DONE"
    grep '^- \[ \]' "$f" 2>/dev/null | head -10 | sed 's/^/    /'
  done
fi

echo
echo "═══ open PRs (gh) ═══"
if command -v gh >/dev/null 2>&1; then
  gh pr list --state open --limit 10 2>/dev/null || echo "  (gh: not authenticated or not a GitHub repo)"
else
  echo "  (gh CLI not installed)"
fi

echo
echo "═══ git status ═══"
git status -sb 2>/dev/null || echo "  (not a git repo)"

echo
echo "═══ recent merged commits (last 5) ═══"
git log --oneline -5 2>/dev/null || true

echo
echo "═══ pool-route counters (~/.pool/route-counters.tally) ═══"
TALLY="$HOME/.pool/route-counters.tally"
if [ -f "$TALLY" ]; then
  ROUTED=$(awk -F= '/^routed=/{print $2}' "$TALLY")
  LOCAL=$(awk -F= '/^local_bound=/{print $2}' "$TALLY")
  LIGHT=$(awk -F= '/^light_allowed=/{print $2}' "$TALLY")
  FAILED=$(awk -F= '/^heavy_failed=/{print $2}' "$TALLY")
  TOTAL=$(awk -F= '/^total=/{print $2}' "$TALLY")
  if [ "${TOTAL:-0}" -gt 0 ]; then
    awk -v r="${ROUTED:-0}" -v l="${LOCAL:-0}" -v li="${LIGHT:-0}" -v f="${FAILED:-0}" -v t="$TOTAL" 'BEGIN{
      printf "  routed       : %5d  (%5.1f%%)  — heavy → Linux pool\n",  r,  100*r/t
      printf "  local_bound  : %5d  (%5.1f%%)  — git/gh/pool/npm/~/.X early-exit\n", l, 100*l/t
      printf "  light_allowed: %5d  (%5.1f%%)  — classifier passed, not heavy\n", li, 100*li/t
      printf "  heavy_failed : %5d  (%5.1f%%)  — heavy but no eligible host\n", f, 100*f/t
      printf "  total        : %5d  decisions counted\n", t
    }'
  else
    echo "  (counters file empty — no classifier decisions recorded yet)"
  fi
else
  echo "  (no counters yet — pool-route 0.7.5+ writes ~/.pool/route-counters.tally)"
fi
`
