#!/bin/sh
# cloud — wrap `hexa-cloud` (runpod dispatch).
# Note: hexa-cloud is a SEPARATE BINARY (not a `hexa cloud` subcommand).
# Install: clone dancinlab/hexa-lang and add bin/ to PATH.
# Upstream gap: `hx install hexa-cloud` registry entry pending.
if ! command -v hexa-cloud >/dev/null 2>&1; then
  echo "cloud: hexa-cloud not on PATH" >&2
  echo "  install: clone dancinlab/hexa-lang and add bin/ to PATH" >&2
  echo "  upstream gap: see hexa-lang/inbox/patches/hexa-cloud-path-install.md" >&2
  exit 1
fi
exec hexa-cloud "$@"
