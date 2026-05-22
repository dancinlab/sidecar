#!/bin/sh
# paper — arxiv-style LaTeX paper scaffolder (sidecar skill+command).
# Verbs: new <slug> | sample <slug> | fig <size> <prompt> <out.png>
#      | compile [dir] | list | help
#
# `new`     copies template/ → ./<slug>/
# `sample`  copies samples/sample-nb-bcs-absorbed/ verbatim → ./<slug>/
# `fig`     delegates to _tools/fal_gen.sh (fal.ai gpt-image-2 queue+poll)
# `compile` runs pdflatex × 3 + bibtex in [dir] (default cwd)
# `list`    lists bundled samples

set -eu

ROOT="${CLAUDE_PLUGIN_ROOT:-$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)}"
TEMPLATE_DIR="$ROOT/template"
SAMPLES_DIR="$ROOT/samples"
TOOLS_DIR="$ROOT/_tools"

usage() {
  cat <<'USAGE'
paper — arxiv-style LaTeX paper scaffolder

usage:
  /paper new <slug>                          scaffold ./<slug>/ from template
  /paper sample <slug>                       copy bundled demiurge sample verbatim
  /paper fig <image_size> <prompt> <out.png> fal.ai gpt-image-2 (queue + poll)
  /paper compile [dir]                       pdflatex × 3 + bibtex
  /paper list                                list bundled samples
  /paper help                                this message

image_size: square_hd | landscape_16_9 | portrait_16_9 | square

requirements:
  new / sample : cp · cwd writable · slug not already a directory
  fig          : `secret` CLI on PATH + `fal.api_key` set · curl · python3 · jq-free
  compile      : pdflatex + bibtex (BasicTeX / TeX Live)
USAGE
}

cmd_new() {
  slug="${1:-}"
  if [ -z "$slug" ]; then
    echo "paper new: missing <slug>" >&2; exit 2
  fi
  case "$slug" in
    */*|.*|"") echo "paper new: <slug> must be a simple name (no slashes / no leading dot)" >&2; exit 2 ;;
  esac
  if [ -e "./$slug" ]; then
    echo "paper new: ./$slug already exists — refusing to overwrite" >&2; exit 2
  fi
  if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "paper new: template/ missing at $TEMPLATE_DIR" >&2; exit 1
  fi
  cp -R "$TEMPLATE_DIR" "./$slug"
  echo "[paper] scaffolded ./$slug/ from template"
  echo "        edit main.tex (title · author · sections), references.bib, then \`make\`"
  ls -1 "./$slug"
}

cmd_sample() {
  slug="${1:-sample-nb-bcs-absorbed}"
  case "$slug" in
    */*|.*) echo "paper sample: <slug> must be a simple name (no slashes / no leading dot)" >&2; exit 2 ;;
  esac
  src="$SAMPLES_DIR/sample-nb-bcs-absorbed"
  if [ ! -d "$src" ]; then
    echo "paper sample: bundled sample missing at $src" >&2; exit 1
  fi
  if [ -e "./$slug" ]; then
    echo "paper sample: ./$slug already exists — refusing to overwrite" >&2; exit 2
  fi
  cp -R "$src" "./$slug"
  echo "[paper] copied bundled sample → ./$slug/ (demiurge sample-nb-bcs-absorbed verbatim)"
  ls -1 "./$slug"
}

cmd_fig() {
  if [ $# -lt 3 ]; then
    echo "paper fig: usage: /paper fig <image_size> <prompt_file> <out.png>" >&2; exit 2
  fi
  if [ ! -x "$TOOLS_DIR/fal_gen.sh" ]; then
    echo "paper fig: $TOOLS_DIR/fal_gen.sh missing or not executable" >&2; exit 1
  fi
  if ! command -v secret >/dev/null 2>&1; then
    echo "paper fig: \`secret\` CLI not on PATH (needed for fal.api_key)" >&2
    echo "  install: hx install secret  # or git clone https://github.com/dancinlab/secret" >&2
    exit 1
  fi
  exec "$TOOLS_DIR/fal_gen.sh" "$@"
}

cmd_compile() {
  dir="${1:-.}"
  if [ ! -d "$dir" ]; then
    echo "paper compile: $dir is not a directory" >&2; exit 2
  fi
  if [ ! -f "$dir/main.tex" ]; then
    echo "paper compile: $dir/main.tex not found" >&2; exit 2
  fi
  if ! command -v pdflatex >/dev/null 2>&1; then
    echo "paper compile: pdflatex not on PATH (install BasicTeX / TeX Live)" >&2; exit 1
  fi
  if ! command -v bibtex >/dev/null 2>&1; then
    echo "paper compile: bibtex not on PATH" >&2; exit 1
  fi
  ( cd "$dir" \
    && pdflatex -interaction=nonstopmode -halt-on-error main.tex \
    && (bibtex main || true) \
    && pdflatex -interaction=nonstopmode -halt-on-error main.tex \
    && pdflatex -interaction=nonstopmode -halt-on-error main.tex )
  echo "[paper] built $dir/main.pdf"
}

cmd_list() {
  if [ ! -d "$SAMPLES_DIR" ]; then
    echo "(no samples bundled)"; return 0
  fi
  echo "[paper] bundled samples (under $SAMPLES_DIR):"
  for s in "$SAMPLES_DIR"/*/; do
    [ -d "$s" ] || continue
    name=$(basename "$s")
    first_line=""
    if [ -f "$s/README.md" ]; then
      first_line=$(awk 'NR==1{sub(/^# */,""); print; exit}' "$s/README.md")
    fi
    printf "  %s\t%s\n" "$name" "$first_line"
  done
}

verb="${1:-help}"
shift 2>/dev/null || true
case "$verb" in
  new)     cmd_new     "$@" ;;
  sample)  cmd_sample  "$@" ;;
  fig)     cmd_fig     "$@" ;;
  compile) cmd_compile "$@" ;;
  list)    cmd_list    "$@" ;;
  help|-h|--help|"") usage ;;
  *) echo "paper: unknown verb '$verb'" >&2; usage; exit 2 ;;
esac
