---
description: /pr-cycle — one-shot PR cycle. Pushes the current branch (git push -u origin HEAD) then runs gh pr create --fill; the pr-cycle PreToolUse hook auto-appends ` && gh pr merge --squash --delete-branch` (+ worktree/branch cleanup when fired from a linked worktree). Refuses on main/master. Pass extra gh flags as args (e.g. --title "..." --body "...").
argument-hint: "[gh pr create flags, e.g. --title \"...\" --body \"...\"]"
allowed-tools: Bash
---

!`set -e
BR=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ -z "$BR" ]; then echo "✗ /pr-cycle: not a git repo"; exit 0; fi
if [ "$BR" = "main" ] || [ "$BR" = "master" ]; then
  echo "✗ /pr-cycle: refusing on '$BR' — switch to a feature branch first"
  echo "  (git switch -c feat/<slug>)"
  exit 0
fi
echo "▸ /pr-cycle on '$BR' — push + create (hook appends merge + cleanup)"
git push -u origin HEAD 2>&1 | tail -2
gh pr create --fill $ARGUMENTS`
