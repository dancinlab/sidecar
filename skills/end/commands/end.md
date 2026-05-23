---
description: /end — session closure safety check. Single-shot dashboard of dangling residue in the current repo (uncommitted · unpushed · stash · open PRs by me · marketplace ↔ plugin version drift) with per-item ✓/⚠ marks + recommended actions, and a closing ✅/⚠ verdict. Read-only.
allowed-tools: Bash
---

!`set +e

echo "═══ /end — closure safety check ═══"
echo

# 1. uncommitted
N_UNC=$(git status -s 2>/dev/null | wc -l | tr -d ' ')
if [ "$N_UNC" = "0" ]; then
  echo "✓ uncommitted        0"
else
  echo "⚠ uncommitted        $N_UNC file(s)"
  git status -s 2>/dev/null | head -10 | sed 's/^/    /'
  echo "  → /ship -m \"<msg>\" <path>… · or git stash push -m \"<msg>\""
fi
echo

# 2. unpushed (ahead of upstream)
N_AHEAD=0
if UP=$(git rev-parse --abbrev-ref @{u} 2>/dev/null); then
  N_AHEAD=$(git rev-list "$UP..HEAD" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$N_AHEAD" = "0" ]; then
    echo "✓ unpushed           0  ($(git branch --show-current) ↔ $UP)"
  else
    echo "⚠ unpushed           $N_AHEAD commit(s) ahead of $UP"
    git --no-pager log --oneline "$UP..HEAD" 2>/dev/null | head -5 | sed 's/^/    /'
    echo "  → git push"
  fi
else
  echo "○ unpushed           (no upstream tracking)"
fi
echo

# 3. stash
N_STASH=$(git stash list 2>/dev/null | wc -l | tr -d ' ')
if [ "$N_STASH" = "0" ]; then
  echo "✓ stash              0"
else
  echo "⚠ stash              $N_STASH entrie(s)"
  git stash list 2>/dev/null | head -5 | sed 's/^/    /'
  echo "  → git stash show stash@{N} -p  ·  then git stash drop / pop"
fi
echo

# 4. open PRs authored by me
N_PR=0
if command -v gh >/dev/null 2>&1; then
  PR_JSON=$(gh pr list -A '@me' -s open --json number,title,url 2>/dev/null)
  if [ -n "$PR_JSON" ]; then
    N_PR=$(printf '%s' "$PR_JSON" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))' 2>/dev/null || echo 0)
    if [ "$N_PR" = "0" ]; then
      echo "✓ open PRs (mine)    0"
    else
      echo "⚠ open PRs (mine)    $N_PR"
      gh pr list -A '@me' -s open 2>/dev/null | head -5 | sed 's/^/    /'
      echo "  → gh pr merge <N> --squash --delete-branch  ·  or gh pr close <N>"
    fi
  else
    echo "○ open PRs (mine)    (gh: not authenticated or not a GitHub repo)"
  fi
else
  echo "○ open PRs (mine)    (gh CLI not installed)"
fi
echo

# 5. marketplace.json ↔ plugin.json version drift (sidecar pattern; commons @D g22)
DRIFTS=""
if [ -f ".claude-plugin/marketplace.json" ]; then
  DRIFTS=$(python3 - <<'PY' 2>/dev/null
import json, os
try:
    mp = json.load(open(".claude-plugin/marketplace.json"))
except Exception:
    raise SystemExit
for p in mp.get("plugins", []):
    name = p.get("name", "?")
    src = p.get("source", "").lstrip("./")
    mp_ver = p.get("version", "")
    pj = os.path.join(src, ".claude-plugin", "plugin.json")
    if not os.path.exists(pj):
        continue
    try:
        v = json.load(open(pj)).get("version", "")
    except Exception:
        continue
    if v != mp_ver:
        print(f"{name}: marketplace={mp_ver} plugin={v}")
PY
)
  if [ -z "$DRIFTS" ]; then
    echo "✓ version lockstep    (commons @D g22)"
  else
    N_DRIFT=$(printf '%s\n' "$DRIFTS" | wc -l | tr -d ' ')
    echo "⚠ version drift       $N_DRIFT plugin(s)"
    printf '%s\n' "$DRIFTS" | sed 's/^/    /'
    echo "  → bump matching surface in plugin.json or marketplace.json"
  fi
  echo
fi

# verdict
if [ "$N_UNC" = "0" ] && [ "$N_AHEAD" = "0" ] && [ "$N_STASH" = "0" ] && [ "$N_PR" = "0" ] && [ -z "$DRIFTS" ]; then
  echo "═══ ✅ 100% closure — safe to end ═══"
else
  echo "═══ ⚠ residue detected — resolve items above before closure ═══"
fi
`
