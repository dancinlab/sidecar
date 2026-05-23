---
description: Atomic ship tail — stage explicit paths + credential-scan + commit + push origin/<branch> + sidecar sync. Bump ALL version surfaces FIRST (plugin.json · marketplace.json · README · CHANGELOG) per @D g22; then /ship -m "<msg>" <path>...
argument-hint: "-m \"<commit message>\" <path> [<path>...]"
allowed-tools: Bash
---

!`H="$(command -v _ship.hexa)"; hexa run "$H" $ARGUMENTS`
