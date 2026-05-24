---
description: /atlas <args> — runs `hexa atlas "$@"` (atlas SSOT surface; SSOT = compiler/atlas/embedded.gen.hexa, served at runtime by static_atlas via TEXT-parse). Read forms — hash · stats [--audit [--scope=rodata|overlay|merged] [--format=json]] · lookup <id> · lookup <K> <id> (K ∈ P|C|L|E|F|R|S|X|Q) · lookup --prefix=<p> · dump [K] [--json]. Write form — register --from-verify <fn> <n> <v> (or <fn> <a> <b> <v> 2-op) · register --from-drill --seed "<text>" [--rounds N] [--engine mk9|mk10] (folds the verified node DIRECTLY into embedded.gen.hexa — no rebuild, no staging shard, no intermediate; commit with normal git to share). Export form — export [--out PATH] (writes live atlas as a portable .n6, default n6/atlas.n6 — export artifact only, NOT the runtime SSOT).
argument-hint: "<hash | stats [--audit] | lookup [K] <id> | dump [K] | register --from-verify <fn> <n> <v> | register --from-drill --seed \"...\" | export [--out PATH]>"
allowed-tools: Bash
---

!`hexa atlas $ARGUMENTS`
