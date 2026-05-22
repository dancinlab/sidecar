#!/bin/sh
# secret — wrap the `secret` CLI (macOS Keychain-backed credential CLI).
# Pass args through unchanged. Verbs: get · set · delete · list · service.
# Per sidecar's `secret` skill: prefer direct bash `$(secret get <k>)` for
# tool-invocation patterns to avoid exposing values in conversation context;
# `/secret list|delete|service` are the safe slash-friendly verbs.
if ! command -v secret >/dev/null 2>&1; then
  echo "secret: \`secret\` CLI not on PATH" >&2
  echo "  install: git clone https://github.com/dancinlab/secret ~/core/secret" >&2
  echo "           ln -s ~/core/secret/bin/secret ~/.local/bin/secret" >&2
  echo "  (or: hx install secret — once registry entry lands)" >&2
  exit 1
fi
exec secret "$@"
