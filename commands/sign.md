---
description: /sign [<key>|list|check <key>|clear [<key>]] — user-consent gate. A GPU-pod rent (`hexa cloud rent|up`) is BLOCKED until the HUMAN mints a one-shot token via the TUI bang `!sidecar sign rent`; list/check/clear are agent-safe, minting is human-only. Triggers — "sign", "렌트 승인", "consent token", "/sign".
argument-hint: "[<key>|list|check <key>|clear [<key>]]"
allowed-tools: Bash
---

⚠️ Minting a token is HUMAN-ONLY. To authorize a GPU-pod rent, type the bang directly in the
prompt: `!sidecar sign rent` — the `!` bang bypasses the tool guard. Running `/sign rent`
(or `sidecar sign rent` as a tool call) is DENIED by design (SIGN-SELF-MINT). This delegator is
for the agent-safe verbs: `list` · `check <key>` · `clear [<key>]`.

!`command -v sidecar >/dev/null 2>&1 && sidecar sign $ARGUMENTS || echo "sidecar CLI not found — install dancinlab/sidecar (~/.sidecar/cli + ~/.local/bin/sidecar on PATH)"`
