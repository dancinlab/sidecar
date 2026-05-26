---
description: /draft — ephemeral scratchpad. Bare = list current drafts/ + usage. `/draft <slug>` = scaffold drafts/<slug>.md. `/draft list` = enumerate. `/draft clean` = list rm candidates (read-only; user runs `rm`). drafts/ is gitignored (auto-added if missing) so files never commit by accident.
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

case "$VERB" in
  ""|list)
    if [ ! -d "$DRAFTS_DIR" ]; then
      echo "(no $DRAFTS_DIR/ yet — /draft <slug> scaffolds one)"
      echo
      echo "usage:"
      echo "  /draft <slug>   scaffold $DRAFTS_DIR/<slug>.md"
      echo "  /draft list     enumerate"
      echo "  /draft clean    list rm candidates (read-only)"
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
    echo "  rm $DRAFTS_DIR/<slug>.md"
    ;;
  *)
    SLUG="$VERB"
    # sanitize slug — allow alnum, dash, underscore, dot
    if echo "$SLUG" | grep -qvE '^[A-Za-z0-9._-]+$'; then
      echo "✗ slug must be alnum / dash / underscore / dot only: $SLUG" >&2
      exit 1
    fi
    mkdir -p "$DRAFTS_DIR"
    ensure_gitignore
    DEST="$DRAFTS_DIR/$SLUG.md"
    if [ -e "$DEST" ]; then
      echo "⚠ exists already: $DEST"
      echo "  (open in editor or remove first)"
      exit 0
    fi
    DATE=$(date -u +%Y-%m-%d)
    cat > "$DEST" <<EOF
# $SLUG — draft

> 임시 working notes · 나중에 폐기 (drafts/ gitignored).
> 생성: $DATE

## context

(왜 이 draft 가 필요한가)

## observations

(관찰 / 사실)

## ideas

(다음 단계 후보)

## TODO

- [ ]

EOF
    echo "✓ scaffolded $DEST"
    echo "  (drafts/ is gitignored — file never commits unless you explicitly stage)"
    ;;
esac
`
