#!/usr/bin/env sh
# wilson-guards :: PreToolUse hook (v0.0.0 SCAFFOLD — STUB)
#
# Receives the Claude Code PreToolUse hook payload as JSON on stdin
# (tool_name, tool_input, cwd, ...). A real guard inspects it and may
# DENY via stdout:
#   {"hookSpecificOutput":{"hookEventName":"PreToolUse",
#     "permissionDecision":"deny","permissionDecisionReason":"..."}}
# or exit code 2.
#
# STATUS: this is a deliberate PASSTHROUGH. It never denies — emitting fake
# blocks would mislead users (dishonest). Real predicate sourcing is one of:
#   1. harness-rpc  — call wilson's harness-rpc (JSONL) for a specific
#      guard plugin action and translate its verdict to permissionDecision.
#   2. standalone   — port the wilson guard predicates (dangerous-path /
#      SSOT append-only / domain-lint) here directly, no wilson binary dep.
# Decision tracked in repo README "Status".
#
# TODO(sidecar): implement the chosen path; until then, allow (exit 0).

cat >/dev/null   # drain stdin
# sidecar control: this plugin is already a passthrough stub, so the
# /sidecar guards toggle is a no-op until guards becomes a real guard.
exit 0
