#!/usr/bin/env sh
# worktree-pr — safe worktree → PR → merge → cleanup workflow.
#
#   /worktree-pr:wt start  <name>            new worktree+branch off origin default
#   /worktree-pr:wt ship   <name> "<title>"  push the branch + open a PR
#   /worktree-pr:wt finish <name>            merge the PR + remove worktree + delete branch
#   /worktree-pr:wt status                   list worktrees
#   /worktree-pr:wt abort  <name>            drop the worktree+branch (no merge)
#
# Branch  : wt/<name>     Worktree: ${TMPDIR}/wtpr-<repo>-<name>
# Operates on the current project repo; never touches its main working
# tree or a concurrent session's branch.
set -u

repo=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}
[ -n "$repo" ] || { echo "worktree-pr: not inside a git repo."; exit 1; }
sub=${1:-status}

_base() {  # origin's default branch, else main
  b=$(git -C "$repo" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)
  [ -n "$b" ] && echo "${b#origin/}" || echo main
}
_slug() { basename "$repo" | tr -c 'A-Za-z0-9._-' '-'; }
_clean() { printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '-'; }
_wt()   { echo "${TMPDIR:-/tmp}/wtpr-$(_slug)-$1"; }

case "$sub" in
  start)
    name=$(_clean "${2:-}"); [ -n "$name" ] || { echo "usage: wt start <name>"; exit 1; }
    base=$(_base); br="wt/$name"; wt=$(_wt "$name")
    [ -e "$wt" ] && { echo "worktree-pr: $wt already exists — use abort/finish first."; exit 1; }
    git -C "$repo" fetch origin "$base" 2>&1 | tail -1
    git -C "$repo" worktree add "$wt" -b "$br" "origin/$base" 2>&1 | tail -1 || exit 1
    echo "worktree-pr: created $wt on \`$br\` (from origin/$base)."
    echo "→ build + commit in that worktree, then: /worktree-pr:wt ship $name \"<title>\""
    ;;
  ship)
    name=$(_clean "${2:-}"); [ -n "$name" ] || { echo "usage: wt ship <name> \"<title>\""; exit 1; }
    shift 2 2>/dev/null; title=${*:-}
    [ -n "$title" ] || { echo "worktree-pr: a PR title is required."; exit 1; }
    base=$(_base); br="wt/$name"; wt=$(_wt "$name")
    [ -d "$wt" ] || { echo "worktree-pr: no worktree for '$name' (run start first)."; exit 1; }
    [ -z "$(git -C "$wt" status --porcelain)" ] || { echo "worktree-pr: $wt has uncommitted changes — commit them first."; exit 1; }
    [ "$(git -C "$wt" rev-list --count "origin/$base..$br" 2>/dev/null)" != 0 ] || { echo "worktree-pr: \`$br\` has no commits over origin/$base — nothing to ship."; exit 1; }
    git -C "$wt" push -u origin "$br" 2>&1 | tail -1 || exit 1
    gh -C "$repo" 2>/dev/null || true
    ( cd "$repo" && gh pr create --base "$base" --head "$br" --title "$title" \
        --body "Opened via the worktree-pr workflow plugin (isolated worktree off origin/$base).

🤖 Generated with [Claude Code](https://claude.com/claude-code)" ) 2>&1 | tail -2
    ;;
  finish)
    name=$(_clean "${2:-}"); [ -n "$name" ] || { echo "usage: wt finish <name>"; exit 1; }
    base=$(_base); br="wt/$name"; wt=$(_wt "$name")
    pr=$(cd "$repo" && gh pr list --head "$br" --state open --json number -q '.[0].number' 2>/dev/null)
    if [ -n "$pr" ]; then
      ( cd "$repo" && gh pr merge "$pr" --merge ) 2>&1 | tail -1
    fi
    state=$(cd "$repo" && gh pr list --head "$br" --state all --json state -q '.[0].state' 2>/dev/null)
    [ "$state" = "MERGED" ] || { echo "worktree-pr: PR for \`$br\` is not merged (state=${state:-none}) — not cleaning up."; exit 1; }
    [ -d "$wt" ] && git -C "$repo" worktree remove "$wt" --force 2>&1 | tail -1
    git -C "$repo" worktree prune 2>/dev/null
    git -C "$repo" push origin --delete "$br" 2>&1 | tail -1
    git -C "$repo" fetch origin "$base" 2>&1 | tail -1
    if [ "$(git -C "$repo" branch --show-current)" = "$base" ]; then
      git -C "$repo" pull --ff-only origin "$base" 2>&1 | tail -1
    else
      echo "worktree-pr: repo is on \`$(git -C "$repo" branch --show-current)\` (not $base) — base left unpulled, untouched."
    fi
    echo "worktree-pr: \`$br\` merged · worktree removed · remote branch deleted."
    ;;
  abort)
    name=$(_clean "${2:-}"); [ -n "$name" ] || { echo "usage: wt abort <name>"; exit 1; }
    br="wt/$name"; wt=$(_wt "$name")
    [ -d "$wt" ] && git -C "$repo" worktree remove "$wt" --force 2>&1 | tail -1
    git -C "$repo" worktree prune 2>/dev/null
    git -C "$repo" branch -D "$br" 2>/dev/null
    git -C "$repo" push origin --delete "$br" 2>/dev/null | tail -1
    echo "worktree-pr: aborted '$name' — worktree + branch dropped (no merge)."
    ;;
  status|"")
    echo "worktree-pr — git worktrees of $(_slug):"
    git -C "$repo" worktree list
    ;;
  *)
    echo "worktree-pr: unknown subcommand '$sub'. Use: start | ship | finish | status | abort."
    ;;
esac
