---
description: /pr-cycle — one-shot PR cycle. Pushes the current branch (git push -u origin HEAD), runs gh pr create --fill, then SELF-MERGES with ` && gh pr merge --squash --admin --delete-branch` IN THE SAME command block. 0.4.1 — the merge is appended by the command itself (not left to the pr-cycle PreToolUse hook): the command body runs via slash-command `!`-exec, which does NOT route through the Bash-tool PreToolUse hook, so relying on the hook left PRs created-but-unmerged; self-merging fixes that and stays idempotent (the hook skips any command already containing `gh pr merge`). Refuses on main/master. Pass extra gh flags as args (e.g. --title "..." --body "...").
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
echo "▸ /pr-cycle on '$BR' — push + create + self-merge"
git push -u origin HEAD 2>&1 | tail -2
gh pr create --fill $ARGUMENTS && gh pr merge --squash --admin --delete-branch`
