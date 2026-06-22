---
description: /hexa <args> — passthrough to the `hexa` CLI (native-compiled atlas-aware language toolchain — prover · linker · strict-lint · science stack). Any subcommand — `hexa cloud`, `hexa dojo`, `hexa deck`, `hexa verify`, `hexa atlas`, … — runs via `/hexa <sub> …`. Triggers — "hexa 실행", "hexa 돌려", "hexa <sub>", "run hexa", "/hexa".
argument-hint: "<subcommand> [args]"
allowed-tools: Bash
---

!`command -v hexa >/dev/null 2>&1 && hexa $ARGUMENTS || echo "hexa CLI not found — install dancinlab/hexa-lang (~/.hx/bin/hexa on PATH)"`
