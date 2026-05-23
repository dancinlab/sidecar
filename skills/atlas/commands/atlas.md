---
description: /atlas <args> — runs `hexa atlas "$@"` (atlas SSOT surface). Read forms — hash · stats [--audit [--scope=rodata|overlay|merged] [--format=json]] · lookup <id> · lookup <K> <id> (K ∈ P|C|L|E|F|R|S|X|Q) · lookup --prefix=<p> · dump [K] [--json]. Write forms — append-witness --kind <K> --id <id> {--raw <body> | --stdin} · register --from-verify <fn> <n> <v> [--auto-pr] · register --from-drill --seed "<text>" [--rounds N] [--engine mk9|mk10] [--auto-pr] · register <file.hexa> · pr --staging <file.n6>. PR-only landing per @D g_atlas_binary_builtin.
argument-hint: "<hash | stats [--audit] | lookup [K] <id> | dump [K] | append-witness ... | register --from-{verify|drill|check} ... | pr --staging <file.n6>>"
allowed-tools: Bash
---

!`hexa atlas $ARGUMENTS`
