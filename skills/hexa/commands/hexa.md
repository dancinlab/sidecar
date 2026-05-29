---
description: /hexa <verb> [args...] — generic passthrough to the hexa CLI (runs `hexa $ARGUMENTS`). Use for any hexa verb without a dedicated wrapper (run · build · test · parse · check · bench · qrng · sim-universe · qmirror · loop · tool · status · …). For hot-path verbs prefer /kick /atlas /verify /cloud; check signatures with /hexa-help. Dedicated-wrapper verbs (cloud·deck·kick·atlas·verify) are refused + redirected to their dedicated skill (no opt-out).
argument-hint: "<verb> [args...]"
allowed-tools: Bash
---

!`a="$ARGUMENTS"; set -- $a; v="$1"; case " $a " in *"deck/gen.hexa"*) echo "⛔ /hexa does not proxy the deck generator — use /deck (preserves spec-json · preflight · local stdlib path)."; exit 0;; esac; case "$v" in cloud) echo "⛔ /hexa does not proxy 'cloud' — use /cloud (cloud-guard · pods-route · preflight).";; kick|drill) echo "⛔ /hexa does not proxy 'kick'/'drill' — use /kick.";; atlas) echo "⛔ /hexa does not proxy 'atlas' — use /atlas (SSOT register guards).";; verify) echo "⛔ /hexa does not proxy 'verify' — use /verify.";; *) hexa $a;; esac`
