#!/bin/sh
# imagine — generic AI image generator dispatcher (sidecar skill+command).
#
# usage:
#   imagine <prompt-file> <out.png> [-s size] [-b backend] [-m model]
#   imagine list
#   imagine help
#
# Backends live in _backends/<name>.sh and receive a fixed argv:
#   $1 = prompt file (absolute path)
#   $2 = output png (absolute path)
#   $3 = canonical size token (square_hd|landscape_16_9|portrait_16_9|square)
#   $4 = model id ("" → backend default)
set -eu

# Always derive ROOT from this script's location, not from $CLAUDE_PLUGIN_ROOT
# — the env var is set by the harness to point at the *invoked* plugin and
# stays put across cross-plugin exec calls (e.g. /paper fig → imagine), so
# trusting it would resolve _backends/ to the wrong plugin's tree.
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BACKENDS_DIR="$ROOT/_backends"

usage() {
  cat <<'USAGE'
imagine — generic AI image generator

usage:
  /imagine <prompt-file> <out.png> [-s size] [-b backend] [-m model]
  /imagine list           # backends + size catalogue
  /imagine help

defaults:
  size      = square_hd
  backend   = fal
  model     = backend default (fal: openai/gpt-image-2 · openai: gpt-image-1)

sizes (canonical, fal-style; backends translate as needed):
  square_hd      1024x1024  (default)
  square         512x512
  landscape_16_9 1792x1024
  portrait_16_9  1024x1792

backends:
  fal     fal.ai queue+poll                 secret get fal.api_key
  openai  api.openai.com /v1/images/...     secret get openai.api_key

provenance:
  Prompt is always read from a file (verbatim stays on disk).
  Prompt is passed to the backend via a mktemp JSON payload, not argv,
  so it does not leak to ps aux / shell history.
USAGE
}

list_backends() {
  echo "[imagine] backends:"
  for b in "$BACKENDS_DIR"/*.sh; do
    [ -f "$b" ] || continue
    name=$(basename "$b" .sh)
    desc=$(awk 'NR==2{sub(/^# */,""); print; exit}' "$b" 2>/dev/null || true)
    printf "  %-8s  %s\n" "$name" "$desc"
  done
  cat <<'SIZES'

[imagine] canonical sizes:
  square_hd       1024x1024  (default)
  square          512x512
  landscape_16_9  1792x1024
  portrait_16_9   1024x1792
SIZES
}

# ---------- arg parse ----------
SIZE="square_hd"
BACKEND="fal"
MODEL=""
POS_PROMPT=""
POS_OUT=""

if [ "$#" -eq 0 ]; then usage; exit 0; fi

# Allow `list` / `help` as the sole token.
case "$1" in
  list)           list_backends; exit 0 ;;
  help|-h|--help) usage;          exit 0 ;;
esac

# Walk argv, collecting two positionals + flags in any order.
while [ "$#" -gt 0 ]; do
  case "$1" in
    -s|--size)    SIZE="$2";    shift 2 ;;
    -b|--backend) BACKEND="$2"; shift 2 ;;
    -m|--model)   MODEL="$2";   shift 2 ;;
    -h|--help)    usage; exit 0 ;;
    --) shift; while [ "$#" -gt 0 ]; do
          if [ -z "$POS_PROMPT" ]; then POS_PROMPT="$1"; else POS_OUT="$1"; fi
          shift
        done ;;
    -*) echo "imagine: unknown flag '$1'" >&2; usage; exit 2 ;;
    *)  if [ -z "$POS_PROMPT" ]; then POS_PROMPT="$1"
        elif [ -z "$POS_OUT" ];   then POS_OUT="$1"
        else echo "imagine: too many positional args (got '$1' after <prompt> <out>)" >&2; exit 2
        fi
        shift ;;
  esac
done

if [ -z "$POS_PROMPT" ] || [ -z "$POS_OUT" ]; then
  echo "imagine: usage: <prompt-file> <out.png> [-s size] [-b backend] [-m model]" >&2
  exit 2
fi
if [ ! -f "$POS_PROMPT" ]; then
  echo "imagine: prompt file not found: $POS_PROMPT" >&2; exit 2
fi
case "$SIZE" in
  square_hd|square|landscape_16_9|portrait_16_9) : ;;
  *) echo "imagine: unknown size '$SIZE' (expected: square_hd | square | landscape_16_9 | portrait_16_9)" >&2; exit 2 ;;
esac

BACKEND_SCRIPT="$BACKENDS_DIR/$BACKEND.sh"
if [ ! -x "$BACKEND_SCRIPT" ]; then
  if [ -f "$BACKEND_SCRIPT" ]; then
    echo "imagine: backend '$BACKEND' present but not executable: $BACKEND_SCRIPT" >&2
  else
    echo "imagine: unknown backend '$BACKEND'" >&2
    echo "  available: $(ls "$BACKENDS_DIR" 2>/dev/null | sed 's/\.sh$//' | tr '\n' ' ')" >&2
  fi
  exit 2
fi
if ! command -v secret >/dev/null 2>&1; then
  echo "imagine: \`secret\` CLI not on PATH (needed for backend API keys)" >&2
  echo "  install via: hx install secret  (or git clone https://github.com/dancinlab/secret)" >&2
  exit 1
fi

# Normalize positional paths to absolute so backends work from any cwd.
abspath() {
  case "$1" in
    /*) printf '%s' "$1" ;;
    *)  printf '%s/%s' "$(pwd)" "$1" ;;
  esac
}
PROMPT_ABS=$(abspath "$POS_PROMPT")
OUT_DIR=$(dirname -- "$POS_OUT")
mkdir -p "$OUT_DIR"
OUT_DIR_ABS=$(CDPATH= cd -- "$OUT_DIR" && pwd)
OUT_ABS="$OUT_DIR_ABS/$(basename -- "$POS_OUT")"

exec "$BACKEND_SCRIPT" "$PROMPT_ABS" "$OUT_ABS" "$SIZE" "$MODEL"
