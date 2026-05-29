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

@D deck_rtsc_emitter := "RTSC QE el-ph emitter — anchor substitution + PSL 1.0.0 branch" :: tech [required active]
  do   = "spec keys {anchor, press, q_grid, soc?, sscha?} → 4 files emit"
  do   = "vc-relax.in: ibrav=0 + CELL_PARAMETERS from anchor · press in kbar"
  do   = "scf.in: post-relax cell · ecutwfc 80 · ecutrho 800 · occupations smearing methfessel-paxton"
  do   = "ph.in: q_grid (e.g. 4x4x4) · alpha_mix 0.3 · el_ph_sigma 0.005 · electron_phonon='simple'"
  do   = "run.sh: source ~/miniforge3/etc/profile.d/conda.sh + conda activate qe (detached env loss 방지 · MEMORY ref)"
  do   = "pseudo: PSL 1.0.0 (scalar = .UPF · soc=true → .rel-pbe-spnl-rrkjus_psl.1.0.0.UPF full-rel branch)"
  do   = "sscha=true → append SSCHA driver script + minimize.in (anharmonic loop)"
  dont = "deck cd /root/<dir>/ hardcode — use staged path · run.sh: cd \"$(dirname \"$0\")\" relative"
  dont = "scalar pseudo when soc=true (relativistic spin-orbit needs full-rel UPF)"

@D deck_d16_dry_run := "d16 governance — pool free dry-run BEFORE cost-bearing rent" :: hint [required active]
  do   = "post-emit hint: `pool on ubu-1 'cd <deck-dir> && pw.x -i scf.in 2>&1 | head -50'` (1-iter syntax check)"
  do   = "catches QE directive / basis / pseudo path errors before paid GPU pod rent (d16)"
  do   = "deck preflight: `hexa cloud preflight --kind dft-phonon --atoms <N> --nq <Q>` (closed-form mem-budget)"
  dont = "emit deck then immediately fire cost-bearing rent without dry-run (d16 violation · $ leak)"
  dont = "skip preflight on dense q_grid (single-pod-feasible check → d11 governance)"

@D deck_stub_domains := "chem/chip/bio/nuclear/material — stub for now, TODO emit body" :: status [active]
  do   = "stub domain prints `🍞 deck: <domain> emitter is TODO — RTSC first impl only` and exits 1"
  do   = "stub roster maintained in `stdlib/deck/gen.hexa` domain manifest (single SSOT)"
  do   = "graduation path — add `emit_<domain>()` fn in `stdlib/deck/gen.hexa` + flip manifest from stub→full"
  dont = "fake stub emit (write empty files · pretend success) — d6 honest"
  dont = "duplicate emitter code outside `stdlib/deck/gen.hexa` (d3 single canonical home)"
