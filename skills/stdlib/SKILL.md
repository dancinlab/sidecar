---
name: stdlib
description: hexa-lang stdlib SSOT helper (commons @D g61 — stdlib is the single source of truth for shared code, primitives AND domain engines). `/stdlib check` scans the current repo for g61 violations — abs-path cross-repo `.hexa` imports (anima-locked) + local fn names duplicating a hexa-lang stdlib `pub fn`. `/stdlib promote <file>` prints the move-to-stdlib + thin-shim runbook (engine⊥adapter; the phi_native / IIT4 #1051 flow). Bare = check. Triggers — "/stdlib", "stdlib check", "stdlib 승격", "promote to stdlib", "stdlib 중복", "공용 라이브러리로".
allowed-tools: Bash
---

@D stdlib := "hexa-lang stdlib = single SSOT for shared code (g61) — scan + promote" :: skill
  do   = "`check` (bare) = scan cwd repo: abs-path cross-repo .hexa imports + local fn ∩ stdlib pub fn dups · `promote <file>` = stdlib 이전+thin-shim 런북 (engine⊥adapter)"
  do   = "재사용 primitive/engine 은 stdlib/<domain>/ 한 곳 · caller 는 import \"stdlib/…\" (thin shim/adapter)"
  dont = "primitive/engine 을 repo 마다 재구현 · anima-locked abs-path import of shareable code · stdlib fork"
