#!/usr/bin/env bash
# dancinlab/harness — global bootstrap installer.
#
# Clones (or updates) the harness CLI to ~/.harness/cli and drops a `harness`
# wrapper on PATH (~/.local/bin/harness). Idempotent — safe to re-run; a second
# run just fast-forwards the clone. This is the SSOT for `harness install`
# (the CLI verb delegates here).
#
# One-liner (no harness needed yet):
#   curl -fsSL https://raw.githubusercontent.com/dancinlab/harness/main/scripts/install.sh | bash
#
# By default this also wires the harness hooks GLOBALLY (install-hooks --global)
# so guards/injects fire in every Claude Code session — a one-shot common setup,
# NOT a per-repo scaffold (that's `harness init`).
#
# Env / flag overrides:
#   HARNESS_DIR / --dir=<path>   install dir   (default ~/.harness/cli)
#   HARNESS_BIN / --bin=<path>   wrapper path  (default ~/.local/bin/harness)
#   HARNESS_REF / --ref=<ref>    branch/tag    (default main)
#   --no-hooks                   skip the global hook wiring (clone + wrapper only)
#   --dry-run                    print actions, change nothing
set -euo pipefail

REPO="https://github.com/dancinlab/harness"
DIR="${HARNESS_DIR:-$HOME/.harness/cli}"
BIN="${HARNESS_BIN:-$HOME/.local/bin/harness}"
REF="${HARNESS_REF:-main}"
DRY=0
HOOKS=1
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    --no-hooks) HOOKS=0 ;;
    --ref=*) REF="${a#*=}" ;;
    --dir=*) DIR="${a#*=}" ;;
    --bin=*) BIN="${a#*=}" ;;
    *) printf '⚠ unknown flag: %s\n' "$a" >&2 ;;
  esac
done

say() { printf '%s\n' "$*"; }
# run real argv tokens (no eval — avoids nested-quote breakage); dry-run just prints
run() { if [ "$DRY" = 1 ]; then printf '  would: %s\n' "$*"; else "$@"; fi; }

command -v git >/dev/null 2>&1 || { say "✗ git not found — install git first."; exit 1; }

# 1. clone or update the engine clone
if [ -d "$DIR/.git" ]; then
  say "↻ updating $DIR (ref $REF)"
  run git -C "$DIR" fetch -q origin
  run git -C "$DIR" checkout -q "$REF"
  run git -C "$DIR" reset -q --hard "origin/$REF"
else
  say "⬇ cloning $REPO → $DIR (ref $REF)"
  run mkdir -p "$(dirname "$DIR")"
  run git clone -q --branch "$REF" "$REPO" "$DIR"
fi

# 2. wrapper on PATH — a SCRIPT, not a symlink: bin/harness resolves its own dir
#    via BASH_SOURCE without readlink, so a symlink at $BIN would mis-resolve the
#    install dir. A thin exec-wrapper always points at the real launcher.
say "🔗 linking $BIN → $DIR/bin/harness"
if [ "$DRY" = 1 ]; then
  say "  would: write exec-wrapper to $BIN"
else
  mkdir -p "$(dirname "$BIN")"
  cat > "$BIN" <<EOF
#!/usr/bin/env bash
exec bash "$DIR/bin/harness" "\$@"
EOF
  chmod +x "$BIN"
fi

# 3. PATH check
BINDIR="$(dirname "$BIN")"
case ":${PATH:-}:" in
  *":$BINDIR:"*) say "✓ $BINDIR is on PATH" ;;
  *) say "⚠ $BINDIR is NOT on PATH — add to your shell rc (~/.zshrc / ~/.bashrc):"
     say "    export PATH=\"$BINDIR:\$PATH\"" ;;
esac

# 4. smoke (best-effort; needs a tsx/npx runtime — bin/harness auto-resolves it)
if [ "$DRY" = 0 ]; then
  if bash "$DIR/bin/harness" help >/dev/null 2>&1; then
    say "✓ harness runs"
  else
    say "⚠ installed, but the 'help' smoke did not pass — likely a tsx/npx runtime hiccup."
    say "  check: bash $DIR/bin/harness help"
  fi
fi

# 5. global hook wiring — the "common setup" step (skip with --no-hooks)
if [ "$HOOKS" = 1 ]; then
  say "🪝 wiring harness hooks globally (~/.claude/settings.json)"
  if [ "$DRY" = 1 ]; then
    say "  would: harness install-hooks --global"
  else
    bash "$DIR/bin/harness" install-hooks --global || say "⚠ hook wiring failed — run later: harness install-hooks --global"
  fi
fi

say ""
say "✅ harness installed → $DIR  (common/global setup$([ "$HOOKS" = 1 ] && echo ' + hooks' || echo ''))"
say "   per-repo scaffold (optional): cd <repo> && harness init"
say "   update later:                 harness self-update"
