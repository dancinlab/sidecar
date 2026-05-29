---
name: deck
description: /deck <domain> <slug> '<spec-json>' — 🍞 도메인 input deck 빵틀 generator. Thin wrapper around `hexa-lang stdlib/deck/gen.hexa`. RTSC QE el-ph first impl (4 files emit — vc-relax.in · scf.in · ph.in · run.sh; spec = anchor · press · q_grid · sscha? · soc?; PSL 1.0.0 pseudo auto-download branch on `soc`). Output dir = exports/<domain>/decks/<slug>/. chem/chip/bio/nuclear/material stub (TODO). Generic dispatch (d4) — domain routing by manifest, no per-domain hardcoding. Preflight estimate reported after emit. d16 pool ubu-1 free dry-run hint before cost-bearing rent. Triggers — '/deck', '빵틀', 'deck-gen', 'input deck 생성', 'bake deck', '빵 굽기', 'deck 만들어', 'cooking deck'.
allowed-tools: Bash, Read, Edit, Write, Skill
---

@D deck := "도메인 input deck 빵틀 generator (`hexa stdlib/deck/gen.hexa` thin wrap)" :: skill [required active]
  do   = "/deck <domain> <slug> '<spec-json>' → emit 4 files (vc-relax.in · scf.in · ph.in · run.sh)"
  do   = "domain routing: rtsc=full QE el-ph emitter · chem/chip/bio/nuclear/material=stub (TODO)"
  do   = "output dir = exports/<domain>/decks/<slug>/ · 4-file size + preflight estimate report"
  do   = "generic dispatch (d4) — domain key looked up in manifest · no per-domain hardcoded class"
  dont = ".in 수작업 작성 (use /deck 빵틀 · provenance + reproducibility) · raw scp dispatch"
  dont = "per-domain dispatcher / branch on domain name in the generic layer (d4 violation)"
  dont = "stub domain emit pretending full (d6 honest — stub = stub, surface TODO)"
