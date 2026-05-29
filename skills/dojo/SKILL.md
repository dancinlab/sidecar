---
name: dojo
description: /dojo <domain> <slug> '<spec-json>' [--lang=hexa|py|both] — 🥋 cloud training-job 빵틀 generator. Thin wrapper around `hexa-lang stdlib/dojo/cli.hexa`. deck(DFT input deck)의 학습 형제 — spec-json → job.hexa(.hexa 드라이버) + train.py(.py HF Trainer 페이로드) + run.sh(.sh 글루) emit. Output dir = exports/<domain>/dojo/<slug>/. --lang=hexa|py|both (default both). llm full impl · vision/rl/tabular stub (TODO). Generic dispatch (d4). .py/.sh는 제너레이터 write_text emit-string 산출물 (hexa-native 가드 범위 밖 · deck run.sh emit 동일 원리). Triggers — '/dojo', '학습 빵틀', 'dojo-gen', 'training job 생성', 'cloud 학습 굽기', 'dojo 만들어', 'train job 빵틀'.
allowed-tools: Bash, Read, Edit, Write, Skill
---

@D dojo := "cloud training-job 빵틀 generator (`hexa stdlib/dojo/cli.hexa` thin wrap)" :: skill [required active]
  do   = "/dojo <domain> <slug> '<spec-json>' [--lang=hexa|py|both] → emit job.hexa · train.py · run.sh"
  do   = "domain routing: llm=full HF Trainer causal-LM emitter · vision/rl/tabular=stub (TODO)"
  do   = "output dir = exports/<domain>/dojo/<slug>/ · per-file line count + d16 dry-run hint report"
  do   = "generic dispatch (d4) — domain key looked up in manifest · no per-domain hardcoded class"
  do   = "invoke via `hexa run $HOME/.hx/install/hexa-lang/stdlib/dojo/cli.hexa …` (stdlib hot-swap)"
  dont = "train.py / run.sh 수작업 작성 (use /dojo 빵틀 · emit-string only · spec=SSOT provenance)"
  dont = "per-domain dispatcher / branch on domain name in the generic layer (d4 violation)"
  dont = "stub domain emit pretending full (d6 honest — stub = exit-1 + graduation TODO)"
