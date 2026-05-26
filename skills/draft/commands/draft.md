---
description: /draft — ephemeral scratchpad. Verbs — bare/list (enumerate · mtime sorted) · `<slug>` (scaffold) · `add <slug> <content...>` (append timestamped bullet · auto-scaffold if missing) · `rm <slug>` (delete single) · `clean` (list rm candidates · read-only). drafts/ is gitignored (auto-added if missing) so files never commit by accident.
allowed-tools: Bash
---

!`set -e

VERB="${1:-}"
DRAFTS_DIR="drafts"

# ensure drafts/ gitignored — additive single-line if missing
ensure_gitignore() {
  if [ ! -f .gitignore ]; then
    printf '%s\n' "$DRAFTS_DIR/" > .gitignore
    echo "(scaffolded .gitignore with $DRAFTS_DIR/)"
  elif ! grep -qE "^${DRAFTS_DIR}/?$" .gitignore; then
    printf '\n%s\n' "$DRAFTS_DIR/" >> .gitignore
    echo "(appended $DRAFTS_DIR/ to .gitignore)"
  fi
}

# scaffold an empty draft (called from <slug> and add verbs)
scaffold_draft() {
  local SLUG="$1"
  local DEST="$DRAFTS_DIR/$SLUG.md"
  local DATE
  DATE=$(date -u +%Y-%m-%d)
  mkdir -p "$DRAFTS_DIR"
  ensure_gitignore
  cat > "$DEST" <<EOF
# $SLUG — draft

> 임시 working notes · 나중에 폐기 (drafts/ gitignored).
> 생성: $DATE

## entries

EOF
}

# validate slug — alnum / dash / underscore / dot only
valid_slug() {
  echo "$1" | grep -qE '^[A-Za-z0-9._-]+$'
}

case "$VERB" in
  ""|list)
    if [ ! -d "$DRAFTS_DIR" ]; then
      echo "(no $DRAFTS_DIR/ yet — /draft <slug> scaffolds one)"
      echo
      echo "usage:"
      echo "  /draft <slug>                  scaffold $DRAFTS_DIR/<slug>.md"
      echo "  /draft add <slug> <content...> append timestamped bullet (auto-scaffold if missing)"
      echo "  /draft rm <slug>               delete a single draft"
      echo "  /draft list                    enumerate"
      echo "  /draft clean                   list rm candidates (read-only)"
      exit 0
    fi
    N=$(find "$DRAFTS_DIR" -maxdepth 1 -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$N" = "0" ]; then
      echo "($DRAFTS_DIR/ empty)"
    else
      echo "═══ $DRAFTS_DIR/ ($N file$([ "$N" = "1" ] || echo s)) ═══"
      find "$DRAFTS_DIR" -maxdepth 1 -name "*.md" -print0 2>/dev/null \
        | xargs -0 ls -lt 2>/dev/null \
        | awk '{printf "  %s  %s\n", $6" "$7" "$8, $NF}'
    fi
    ;;
  add)
    SLUG="${2:-}"
    if [ -z "$SLUG" ]; then
      echo "✗ usage: /draft add <slug> <content...>" >&2
      exit 1
    fi
    if ! valid_slug "$SLUG"; then
      echo "✗ slug must be alnum / dash / underscore / dot only: $SLUG" >&2
      exit 1
    fi
    shift 2
    CONTENT="$*"
    if [ -z "$CONTENT" ]; then
      echo "✗ usage: /draft add <slug> <content...>  (content required)" >&2
      exit 1
    fi
    DEST="$DRAFTS_DIR/$SLUG.md"
    if [ ! -f "$DEST" ]; then
      scaffold_draft "$SLUG"
      echo "✓ auto-scaffolded $DEST"
    fi
    TS=$(date -u +%Y-%m-%dT%H:%MZ)
    printf '\n- %s — %s\n' "$TS" "$CONTENT" >> "$DEST"
    echo "✓ appended to $DEST"
    echo "    - $TS — $CONTENT"
    ;;
  rm)
    SLUG="${2:-}"
    if [ -z "$SLUG" ]; then
      echo "✗ usage: /draft rm <slug>" >&2
      exit 1
    fi
    if ! valid_slug "$SLUG"; then
      echo "✗ slug must be alnum / dash / underscore / dot only: $SLUG" >&2
      exit 1
    fi
    DEST="$DRAFTS_DIR/$SLUG.md"
    if [ ! -f "$DEST" ]; then
      echo "✗ no such draft: $DEST" >&2
      exit 1
    fi
    rm "$DEST"
    echo "✓ rm $DEST"
    ;;
  clean)
    if [ ! -d "$DRAFTS_DIR" ] || [ -z "$(find "$DRAFTS_DIR" -maxdepth 1 -name "*.md" 2>/dev/null)" ]; then
      echo "(no $DRAFTS_DIR/*.md to clean)"
      exit 0
    fi
    echo "═══ rm candidates ═══"
    find "$DRAFTS_DIR" -maxdepth 1 -name "*.md" 2>/dev/null | sed 's/^/  /'
    echo
    echo "to discard ALL:"
    echo "  rm -rf $DRAFTS_DIR"
    echo
    echo "to discard one:"
    echo "  /draft rm <slug>"
    ;;
  *)
    SLUG="$VERB"
    if ! valid_slug "$SLUG"; then
      echo "✗ slug must be alnum / dash / underscore / dot only: $SLUG" >&2
      exit 1
    fi
    DEST="$DRAFTS_DIR/$SLUG.md"
    if [ -e "$DEST" ]; then
      echo "⚠ exists already: $DEST"
      echo "  (use \`/draft add $SLUG <content>\` to append, or remove first)"
      exit 0
    fi
    scaffold_draft "$SLUG"
    echo "✓ scaffolded $DEST"
    echo "  (drafts/ is gitignored — file never commits unless you explicitly stage)"
    ;;
esac
`
