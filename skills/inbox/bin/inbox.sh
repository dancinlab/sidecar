#!/bin/sh
# inbox — list / new <kind> <slug>
set -e

# resolve repo root (nearest .git from cwd)
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "not in a git repo"; exit 1; }
INBOX="$ROOT/inbox"

VERB="${1:-list}"

case "$VERB" in
  list)
    if [ ! -d "$INBOX" ]; then
      echo "no inbox/ in $ROOT — run \`/inbox new <kind> <slug>\` to scaffold one"
      exit 0
    fi
    find "$INBOX" -type f -name '*.md' -mindepth 1 -maxdepth 3 | sort | sed "s|^$ROOT/||"
    ;;
  new)
    KIND="$2"
    SLUG="$3"
    [ -n "$KIND" ] && [ -n "$SLUG" ] || { echo "usage: /inbox new <kind> <slug>"; exit 1; }
    case "$KIND" in notes|patches|poc|rfc_drafts) : ;; *) echo "kind must be: notes | patches | poc | rfc_drafts"; exit 1 ;; esac
    DIR="$INBOX/$KIND"
    mkdir -p "$DIR"
    FILE="$DIR/$SLUG.md"
    if [ -e "$FILE" ]; then echo "exists: ${FILE#$ROOT/}"; exit 1; fi
    cat > "$FILE" <<EOF
# $SLUG

**Source**: $(basename "$ROOT")
**Kind**: $KIND
**Status**: filed

<body — what changed / what's needed / why>
EOF
    echo "scaffolded: ${FILE#$ROOT/}"
    ;;
  *)
    echo "usage: /inbox [list | new <kind> <slug>]"
    exit 1
    ;;
esac
