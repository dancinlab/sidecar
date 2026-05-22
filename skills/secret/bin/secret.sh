#!/bin/sh
# secret — wrap the `secret` CLI (macOS Keychain-backed credential CLI,
# dual-channel sync). Pass args through unchanged.
# Per sidecar's `secret` skill: prefer direct bash `$(secret get <k>)` for
# tool-invocation patterns to avoid exposing values in conversation context;
# slash form is best for management verbs (list / delete / service / set /
# backup status / migrate) that don't return a value.
if ! command -v secret >/dev/null 2>&1; then
  echo "secret: \`secret\` CLI not on PATH" >&2
  echo "  install: git clone https://github.com/dancinlab/secret ~/core/secret" >&2
  echo "           ln -s ~/core/secret/bin/secret ~/.local/bin/secret" >&2
  exit 1
fi
exec secret "$@"
