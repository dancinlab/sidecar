#!/bin/sh
# cloud — wrap `hexa cloud` (runpod dispatch · structured argv).
# Per commons g8: canonical subcommand form. Don't fall back to the
# separate `hexa-cloud` binary (that's the upstream gap — paper-over
# violates g11).
# Upstream patch: hexa-lang/inbox/patches/hexa-cloud-subcommand.md
exec hexa cloud "$@"
