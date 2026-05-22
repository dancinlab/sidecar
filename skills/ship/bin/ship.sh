#!/bin/sh
# ship — mechanical tail of the sidecar ship cycle:
#   stage explicit paths -> credential-scan staged diff -> commit -> push origin/<branch> -> sidecar sync.
# The CALLER owns the judgment part (version bump · surface lockstep · commit message) BEFORE this runs.
#
# usage: ship.sh -m "<commit message>" <path> [<path>...]
set -eu

if [ "${1:-}" != "-m" ] || [ -z "${2:-}" ]; then
  echo "usage: /ship -m \"<commit message>\" <path> [<path>...]" >&2
  echo "  stages ONLY the given paths, credential-scans the staged diff," >&2
  echo "  commits, pushes to origin/<branch>, then runs 'sidecar sync'." >&2
  exit 1
fi
MSG="$2"; shift 2
if [ "$#" -eq 0 ]; then
  echo "ship: at least one explicit path required (never -A / -u)" >&2
  exit 1
fi

git add -- "$@"
if git diff --cached --quiet -- "$@"; then
  echo "ship: no staged changes for given paths — nothing to ship" >&2
  exit 1
fi

# Match real key SHAPES (prefix + token), not the bare prefix names — otherwise
# files that merely document the patterns (this script included) false-positive.
HITS=$(git diff --cached -- "$@" | grep -nE 'rpa_[A-Za-z0-9]{16,}|sk-[A-Za-z0-9]{20}|hf_[A-Za-z0-9]{30}|AKIA[0-9A-Z]{16}' || true)
if [ -n "$HITS" ]; then
  git restore --staged -- "$@" 2>/dev/null || git reset -q HEAD -- "$@" 2>/dev/null || true
  echo "ship: credential pattern in staged diff — aborting (unstaged):" >&2
  printf '%s\n' "$HITS" >&2
  exit 1
fi

git commit -m "$MSG"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$BRANCH"
echo "ship: pushed to origin/$BRANCH — syncing local install…"

if command -v sidecar >/dev/null 2>&1; then
  sidecar sync
else
  echo "ship: 'sidecar' not on PATH — skipping install sync (run 'sidecar sync' manually)" >&2
fi
