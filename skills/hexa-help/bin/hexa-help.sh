#!/bin/sh
# hexa-help — wrap `hexa --help` (no arg) or `hexa <verb> --help` (with arg).
# Per commons.tape g7, consult --help for unfamiliar verbs.
if [ $# -eq 0 ]; then
  exec hexa --help
else
  exec hexa "$@" --help
fi
