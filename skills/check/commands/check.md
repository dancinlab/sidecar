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
`
