#!/bin/sh
# domain — UPPERCASE <DOMAIN>.md (snapshot) + <DOMAIN>.log.md (checkbox log).
# Project-name fallback: if NAME not given, uppercase(basename(project root)).
# Auto-scaffolds both files when missing. Log entries use checkbox tasks:
#   - [x] done step
#   - [ ] pending step
set -eu

# Project root = git toplevel; cwd as fallback
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
DEFAULT_NAME="$(basename "$ROOT" | tr 'a-z-' 'A-Z_')"

usage() {
  cat >&2 <<EOF
usage:
  domain                        Show <PROJECT>.md + .log.md (scaffold if missing)
  domain <NAME>                 Show specific NAME.md + .log.md
  domain <task-text>            Append "- [x] <task-text>" to top log entry
  domain todo <task-text>       Append "- [ ] <task-text>"
  domain done <match>           Flip the first "- [ ] *<match>*" → "- [x] ..."
  domain new <header>           Start a new log entry under header "## <ISO ts> — <header>"

NAME detection: if arg matches ^[A-Z][A-Z0-9_]*$ it's a NAME, else it's a task.
EOF
}

is_name() { echo "$1" | grep -Eq '^[A-Z][A-Z0-9_]*$'; }

iso_ts() { date -u +"%Y-%m-%dT%H:%M"; }

scaffold_snapshot() {
  cat > "$1" <<EOF
# $2 — current state

(edit me — describe current state in completed-form; no history, no changelog inside this file)
EOF
}

scaffold_log() {
  cat > "$1" <<EOF
# $2 — log

Append-only history sister of \`$2.md\`. Each entry starts with \`## <ISO timestamp> — <header>\` (newest on top); body = \`- [x]\` (done) / \`- [ ]\` (pending) checkbox tasks.

EOF
}

ensure_files() {
  NAME="$1"
  SNAP="$ROOT/$NAME.md"
  LOG="$ROOT/$NAME.log.md"
  [ -f "$SNAP" ] || scaffold_snapshot "$SNAP" "$NAME"
  [ -f "$LOG" ] || scaffold_log "$LOG" "$NAME"
}

# Insert a checkbox line at the TOP of the most-recent entry in <NAME>.log.md.
# If no entry yet, create one with header.
append_task() {
  NAME="$1"; MARK="$2"; TEXT="$3"
  LOG="$ROOT/$NAME.log.md"
  ensure_files "$NAME"
  TS="$(iso_ts)"
  # Find line number of the first "## " entry header (newest)
  HEADER_LINE=$(grep -n "^## " "$LOG" | head -1 | cut -d: -f1 || true)
  if [ -z "$HEADER_LINE" ]; then
    # No entry yet — append a new one with the task
    {
      printf '\n## %s — %s\n\n- [%s] %s\n' "$TS" "session" "$MARK" "$TEXT"
    } >> "$LOG"
  else
    # Insert the new task line right after the header (and any blank line)
    python3 - "$LOG" "$HEADER_LINE" "$MARK" "$TEXT" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1])
header_line = int(sys.argv[2])
mark = sys.argv[3]
text = sys.argv[4]
lines = p.read_text().splitlines(keepends=True)
# Insert directly after header (idx = header_line in 1-indexed; insert at idx)
new_line = f"- [{mark}] {text}\n"
insert_idx = header_line  # after the header line
# Skip an immediately-following blank line if present
if insert_idx < len(lines) and lines[insert_idx].strip() == "":
    insert_idx += 1
lines.insert(insert_idx, new_line)
p.write_text("".join(lines))
PY
  fi
}

new_entry() {
  NAME="$1"; HEADER="$2"
  LOG="$ROOT/$NAME.log.md"
  ensure_files "$NAME"
  TS="$(iso_ts)"
  # Find first "## " line and insert new entry BEFORE it; else append
  HEADER_LINE=$(grep -n "^## " "$LOG" | head -1 | cut -d: -f1 || true)
  if [ -z "$HEADER_LINE" ]; then
    printf '\n## %s — %s\n\n' "$TS" "$HEADER" >> "$LOG"
  else
    python3 - "$LOG" "$HEADER_LINE" "$TS" "$HEADER" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1])
header_line = int(sys.argv[2])
ts = sys.argv[3]
title = sys.argv[4]
lines = p.read_text().splitlines(keepends=True)
new_entry = f"## {ts} — {title}\n\n\n"
lines.insert(header_line - 1, new_entry)
p.write_text("".join(lines))
PY
  fi
}

flip_done() {
  NAME="$1"; MATCH="$2"
  LOG="$ROOT/$NAME.log.md"
  ensure_files "$NAME"
  python3 - "$LOG" "$MATCH" <<'PY'
import sys, pathlib, re
p = pathlib.Path(sys.argv[1])
match = sys.argv[2]
text = p.read_text()
# Flip the FIRST "- [ ] ...<match>..." line to "- [x] ..."
pattern = re.compile(r"^- \[ \] ([^\n]*" + re.escape(match) + r"[^\n]*)$", re.MULTILINE)
flipped, n = pattern.subn(r"- [x] \1", text, count=1)
if n == 0:
    print(f"domain: no pending task matching '{match}'", file=sys.stderr)
    sys.exit(1)
p.write_text(flipped)
print(f"flipped: {match}")
PY
}

show() {
  NAME="$1"
  SNAP="$ROOT/$NAME.md"
  LOG="$ROOT/$NAME.log.md"
  ensure_files "$NAME"
  printf '═══ %s ═══\n' "$SNAP"
  cat "$SNAP"
  printf '\n═══ %s ═══\n' "$LOG"
  cat "$LOG"
}

# -- dispatch --

if [ $# -eq 0 ]; then
  show "$DEFAULT_NAME"; exit 0
fi

case "$1" in
  -h|--help) usage; exit 0 ;;
  todo)
    shift
    [ $# -ge 1 ] || { usage; exit 1; }
    # next arg = NAME or text
    if is_name "$1" && [ $# -ge 2 ]; then
      NAME="$1"; shift; append_task "$NAME" " " "$*"
    else
      append_task "$DEFAULT_NAME" " " "$*"
    fi
    ;;
  done)
    shift
    [ $# -ge 1 ] || { usage; exit 1; }
    if is_name "$1" && [ $# -ge 2 ]; then
      NAME="$1"; shift; flip_done "$NAME" "$*"
    else
      flip_done "$DEFAULT_NAME" "$*"
    fi
    ;;
  new)
    shift
    [ $# -ge 1 ] || { usage; exit 1; }
    if is_name "$1" && [ $# -ge 2 ]; then
      NAME="$1"; shift; new_entry "$NAME" "$*"
    else
      new_entry "$DEFAULT_NAME" "$*"
    fi
    ;;
  show)
    shift
    if [ $# -ge 1 ] && is_name "$1"; then
      NAME="$1"
    else
      NAME="$DEFAULT_NAME"
    fi
    show "$NAME"
    ;;
  *)
    # Single arg: is it a NAME or a task?
    if is_name "$1" && [ $# -eq 1 ]; then
      show "$1"
    elif is_name "$1" && [ $# -ge 2 ]; then
      NAME="$1"; shift; append_task "$NAME" "x" "$*"
    else
      # default: append as done task to project file
      append_task "$DEFAULT_NAME" "x" "$*"
    fi
    ;;
esac
