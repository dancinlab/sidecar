#!/usr/bin/env bash
# Pi-compat QA — reproducible. Runs the jiti extension-load check then the A–F harness
# against the GLOBAL `sidecar` binary. Exit 0 only if every case passes.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
node "$HERE/load-test.mjs"
node "$HERE/qa.mjs" "$(command -v sidecar)"
