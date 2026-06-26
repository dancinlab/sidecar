# CHANGELOG

## feat(commons): verdict-integrity slug — terminal 박기 전 측정경로 검증 (anima 세션 실패 로그 포팅)

🗣️ "계속 실수하거나 해매는 부분 어떤식으로 방지할수 있을까" (anima 멀티-에이전트 세션 회고)

- 그 세션의 반복 실패 = **측정 결함을 결론으로 박제**: clm303/ByteGPT G1 FAIL 을 terminal 로 박았다가 (a) OOM 측정-미완 (b) sampler RNG 버그 (c) 엔진↔torch 발산을 모델결함으로 오판 → 3회 철회. 정답지(torch 🟢)와 갈렸을 때 측정이 아니라 대상을 의심한 게 근본.
- `break-walls`("측정 벽을 천장으로 박제 금지")가 이미 있었지만 안 먹힘 — "**발산 = 측정 의심**" 구체 렌즈가 없었던 게 갭. `verdict-integrity` slug 로 1급 체크포인트화: terminal/negative verdict 전에 reference/mirror 발산을 측정경로(sampler·RNG·decode·serialize·OOM·미배선) 의심으로 분류 → `reference-match` 대조로 artifact 배제 후에만 terminal. negative 도 positive 와 동일 검증 바(GREEN 만 검증하고 RED rubber-stamp 금지).
- lean 유지(do/dont 각 cap 내, DODONT-LONG 그린). 기계 게이트(verdict-record 에 integrity 필드 강제)는 heavy follow-on.
## fix(recommend): stop-check 강제(decision:block) 복원 + 정밀화 — auto-proceed 이빨 회복, 에러는 무노이즈

🗣️ "pr cycle 를 자동으로 해야되는데 풀린거 같아 · 자꾸 할지 물어보네" (옵션 B)

- #220 에서 stop-check 를 warn-only 로 바꾸며 auto-proceed **강제 이빨**이 빠졌다(박스에서 멈춰도 그냥 알림만 → 모델이 되묻을 수 있음). 그게 '풀린' 원인. (recommend-default 설정 자체는 정상 = complete·global.)
- B: `decision:block`(강제 재호출) 복원 + **endsOnBox 정밀화**(마지막 ~2 비어있지않은 줄만 검사, 기존 6→2). → 답변이 **진짜 박스/auto-pick 줄로 끝난** 경우만 강제하고, 박스 뒤에 작업/요약이 따라오는 정상 턴은 무발화. 정상 동작 땐 'Stop hook error' 가 안 떠서 #220 의 '에러 노이즈' 우려와 강제를 둘 다 만족.
- 지시문(body() AUTO/FIXED HARD STOP RULE) "remind(advisory)" → "force you to continue" 복원.
- QA: ①진짜 박스로 종료 → 🔒 block ②박스+작업/요약 follow → 무발화(무에러) ③박스 없음 → 무발화 ④stop_hook_active 루프가드 → 무재발화. tsc clean · lint 그린.
## chore(inject): commons·recommend 산문 정리 — 중복/근거 제거 (행동 불변)

🗣️ "전부 산문 정리"

- 매-턴 최대 inject `config/commons.md`(−159B)·`config/recommend.md`(−74B) 에서 순수 rationale·중복 재진술만 제거(ing-board do "직접수정 원칙" · upstream-fix dont "(반복되는 핵심 위반…)"+중복절 · recommend FIXED-AXIS "(user already set this axis…)" 괄호). **행동 지시·규칙·슬러그 전부 보존**(검수 완료).
- 발견: 두 inject 는 이미 do/dont 로 lean → 안전 절감폭 작음(−233B). 진짜 부피는 architecture(트리 ~51KB · 이미 cell-cap 관리).
- 검증: `sidecar lint` 그린 · 행동 불변.
## fix(lint): DODONT-LONG 이 들여쓰기 연속줄까지 합산 — 다중줄 do/dont 길이-cap 회피 차단

🗣️ (anima a_install_canonical 처럼 `- do:` 를 `  ` 연속줄로 쪼개면) "길이 lint 가 안되는거같은데"

- 버그: `dodontEntries` 가 do/dont 길이를 **`- do:` 물리줄 하나(`m[2]`)만** 으로 쟀다. 규칙을 `  ` 들여쓰기 연속줄로 wrap 하면(commons/CLAUDE 양식이 연속줄 허용) 총 내용은 200 초과인데 첫 줄만 짧아 DODONT-LONG 이 안 걸렸다 — 길이 cap 우회.
- fix: do/dont **엔트리** 길이 = `- do:` 줄 + 뒤따르는 모든 `  ` 연속줄 codepoint 합산(blank/다음 do·dont 에서 종료). write-가드 + commit lint 4h 둘 다 자동 반영(같은 `dodontEntries` 공유).
- QA(실작성 재현): 다중줄 do 339자 → ✅ 차단 · write-guard deny ✅ · 실제 anima a_install_canonical(do 279자) ✅ 차단 · 짧은 단일줄·짧은 연속줄(합<200) → 오탐 0 · diff-aware grandfather 유지(기존 줄·sidecar 자기 commons/CLAUDE 무영향, lint 그린). tsc clean.
## chore(ci): disable Blacksmith — sidecar CI 를 표준 GitHub 러너로, 강제 폐기

🗣️ "blacksmith 사용 해제 해줘 sidecar 에서도"

- sidecar 자체 `.github/workflows/ci.yml` `runs-on: blacksmith-4vcpu-ubuntu-2204` → `ubuntu-latest`.
- config 기본 `ci.runner` → `ubuntu-latest` · `ci.enforceRunner` 기본 false. `ci scaffold`/`init` 은 이제 표준 러너로 ci.yml 방출(러너-브랜드 강제·경고 제거).
- **CI-NON-BLACKSMITH lint(4i) 제거** + severity-map 엔트리 제거 + **commons `blacksmith-ci` 규칙 삭제** — Blacksmith 강제 전면 폐기. ci.ts/init.ts/config.ts/ci.yml 의 Blacksmith 문구도 generic 화.
- 검증: tsc clean · 코드/config blacksmith 잔존 0 · `sidecar lint` 그린(toolkit 재생성).

## chore(docs): 플러그인 산문 정리 — 런북·README de-bloat (기능 보존)

🗣️ "sidecar 플러그인 모든 부분 산문 정리"

- 2개 병렬 서브에이전트가 **잘라내기 금지·전 기능 보존** 원칙으로 정리: templates(런북) 3개(sbs −245·fleet-full −298·gap −55 B · §중복 재진술·정당화 산문만 제거, 40-lens·전 step/flag 무손상 · 나머지 15개 이미 crisp) + README −346B(self-hosted reaper·doc-gate·ff-sync 등 narrative 중복 제거 · 기능/lint 표 무손상). docs/*.md 는 이미 lean → 무변경.
- 검증: `sidecar lint` 그린 · 기능/명령/플래그 커버리지 손실 0.
## fix(recommend): stop-check warn-only — 'Stop hook error' 제거 (decision:block → stderr advisory)

🗣️ "hook error 안뜨고 처리되게 가능?"

- `recommend stop-check` 가 4축 박스에서 끝난 턴을 감지하면 `decision:block` 으로 모델을 강제 재호출했는데, Claude Code 가 이를 매번 **"Stop hook error"** 로 표시 — 노이즈. convergence/ing staleness 와 동일하게 **warn-only(stderr `[recommend]` advisory · non-block)** 로 전환 → 에러 표시 사라짐.
- auto-proceed 강제는 매-턴 recommend inject 의 FIXED-axis 지시(BEHAVIORAL MANDATE)가 이미 담당. stop-check 는 깔끔한 넛지 백스톱으로 남음(force-re-invoke 제거).
- 지시문 문구 정정: `body()` 2곳 "force you to continue" → "remind (advisory · non-block)".
- 검증: tsc clean · 스모크(박스로 끝난 transcript → exit 0 · stdout decision 0건 · stderr `[recommend]` advisory) · `sidecar lint` 그린.
## docs(CLAUDE.md): inject-lint 규칙 — inject 잘라내기 금지, 작성 시 각자 lint

🗣️ "잘라내면 안되고, 각 inject 별 작성할때 lint 가 있어야되 · CLAUDE.md 에 명시(기존 양식 따라가는 경향)"

- 루트 CLAUDE.md 에 `## inject-lint` 섹션(do/dont) 추가 — 각 inject 소스는 **작성·편집 시점에 자기 lint**(INJECT-OVERSIZED 개별 cap 또는 do/dont·ARCH-cell 양식)로 lean 유지, **emit/런타임 잘라내기(truncate·tail-cut) 절대 금지**(내용 손실). 새 inject 엔 그 lint 도 함께 추가.
- 미래 작업이 기존 양식을 따라 capTail 류 절단을 재도입하지 않게 규칙으로 박제(#215 회귀 방지).
- 검증: do/dont 양식·DODONT-LONG(≤200) 통과 · `sidecar lint` 그린.
## feat(lint): inject별 개별 cap 맵 — 각 inject 가 자기 lint 를 가짐 (공유 cap → per-inject)

🗣️ "inject 되는 전체가 아니라 각각이 lint 여야 · 각각 lint 가 있어야함"

- `INJECT-OVERSIZED` 를 단일 공유 cap(`injectByteCap`)에서 **inject별 개별 budget 맵**(`lint.injectCaps`: path→bytes · `/` 끝나면 그 dir `*.md` 각각)으로 전환. 기본 `config/recommend.md`=7000·`styles/`=각 9000·`.harness/prefs.json`=2000. 각 inject 가 자기 cap 으로 개별 검사 → 비대가 그 inject 단위로 잡힘.
- prefs inject(.harness/prefs.json) 갭 닫음(이전엔 lint 없음). commons.md/CLAUDE.md/ARCHITECTURE.json 은 각자 **format lint**(do/dont·do/dont·ARCH-cell-cap)가 그들의 inject lint — cross-repo governance 라 크기가 정당히 변해 byte-cap 대신 형식 규율. → **모든 inject 가 각자 lint 로 덮임**.
- 검증: tsc clean · per-inject 스모크(recommend.md 를 자기 7000 초과시→그 파일만 INJECT-OVERSIZED, 복원시 그린) · `sidecar lint` 그린.
## fix(easy): emit-시점 꼬리절단(capTail) 철회 — inject 는 lint 로 강제, 런타임 손실 금지

🗣️ "뒷부분 커팅은 절대 · lint 가 필요한거지" — emit 절단은 주입 내용을 조용히 버리는 손실이라 폐기.

- PR #215 의 `easy.ts:capTail`(emit 시점 꼬리 절단) 제거 — easy inject 는 다시 문서 전체를 주입. 런타임 절단은 매 턴 내용 손실이라 부적합.
- `INJECT-OVERSIZED` lint 스코프를 `config/recommend.md` + `styles/*.md` 로 복원(#214 동작) — inject 비대는 **소스를 lean 하게 유지하도록 작성자에게 강제**(block)하는 게 올바른 해법. commons.md 면제 유지.
- 현재 styles 5개 + recommend 전부 cap(9000) 이하라 그린. 검증: tsc clean · capTail 잔재 0 · `sidecar lint` 그린.
## feat(easy): emit-시점 꼬리 자동절단(capTail) — inject 를 budget 으로 컷, 수동 트림 불필요

🗣️ "그냥 컷팅하면안되 뒷부분" — inject 비대를 소스 손질이 아니라 emit 절단으로.

- `easy inject` 가 (header+body)를 `lint.injectByteCap`(9000) 바이트로 emit 시점에 절단(`easy.ts:capTail`) — easy 문서는 머리=행동규칙(7-요소·ASCII 템플릿), 꼬리=expendable 레퍼런스라 꼬리만 잘리고 규칙은 항상 보존. 줄 경계로 컷 + 절단 마커, 전체 문서는 디스크 유지. 소스가 커져도 매-턴 주입은 자동으로 budget 이하.
- `INJECT-OVERSIZED` lint 스코프를 `config/recommend.md` 로 한정 — recommend 는 꼬리에 핵심 규칙(default-mode·hard-stop)이 있어 자동절단 불가라 소스-크기 lint 가 적합. `styles/*.md` 는 emit 자동절단되므로 lint 면제(commons.md 도 면제 유지).
- 검증: tsc clean · capTail 유닛(12389B→1492B·줄경계·마커) · easy inject 유효 JSON · `sidecar lint` 그린.
## feat(lint): INJECT-OVERSIZED — 매-턴 inject 소스 바이트 cap + easy 스타일 산문 −31%

🗣️ "ai agent 에 inject 하는것들도 전부 lint · context 낭비 줄여야 · 산문 간결하게"

- 새 lint **INJECT-OVERSIZED**(block): 매 UserPromptSubmit 재주입되는 inject 소스(`config/recommend.md` + `styles/*.md`)의 바이트 ≤ `lint.injectByteCap`(기본 9000 · 0=off). 산문 비대는 매 턴 context 로 치르는 낭비라 cap. `commons.md` 는 면제(거버넌스 SSOT — rule 수에 따라 정당히 커지고 do/dont 양식 lint 별도).
- easy 응답스타일 5개 로케일(ko/ja/zh/en/ru) 에서 **순수 레퍼런스 3블록**(FOLD vs WEAVE 표 · 일반인 추가예시 2개 · 측정축 eval 표) 제거 — 행동 규칙(7-요소 패턴·ASCII 4템플릿·체크리스트·반례)은 보존. 합계 42065B→29227B(**−31%**), 매 턴 주입되는 ko 7807→5411B.
- 동형 패턴(config 키·severity-map block)으로 cmdDescCap/archCellCap/dodontCap 과 일관. 검증: tsc clean · `sidecar lint` 그린.
## feat(architecture): ARCH-BIG-CELL cap 700→300 (config-driven) + 22개 산문 셀 커널 트림

🗣️ "아키텍쳐 json 도 중요한 내용만 딱딱 남기도록 / 너무 산문인데" — 설계 트리 셀이 700자 cap 아래에서도 문단 덩어리로 남던 문제.

- `architecture lint` 의 셀 길이 cap 을 **700→300**(`lint.archCellCap` · config-driven · 0=off)으로 조이고 piled-item cap 도 `lint.archPiledMax`(6)로 config 화 — cmdDescCap/dodontCap 와 동형. 의미: 산문/메커니즘/precedent 는 트리가 아니라 CHANGELOG/git/코드에 살고, 트리 셀엔 커널만(single-doc c4).
- sidecar 자기 ARCHITECTURE.json 의 **over-300 셀 22개 전부 트림**(max 658→≤300): claudemd·convergence·ci·toolkit·companions·architecture·naming-guard·plugin·imagine·ship·pool·fleet full·… 각 노드를 그 노드가 무엇인지 + 핵심 메커니즘 1–2개로 압축, @convergence precedent·파일ref·괄호 디테일은 제거(git/CHANGELOG 보존). diff = 22 치환만(재포맷 0).
- 검증: tsc clean · `architecture lint` ok · `sidecar lint` 그린(22→0) · median 셀 31자 유지.
## feat(lint): CMD-DESC-LONG — 플러그인 커맨드 description 미니멀 cap (write+commit 강제)

🗣️ "sidecar 내부에 구현된 플러그인 커맨드 주입등등도 전부 미니멀화 lint 적용" — CLAUDE.md/commons do/dont 미니멀화의 연장.

- 새 lint 규칙 **CMD-DESC-LONG**(block): `commands/*.md`(·SKILL.md) frontmatter `description:` 의 codepoint 길이가 `lint.cmdDescCap`(기본 320) 초과면 차단. 기존 1400자 `SKILL-DESC-CAP`(Claude Code skill-listing 천장 = 인지가 죽는 기술적 상한)과 **별개의 빡빡한 '미니멀' 선** — 하는 일+`Triggers —` 만 두고 플래그표/서브버브 카탈로그는 body/`--help`/`argument-hint` 로 내린다.
- 2층 동형 강제(dodontCap 패턴 그대로): write-time deny(`shadow.ts:descWriteViolation`→`pre.ts`, blockRule 구분) + commit-time(`lintCommandDescriptions`→lint 4f) + `severity-map`(block) + config 키 `lint.cmdDescCap`(0=off).
- "전부 미니멀화" 지시대로 grandfather 없이 **기존 17개 over-cap description 전부 트림**(max 1468→ ≤320; sbs·fleet-full·paper·ship 등). 의미+Triggers KO/EN 보존, 카탈로그는 `argument-hint`/`--help`/모듈에 이미 존재.
- 주입 SSOT(commons·recommend-axes·easy 등)는 의도적으로 verbose 한 거버넌스 원문이라 범위 제외(이미 source 에서 do/dont 로 미니멀화 + 별도 강제).
- 검증: tsc clean · `sidecar lint` 그린(17→0) · write-guard 스모크(over-cap→CMD-DESC-LONG deny · under-cap→통과) · `toolkit write` 71 엔트리 재생성.
## feat(commons): do/dont 양식 강제를 루트 CLAUDE.md 로 확장 (B — 전 섹션 do/dont-only)

🗣️ "양식으로 무조건 고정해줘 ## SLUG, do, dont" + "B" (commons.md + 루트 CLAUDE.md 전 섹션 do/dont-only)

- 기존: COMMONS-PROSE/NO-DODONT/DODONT-INCOMPLETE 양식 강제가 commons.md 전용. 유저 선택 B = **루트 CLAUDE.md(프로젝트 규칙 SSOT)도** 각 `## <slug>` 섹션을 do/dont-only(둘 다 필수·산문 금지)로 잠금.
- 수정 (modules/commons.ts): `commonsWriteViolation` 스코프에 `isRootClaudeMd` 추가(rel="CLAUDE.md") · `lintCommonsFormat` 가 commons 뒤 루트 CLAUDE.md 도 `lintCommonsText` 로 스캔. 첫 `## ` 앞 preamble 은 면제(lintCommonsText `cur===null`) · **서브폴더 CLAUDE.md**(folder-docs)는 자유양식이라 제외(루트만).
- 2층 강제 동형 유지: write-time deny + commit-lint 4g backstop · 코어 `lintCommonsText` 공유.
- sidecar 자기 루트 CLAUDE.md 는 이미 호환(preamble + `## 작업 규칙` do/do/dont) → 무수정 통과.
- 검증: tsc clean · 스모크 — 현 lint 그린 · 루트 CLAUDE.md 산문 ## 섹션 Write→deny · preamble-only→통과 · 서브폴더 CLAUDE.md 산문→면제.
## feat(lint): `CI-NON-BLACKSMITH` 게이트 — 비-Blacksmith CI 러너 차단 (commons blacksmith-ci 이빨)

🗣️ "claude.md 도 … 강제해줘 lint" (commons `blacksmith-ci` 를 기계적으로 강제)

- 신규 lint 검사 4i (modules/lint.ts): staged `.github/workflows/*.yml` 의 `runs-on:` 값이 `blacksmith-*` 가 아니면 `CI-NON-BLACKSMITH` **block**(github-hosted `ubuntu-latest`·`macos-*` 등). commons `blacksmith-ci`(직전 추가)의 always-on 규칙에 commit-time 이빨을 붙임.
- 정밀: `${{ }}` 표현식(matrix/var)은 정적 미해결이라 skip · `runs-on: [a, b]` 배열은 라벨별 검사 · 줄 끝 `# 주석` 무시.
- 토글: config `ci.enforceRunner` — 기본 강제(undefined/true), `false` 면 per-repo off (canonical 토글 패턴 · 인라인 탈출구 없음). severity-map `CI-NON-BLACKSMITH=block`(번들 + .harness).
- 검증: tsc clean · 매치 로직 스모크(ubuntu-latest→block · blacksmith-*→OK · `${{matrix}}`→skip · 배열 혼합→비-blacksmith만 flag · 주석 무시) · 현재 트리 lint 그린(sidecar ci.yml=blacksmith).
## feat(commons): `blacksmith-ci` 규칙 추가 — CI 는 항상 Blacksmith 러너

🗣️ "commons 기록해줘 CI 는 Blacksmith CI 사용"

- 거버넌스 SSOT(config/commons.md)에 새 slug `blacksmith-ci` 추가: do=CI 워크플로는 항상 `runs-on: blacksmith-*`(`sidecar ci scaffold`/`init` 이 표준 ci.yml 방출 · 검증=`sidecar ci` · 러너=config `ci.runner`), dont=github-hosted 러너(`ubuntu-latest`·`macos-*`) 사용·repo 마다 CI 손작성·비-blacksmith override(Apple-native 필요시 `blacksmith-*-macos-15`).
- always-on 규칙이라 전 repo 세션에 매 턴 주입 — `ci scaffold`/`init`(직전 사이클) 의 기본 Blacksmith 러너를 governance 로 못박음.
- do 줄이 처음 207자라 자기 자신의 DODONT-LONG cap(200)에 걸려(dogfood), 디테일을 빼 줄여 통과.
## feat(ci): 하네스가 모든 repo 에 Blacksmith CI 를 scaffold — `ci scaffold` + `init` 자동방출

🗣️ "ci 플러그인 필요해 blacksmith 이용하도록 hexa-lang 참고" + "init 에도 반영" + "sidecar 하네스로 모두 ci 를 blacksmith 로 구축" + "ci 는 항상 blacksmith 로"

- sidecar 는 CI 워크플로가 전무했다. dancinlab 의 Blacksmith 전환(hexa-lang `release.yml` · gamebox `ci.yml`)을 정답지로, **하네스가 어느 repo 든 Blacksmith CI 를 표준 방출**하게 일반화.
- 신규 `ci scaffold [--force]` (modules/ci.ts): **Blacksmith** `.github/workflows/ci.yml` 생성(create-if-absent) — checkout@v6 → **stack setup**(config `ci.setup` · 없으면 package.json→node·hexa.toml→hexa·pyproject→python 자동감지) → sidecar 설치(install.sh) → **`sidecar ci`**(repo verify.checks · single source) + `sidecar lint`. 러너=config `ci.runner`.
- **항상 Blacksmith**: 기본 러너 `blacksmith-4vcpu-ubuntu-2204`, 생성 YAML 은 github-hosted 러너를 절대 안 씀 · config 가 비-blacksmith 로 override 하면 경고.
- `init` 배선: `ciWorkflowYaml`/`defaultCiSetup` export → `sidecar init` 이 동일 생성기로 `.github/workflows/ci.yml` 자동 scaffold(create-if-absent). 새 repo 는 init 만으로 Blacksmith CI 획득.
- config: `ci: { runner, setup }` 블록 + `CiStep` 타입 추가(lib/config.ts).
- sidecar 자기 repo 는 손튜닝 ci.yml(= `sidecar ci`(tsc) + help/toolkit 스모크) 유지(dogfood reference).
- 검증: tsc clean · 생성 YAML yaml.safe_load 유효(runs-on=blacksmith · 6 steps) · help 로드 · `ci scaffold`(기존파일 skip-warn) · toolkit 71.

🗣️ "ci 플러그인 필요해 blacksmith 이용하도록 hexa-lang 참고" (+ gamebox CI 도 blacksmith 전환중)

- sidecar 는 그동안 CI 워크플로가 **전무**했다. dancinlab 의 Blacksmith 전환 흐름(hexa-lang `release.yml` · gamebox `ci.yml`)을 정답지로 `.github/workflows/ci.yml` 신설.
- Blacksmith = `runs-on:` 라벨 드롭인(특수 액션 불필요). sidecar 는 순수 TS/node 라 macOS 불필요 → 더 싼 **`blacksmith-4vcpu-ubuntu-2204`**(hexa-lang x86_64 잡과 같은 glibc 안정 floor).
- 잡 `verify`: checkout@v6 → setup-node@v4(node 20·npm cache) → `npm ci` → ① **`sidecar ci`**(canonical = harness.config.json verify.checks = `tsc --noEmit`, 로컬 게이트와 single source) ② **help-smoke**(전 모듈 import + HELP 리터럴 빌드) ③ **toolkit 카탈로그 drift 검사**(`toolkit write` 후 `TOOLKIT.jsonl` diff 0). push(main/master)·PR·dispatch · concurrency cancel-in-progress · timeout 15m.
- 검증: YAML 유효 · 잡 1개(verify) · 로컬 `sidecar ci`(tsc) GREEN · help-load GREEN · TOOLKIT 카탈로그 100%.


## fix(commons): do/dont 길이 cap scope 정정 — 루트 CLAUDE.md 포함, 서브폴더만 자유양식

🗣️ "CLAUDE.md 도 자유양식 금지인데, 서브폴더 CLAUDE.md 만 자유양식"

- 정정: 직전 변경이 CLAUDE.md 전체를 cap scope 에서 빼버린 과잉이었다. 올바른 구분 — **루트 CLAUDE.md**(프로젝트 규칙 SSOT · do/dont 사용)는 규율 대상, **서브폴더 CLAUDE.md**(folder-docs 로컬 가이드)만 자유양식.
- 수정 (modules/commons.ts): `isRootClaudeMd(filePath)` 추가(REPO_ROOT 상대경로가 정확히 `CLAUDE.md` 일 때만 true) → `dodontInScope` = commons.md + 루트 CLAUDE.md. 서브폴더(`modules/CLAUDE.md` 등)는 false. lint.ts 4h staged 필터도 `f === "CLAUDE.md"`(루트)만 포함.
- 검증: tsc clean · 스모크 — 루트 CLAUDE.md 긴 새 do줄→block · 서브폴더 modules/CLAUDE.md 긴 do줄→통과 · config/commons.md→block · lint ok.


## fix(commons): do/dont 길이 cap 을 commons.md 전용으로 — CLAUDE.md 는 자유양식(scope 제외)

🗣️ "do , dont 를 안쓰는데" (anima·hexa-lang CLAUDE.md 는 do/dont 형식 미사용)

- 배경: `DODONT-LONG` 길이 cap 이 commons.md **+ CLAUDE.md** 를 scope 로 잡았는데, folder-docs 규칙상 CLAUDE.md 는 **자유양식("do/dont 강제 아님")**이다. do/dont-전용 길이 cap 을 자유양식 문서에 거는 건 모순 — repo 의 CLAUDE.md 가 do/dont 를 아예 안 쓰면(anima 등) 무의미하고, 캐주얼하게 `- do:` 를 써도 오발동.
- 수정: `dodontInScope`(modules/commons.ts) 에서 CLAUDE.md 분기 제거 → **commons.md(config/ 또는 .harness/ override) 전용**. lint.ts 4h 의 staged 필터도 `base==="CLAUDE.md"` 제거. write-가드·commit-lint 양쪽 일치.
- 불변(이미 맞았음): COMMONS-NO-DODONT/INCOMPLETE/PROSE(둘 다 필수+산문금지)는 처음부터 commons.md 전용이라 CLAUDE.md 무관.
- 결과: CLAUDE.md = 완전 자유양식(do/dont 길이 규제 0) · commons.md 는 do/dont-only + cap 유지.
- 검증: tsc clean · 스모크 — CLAUDE.md 긴 `- do:` 줄 Write → 통과 · config/commons.md 긴 do줄 → 여전히 DODONT-LONG block · lint ok.


## feat(naming-guard): 비표준 이름 파일 터치 시에도 발동 (생성 BLOCK + 터치 WARN)

🗣️ "_v2 등 네이밍 관련도 생성말고도 터치시에도 발동되게"

- 배경: 네이밍 가드가 **새 생성**(Write/Edit 새 이름·Bash mv/cp/touch/mkdir)만 막아, 이미 `_v2`/`_final`/`_copy` 로 커밋된 **기존 backlog 는 터치해도 무발동**이었다(`sidecar naming audit` 수동 스캔으로만 보임). anima/hexa-lang 세션 마이닝 + 유저 요청.
- 추가 (modules/pre.ts): **터치-시 warn-only 넛지**.
  - `preWrite`: 대상이 **이미 존재**하는 비표준-이름 파일이면 block 대신 `emitWarn`(`NAMING-TOUCH-VERSION-SUFFIX`) — 기존 파일 편집을 막지 않고(고칠 수 있게) rename 을 권고. **새 생성**(미존재)은 기존대로 BLOCK 유지.
  - `preTouch`(Read): `offendingToken(basename(file_path))` 로 비표준 이름이면 warn — 읽을 때마다 표면화돼 backlog 가 눈에 띈다(컨버전스-온-터치 발상 · warn-only).
- `offendingToken` 재사용(naming-guard 와 동일 판정) · `namingGuard` 토글 게이트 · `@canonical-ok` 면제 그대로.
- 검증: tsc clean · 스모크 4축 PASS — Read 비표준→warn · Read 정상→silent · Edit 기존비표준→비차단+warn · Write 새비표준→block.


## fix(convergence): stop-check 를 warn-only(non-block) 로 — 매 턴 'stop hook error' 제거

🗣️ (유저가 반복되는 Stop hook error 를 지적) — advisory 넛지가 매 턴 턴을 막는 결함.

- 원인: convergence stop-check 가 `decision:block`(모델 강제 재호출)로 구현돼, 에이전트가 기능을 설명하며 재발어(또·발생·재발·버그…)를 쓸 때마다 Stop 훅이 매 턴 'stop hook error' 로 표면화 + 턴을 막았다. **advisory 인데 blocking** 이 root cause.
- 수정: `ing staleness-check` 와 동형의 **warn-only(stderr · non-block)** 로 전환 (`modules/architecture.ts`). decision:block 발행 제거 → 넛지는 stderr 로만 표면화, 턴을 막지 않음. 에이전트가 보고 진짜 재발이면 스스로 기록(자동 기록 아님). stop_hook_active 루프가드는 불필요해져 제거(비차단이라 재진입 루프 없음).
- 키워드 넓은 그물 + 신호별 once-가드는 유지. 문서(ARCHITECTURE·README·help) lockstep.
- 검증: tsc clean · 스모크 PASS — stdout 비어있음(에러 안 뜸) · stderr warn 표면화 · exit 0.


## feat(convergence): 재발 트리거 넓은 그물화 — 단독어 추가 + once-가드 신호별 격상

🗣️ "오탐되도 무조건 작동하는건 아니잖아? ai agent 가 판단하는거 아냐?"

- 통찰(유저): 트리거 매치는 `decision:block` **넛지**일 뿐 자동 기록이 아니다 — 진짜 재발이냐는 **에이전트가 판단**(기록 or 무시). 따라서 키워드는 **넓은 그물**이어도 되고, 정밀도는 에이전트가 담당. (앞 사이클의 "오탐 폭증" 우려는 과대평가였음 — 정정.)
- 키워드 확장 (`config/convergence-triggers.json`): 단독어 `또`·`다시`·`실패`·`동일`·`실수` 추가 (복합어와 병존). recall 우선.
- **once-가드 신호별 격상** (`modules/architecture.ts`): 기존 "세션(transcript)당 1회" → **"신호별 1회"**(transcript+matched 패턴 키). 넓은 키워드의 유일한 실구멍 — 초반 오탐 `또`("또는")가 세션의 단일 넛지를 **소진**해 뒤의 진짜 `segfault` 재발을 가리는 문제 — 를 제거. `convergence-nudge.json` 이 `{transcript, seen:[...patterns]}` 로 누적, 각 distinct 신호가 세션당 1회 독립 발화.
- 넛지 문구도 "자동 기록 아님 · 오탐이면 무시" 를 명시(에이전트 판단 강조).
- 검증: tsc clean · 신호별 가드 스모크 PASS — 같은 transcript 에 `또`+`재현됐`+`segfault` → 1·2·3차가 각각 다른 신호로 발화, 4차 silent(셋 다 소진). 오탐 `또` 가 진짜 신호를 소진하지 않음 확인.

## feat(convergence): 에이전트-출력 재발 트리거 복원 — Stop 훅이 응답을 스캔 → SSOT 기록 넛지

🗣️ "폐기된 컨버전스 플러그인 처럼 트리거도 있어야될듯" + "내가 입력하는게 아니라 ai agent 가 뱉는 에서 트리거"

- 배경: 옛 `convergence` 모듈에 `convergence-recurrence` 트리거(또·재발·회귀·segfault·panic·🔴…)가 있었으나 `prompt-scan`(=user 입력)에 걸려 있었고, `#189` 이 모듈을 폐기하며 touch-time 주입으로 대체 → `#192`(841b27c)가 그 주입마저 끔. 결과: 재발-기록 트리거가 **전무**. 유저 핵심 정정 — 트리거는 user 입력이 아니라 **AI 에이전트의 응답 출력**을 스캔해야 한다.
- 복원 (새 surface): `architecture convergence stop-check` — Stop 훅이 transcript 의 **마지막 assistant 메시지**를 읽어(=`recommend stop-check` 와 동일 리더 `lastAssistantText`, 이제 export) 재발-신호 키워드로 스캔. 매치 시 `decision:block` 으로 세션당 1회 깨워 SSOT(`architecture convergence add`) 기록을 넛지. 인라인 @convergence 마커(폐기)가 아니라 ARCHITECTURE.json `convergence.records[]` 한곳으로 (commons root-cause).
- 데이터-주도: 패턴은 엔진 하드코딩이 아니라 `config/convergence-triggers.json`(per-repo `.harness/` override) — "rules=data" 원칙. 옛 recurrence 패턴 충실 복원 + 힌트만 SSOT 명령으로 갱신.
- 가드: 루프=네이티브 `stop_hook_active` · 재넛지 억제=transcript별 `convergence-nudge.json`(세션당 1회) · 무매치/파싱실패 silent. warn-only 성격(재발 키워드는 오탐 잦음 → 첫발생·일반언급이면 무시 가능 안내 포함).
- 배선: Stop 훅 3곳 lockstep — 글로벌 `~/.claude/settings.json` · 번들 `hooks/hooks.json`(plugin) · `setup.ts`(install-hooks). help 라인 + ARCHITECTURE Stop 노드 갱신.
- 검증: tsc clean · 스모크 4축 ALL PASS — HIT(재발/segfault→block 넛지+matched 표면화) · once-가드(동일 transcript 재호출→silent) · 무매치(silent) · stop_hook_active(silent).

## feat(commons): do/dont 길이 cap + 사용 강제 — archive_sidecar tape-lint #2 포팅 (commons.md + CLAUDE.md)

🗣️ "archive_sidecar 보면 do, dont 길이 강제 lint 있는데 우리도 CLAUDE.md, commons 용 필요" + "do, dont 사용도 강제"

- 배경: 옛 `dancinlab/archive_sidecar` 의 `tape-lint` 플러그인(`hooks/tape-lint/bin/_tape_lint.hexa`)이 `commons.tape`/`project.tape` 의 `@D` do/dont 값을 100자 cap + diff-aware 로 게이트했다. 우리는 `.tape`→`commons.md`(Markdown) 로 옮겼으므로 그 등가물을 우리 가드 인프라(`commons.ts` + `lint.ts`)에 포팅 (정답지 직접 정독·reference-match). 아카이브를 `/Users/mini/dancinlab/archive_sidecar` 에 clone (자주 참고).
- 길이 cap (`modules/commons.ts`): `- do:`/`- dont:` 줄 codepoint 길이가 `lint.dodontCap`(기본 200, config-driven, 0=off) 초과면 게이트. **diff-aware** (tape-lint #2 충실 포팅) — slug|kind|idx 키로 baseline 과 비교해 **새로/더 길어진 줄만** 차단, 기존 긴 줄은 grandfather (줄이면 통과). 한글=1자 카운트(`[...s].length`).
  - 2층 배선: ① write-가드 `dodontLengthWriteViolation`(`pre.ts` PreToolUse Write) — 전체-content Write 조기 hard-DENY (baseline=on-disk) · ② commit-lint 4h(`lint.ts`) — staged commons.md/CLAUDE.md 를 HEAD 와 비교(diff-aware) → Write·Edit 모두 커버(write-가드는 Edit 조각의 slug 키를 못 잡으므로 commit 이 백스톱). 둘 다 `DODONT-LONG` block.
- do/dont 사용 강제 (`lintCommonsText`): 기존엔 섹션에 do/dont 가 **둘 다 없을 때만**(`COMMONS-NO-DODONT`) 잡았는데, 한쪽만 있으면 통과했다. 이제 **둘 다 필수** — do 또는 dont 한쪽만 있으면 `COMMONS-DODONT-INCOMPLETE` block. (commons.md 는 do/dont-only 설계라 적용 · CLAUDE.md 는 folder-docs 자유양식이라 길이 cap 만.)
- config: `lib/config.ts` `lint.dodontCap`(기본 200) · severity-map 에 `DODONT-LONG`/`COMMONS-DODONT-INCOMPLETE` = block.
- 검증: tsc/import clean · 현재 트리 `sidecar lint` ok(소급 위반 0 — 전 commons 섹션이 do+dont 둘 다 보유) · QA — newOverCapDodont 6축(grandfather/grown/shrunk/new-over/new-short/한글-codepoint) ALL PASS · format INCOMPLETE 3축 · write-가드 3축(over=block·unchanged=allow·CLAUDE) · commit-lint diff-aware 통합(staged 300자 줄 → DODONT-LONG block) ALL PASS.

## feat(recommend): 4축 auto-proceed 기계적 백스톱 — Stop 훅 `recommend stop-check` (박스에서 멈추면 강제 진행)

🗣️ "4축 선택사항 뜰때 auto pick 진행이 잘안되네 autopick 이라고는 뜨는데 자동진행 강화가 좀더 필요"

- 진단: auto/fixed-axis 모드의 auto-proceed 는 **전부 프롬프트 지시문**(`defaultDirective()`)뿐이라 강제력이 없었다 — 모델이 박스 + `🤖 ... auto-pick` 줄을 그리고 그대로 턴을 끝내는 게 재발(박스가 "멈출 지점"으로 학습됨). advisory(systemMessage)는 모델을 다시 깨우지 못해 실효 없음 → 모델을 이어가게 하는 유일한 메커니즘은 Stop `decision:block`.
- 신규(`modules/recommend.ts` `stop-check`): Stop 훅이 마지막 assistant 메시지를 읽어 **박스에서 끝났는지** 판정(`endsOnBox` — 실제 auto-pick 마커가 있고 + 트레일링 ~6줄에 박스/auto-pick 줄 잔존) → 비-present 모드면 `{"decision":"block","reason":…}` 출력해 모델을 강제로 깨워 챔피언 실행. 루프 가드는 **네이티브** — CC 가 주는 `stop_hook_active` 플래그로 체인당 1회만(마커파일 불필요). present 모드(박스에서 멈춤이 정답)·박스없음·작업수행후 요약은 모두 no-op. 파싱/IO 실패는 silent no-op(세션 못 막게).
- Layer 1(지시문 강화): fixed/auto directive 에 `⛔ HARD STOP RULE` 추가 — "답변의 마지막은 반드시 실제 작업(도구호출/변경/결과)이지 박스가 아니다 · 백스톱이 강제한다" 명시(recency).
- 배선: `hooks/hooks.json` + `modules/setup.ts`(install-hooks settings.json 미러) Stop 배열에 `recommend stop-check` 를 staleness-check 앞에 추가(둘 다 실행 · staleness 는 warn-only stderr).
- 검증: tsc clean · help 로드 OK · QA 5축 ALL PASS — ①박스종료+complete=block ②stop_hook_active=no(루프가드) ③작업수행=no ④박스없음=no ⑤present모드=no · inject 에 HARD STOP RULE 실림 확인.

## chore(convergence): 파일-터치 시 학습 주입 비활성화 (주석 처리 · 효용 불확실)

🗣️ "이건 근데 애매하다 / 주석처리로 기능 꺼줘"

- 동기: 유저 — `convergenceForFile` 의 파일-터치(Read/Write/Edit) 시점 학습 주입이 매-터치 노이즈/토큰 대비 효용이 불확실(애매). 삭제가 아니라 주석으로 꺼서 손쉽게 재활성 가능하게.
- 변경(`modules/pre.ts`): `preWrite` 의 convergence 주입 블록 + `preTouch` 본문 + `convergenceForFile` import 를 주석 처리. `preTouch` 는 no-op 로 남겨 Read 훅 매처가 무해. store(`convergence.records[]`)·CRUD(`architecture convergence`)·`lintConvergenceRecords`(커밋 게이트)·매-턴 inject 제외는 그대로 유지 — 주석 해제 한 줄로 재활성.
- 검증: tsc clean · `pre write`/`pre touch` 무음(주입 OFF) 확인 · lintConvergenceRecords 0 issue · convergenceForFile 함수 보존.

## fix(architecture): 매-턴 inject 에서 convergence 배열 제외 — 토큰 재주입 −21KB/턴

🗣️ "토큰이 빨리 소진되는데 injection 중복/재주입 체크해줘"

- 진단(실측): 주입 레이어 **중복은 없음**(전역 `~/.claude/settings.json` 1곳 · repo `.claude` 없음 · settings.local 훅 없음 · 플러그인 훅 0 → INIT-INJECT-DUP 재발 아님). 토큰 누수는 매 UserPromptSubmit 재주입 **볼륨**(~82KB/턴)이고, 그 중 `architecture inject` 가 압도적(~59KB). 직전 convergence SSOT 이관으로 records 18.5KB(ARCHITECTURE.json의 40%)가 매 턴 통째 재주입되며 악화.
- 픽스(`modules/architecture.ts` inject): 매-턴 주입 스냅샷에서 `convergence` 키를 제거(parse→delete→stringify) — records 는 파일-터치 시 `convergenceForFile` 로 타깃 주입되므로 매 턴 통째 실을 이유가 없음. 한 줄 `(convergence: N record(s) omitted …)` 표기만 남김. show/lint/CRUD/터치주입은 그대로 records 사용. invalid-JSON 이면 raw fallback.
- 효과: architecture inject 60KB→39KB (**−20.9KB/턴 · 35%↓**). tsc clean · inject 출력에 records 없음 확인.
- 별건(전역 훅 stale): `~/.claude/settings.json` Stop 에 폐기된 `convergence due-check` 잔존(`||true` 로 삼켜짐) → self-update 후 `install-hooks --global` 재싱크로 제거.

## feat(architecture): convergence 레코드 CRUD 이빨 — `architecture convergence {list|add|rm|edit}`

🗣️ "add remove edit 도 할수 있게 명령어 세팅 되잇나?"

- 동기: 유저 — convergence 모듈 폐기 후 재발학습이 ARCHITECTURE.json `convergence.records[]` 단일 SSOT 에 살지만, 추가/삭제/수정이 손-JSON편집뿐이었다. CLI 이빨을 architecture 모듈에 붙임.
- 신규(`modules/architecture.ts`): `sidecar architecture convergence {list|add|rm|edit}` — id-keyed · `add`=upsert(같은 id 면 update-in-place) · `edit <id> [--state|--value|--threshold|--source]` 부분 패치 · `rm <id>` · `list`. state 는 enum 검증(불량 거부). value/threshold 의 셸 특수문자는 `--value -`(또는 `--threshold -`)로 stdin 읽기(ing `--stdin` 패턴 동형). 쓰기는 ARCHITECTURE.json 파싱→records 교체→재기록(나머지 트리 보존).
- 배선: cli help line(architecture) 갱신 · TOOLKIT 재생성. HELP 리터럴 백틱은 HELP_NO_RAW_BACKTICK 학습대로 작은따옴표로 회피(lint HELP-BACKTICK 0).
- 검증: tsc clean · help 로드 · 임시 repo CRUD 라운드트립(add·upsert·edit·list·rm) PASS · invalid state 거부 · 변이 후 JSON valid.

## refactor(convergence): 모듈 폐기 → 재발학습을 ARCHITECTURE SSOT 로 + 파일-터치 시점 주입 (architecture 모듈 강화)

🗣️ "컨버전스 모듈 제거하고 / 아키텍쳐 모듈을 강화 / ai agent 가 특정파일 터치할 때마다 inject"

- 동기: 유저 — 재발방지 학습이 코드 인라인 `@convergence` 마커로 흩어져 있던 것을 single-doc(ARCHITECTURE SSOT) 한곳으로 옮기고, scan/Stop-nudge 기반 convergence 모듈을 폐기. 대신 에이전트가 그 파일을 만질 때 그 자리에서 학습을 보여주는 타깃 주입으로 대체.
- 이관: 25개 코드파일의 인라인 `@convergence` 마커 36개 + split-marker 1개(ARCH_INJECT_IGNORED) = **37개 학습을 ARCHITECTURE.json 최상위 `convergence.records[]`**(id·state·value·threshold·source)로 구조 이관 후 인라인 마커 전량 strip. 트리 위생 lint(ARCH-*)는 이 배열을 제외(자체 validator 보유).
- 모듈 폐기: `modules/convergence.ts` + `commands/convergence.md` 삭제 · 전 배선 제거(cli import/dispatch/help · lint scan+commit-gate · prompt-scan 캡처토큰 · post resolve · setup/hooks Stop due-check · config.ts lint.convergence+issuesFile · severity CONVERGENCE-MISSING · keywords 2 rule).
- architecture 모듈 강화(`modules/architecture.ts`): `lintConvergenceRecords()`(커밋 게이트 — id+유효 state · `CONVERGENCE-MALFORMED` block) + `convergenceForFile(path)`(그 파일의 학습 포맷). PreToolUse 배선 — `pre write`(Write|Edit)에 주입 + 신규 `pre touch`(Read 매처) → 파일 터치마다 매칭 학습 stderr 주입(학습 없으면 무음).
- SSOT lockstep: commons `root-cause`(인라인 마커→ARCHITECTURE convergence store) · ARCHITECTURE(convergence 모듈 노드 제거 + architecture 노드에 store child + paper/naming 노드 piled 분해) · README · modules/CLAUDE.md · #188 이 main 에 남긴 invalid-JSON(`version\d+` bad escape) 동반 수정(그동안 tree-lint 가 catch→[] 로 전부 skip 되던 잠복결함 해소).
- 검증: tsc clean · `architecture lint` ok(분해 후) · `toolkit check` in-sync(71) · 전 JSON valid · `lintConvergenceRecords` 37 well-formed · 훅 스모크: `pre write` modules/ship.ts→SHIP_PROPAGATE · `pre touch` naming-guard.ts→NAMING_VERSION_SUFFIX · README.md(학습 0)→무음.

## fix(naming): audit/guard 오탐 정밀화 — 생태계-native 이름은 면제 (native-canonical-first)

🗣️ cross-repo 감사 결과 생태계-native 이름이 대량 오탐됨 — Android 리소스 한정자 `mipmap-anydpi-v26`·`values-v26`, `gtk_version.zig`/`adw_version.zig` 같은 `_version` 모듈명, `archive/`·`.verdicts/` 내부 이력 파일. 정석을 강제하는 도구가 정석을 오탐하면 native-canonical-first 위반.

- 공유 regex(`naming-guard.ts` · guard+audit 동시 적용): `version\d*`→`version\d+` (bare `_version`·`version.ts` 는 canonical 파일명이라 면제 · `version2` 만 위반) + 신규 `PLATFORM_NATIVE` 면제(`^[a-z][a-z0-9]*(-[a-z0-9]+)*-v\d{2,}$` = Android res 한정자 `-v<API>`).
- audit 경로 무시(`naming.ts`): `archive/`(의도된 frozen 이력)·`.verdicts/`(전이 로그·preserve-state 가 state/ 로 별도 이관) 트리는 naming 부채가 아니라 wholesale 스킵.
- 검증: tsc clean · 오탐 5종 모두 null(Android 한정자·`_version`·`version.ts`) · 진짜 위반 유지(`model_v2`·`utils_old`·`config copy`·`V10`·`src_v10`) · guard bash detector 회귀 없음(`mv→model_v2.ts` 차단 · `mkdir res/values-v26` 통과) · 경로무시 정확.

## feat(naming): repo 전수 비-canonical 이름 audit 명령 — write-guard 의 backlog 짝 (canonical-naming 강제)

🗣️ "리포들이 거버넌스 규칙대로 단순·일관·canonical·native naming 지키도록 강제 메커니즘 강화" (A) + "감사결과는 각 repo ING 에만" 

- 동기: 유저 — canonical-naming/native-canonical-first 규칙이 repo 들에서 실제로 지켜지게 강제. 기존 write-time `naming-guard` 는 **새** 파일(`foo_v2.ts`)만 Write/Edit/bash 에서 차단할 뿐, 이미 커밋된 **backlog**(`config copy.json`·`utils_old.ts`·`model_v2/`)는 보지 못하는 갭이 있었다.
- 신규 `modules/naming.ts` (`sidecar naming audit [path] [--ing] [--gate]`): `git ls-files` 트리를 전수 스캔해 버전/복사/중복 접미사 이름을 보고. 판정은 naming-guard 의 `offendingToken` 을 **export 해 재사용**(가드와 audit 이 동일 기준 — drift 없음). 기본 read-only(exit 0) · `--gate`=위반 시 exit 1(commit/CI 게이트) · `--ing`=요약 1줄을 **그 repo 자기 ING** 보드에 add(보드=내 repo 전용 · cross-repo 전달 없음 — 직전 `--to` 폐기와 정합). cross-repo 감사는 각 repo 안에서 이 명령을 돌려 그 repo ING 에 착지(B).
- 배선: `cli/index.ts`(import+dispatch+help) · `commands/naming.md`(슬래시 노출) · ARCHITECTURE(naming 모듈 노드) · README(명령표) · TOOLKIT.jsonl 재생성(72엔트리).
- 검증: tsc --noEmit clean · `toolkit check` in-sync · sidecar 자기 audit=194 이름 전부 canonical(clean) · 임시 repo: dir+file 위반 3건 정확 탐지·`--gate` exit 1·`--ing` 로컬 보드 착지 PASS.

## refactor(ing): cross-repo 전달(`--to <repo>`) 기능 폐기 — 보드는 내 repo 전용 (직접수정 원칙)

🗣️ "ing 를 타세션에 넣는 기능은 폐기하자. 직접 수정원칙이니까"

- 동기: 유저 — ING 의 cross-repo 전달(`ing add --to <repo>`)이 commons `upstream-fix`(막힌 그 세션에서 내 손으로 직접 고친다)와 정면 모순. 떠넘김 경로 자체를 없애 직접수정 원칙을 구조적으로 강제.
- 제거(`modules/ing.ts`): `--to` 인자 파싱·형제 repo ing ref 쓰기 경로 전체 삭제 · `from` 필드 + show/inject 의 `📥<from>` 표면화 제거 · `--to` 전용으로만 존재하던 upstream-fix 차단 가드(`@convergence upstream-fix-handoff`)·`loudFail`/`basename` import 동반 제거. `add`/`next` 는 stdin/argv 텍스트 경로만 남김(잔여 `--to` 토큰은 이제 리터럴 텍스트 — silent forward 없음).
- 가드 문구(`modules/handoff-guard.ts`): HANDOFF.md/INBOX.md/inbox/*.md 차단 메시지에서 `--to <repo>` 안내 제거 → 로컬 `sidecar ing add <text>` 로만 유도.
- SSOT lockstep: commons `ing-board`(보드=내 repo 전용)·`upstream-fix`(`--to` 폐기 명시) · ARCHITECTURE.json(ing 모듈 노드 2곳) · README · `templates/sbs.md`(handoff carrier (b) = cross-repo 인계 안 함) · `commands/ing.md`·`commands/sbs.md` · help line + `config/keywords.json` 힌트 + `lib/config.ts` 주석 + `_tools/gen_commands.py` · TOOLKIT.jsonl 재생성(71엔트리·in-sync).
- 검증: tsc --noEmit clean · `toolkit check` in-sync · 전 JSON valid · 임시 repo 라운드트립(add/show/done by-id) PASS · 실보드 show/inject 회귀 없음.

## feat(commons): native-canonical-first 규칙 — 정석(native·canonical) 방식 최우선 + 위반 발견 시 개선

🗣️ "commons 에 강화해줘 => native, canonical 방식 최우선, 위반 발견시 개선"

- 동기: 유저 — 구현·해결 시 생태계의 native·canonical(정석) 경로를 1순위로 쓰고, 작업 중 비정석 우회(기존 위반)를 발견하면 그 자리에서 고치라는 always-on 거버넌스 원칙을 commons SSOT 에 박음.
- 신규 slug `native-canonical-first`(canonical-* 패밀리 옆 배치):
  - do: native primitive/내장/관용 패턴 우선 → 없을 때만 직접 구현(정답지 있으면 `reference-match`) → 발견한 기존 위반은 surgical 범위 내 즉시 native 로 개선(묻어두지 않음).
  - dont: native 있는데 재구현 · canonical 위 불필요 wrapper/shim/shadow/fork · 비정석 우회 방치(발견하고도 미개선) · `@root-cause-ok` 없이 native 회피 정당화.
- 기존 규칙과 경계: `canonical-cli`(정해진 명령 사용)·`canonical-naming`(이름)·`reference-match`(정답지 대조)·`root-cause`(증상 아닌 원인)와 겹치지 않게 **구현 방식 자체의 원칙**으로 한정 — commons 29개 규칙.
- 검증: `commons show` 새 규칙 렌더 · do/dont-only 게이트 통과 · `commons inject` 유효 JSON emit.

## fix(recommend): FIXED-AXIS 행동명령 front-load — 고정축 선택이 박스에서 멈추던 회귀

🗣️ "진행중 추천4축 질의시에 선택이 있으면 선택으로 바로 진행되도록 해줘" (선택 = standing 고정축)

- 증상: `recommend set-default complete`(또는 임의 고정축)인데 4축 박스만 그리고 멈춤 — auto-proceed 안 됨. #183 이 `/sbs` 에서 고친 박스-then-stop 증상이 recommend 본체에도 그대로 남아 있었다.
- 진단(근본원인): FIXED-AXIS 문구가 "박스 그려라"(★표시·4줄 렌더)를 **먼저**, "AUTO-PROCEED(decide, do NOT wait)"를 **뒤에** 두는 순서라, 모델이 박스를 그린 뒤 턴을 종료/대기하는 쪽으로 떨어졌다. prose 순서가 행동을 지배.
- 픽스(#183 의 front-load 패턴을 recommend 에 적용): 행동명령을 **맨 앞으로** — "선택(standing 고정축)이 이미 있으니 박스는 정보용일 뿐 멈춤 지점이 아님 → 같은 턴에 그 champion 으로 바로 실행, 박스에서 턴 종료 금지·'진행할까요?' 금지·재선택 대기 금지", 그 다음에야 박스를 trade-off 가시화용으로 렌더. `config/recommend.md` r4(스펙 carrier) + `modules/recommend.ts` `defaultDirective()`(매 턴 주입 디렉티브) 둘 다 lockstep 갱신.
- 검증: `recommend show`=새 front-load 문구 렌더 · `resolve-mode`(sbs 상속) 무변경(inherit complete / explicit manual) · `inject` 유효 JSON emit.

## fix(sbs): AUTO 모드 행동배너 front-load — 고정축(완성도) 자동진행이 런북 prose 에 묻히던 회귀

🗣️ "sbs go 했을 때 recommend 에 완성도로 고정해뒀는데 자동진행이 안 된다"

- 증상: `recommend set-default complete` (FIXED 완성도)인데 `/sbs` 가 라운드별로 사용자에게 묻는 MANUAL 식으로 동작. 자동 auto-pick 이 안 됨.
- 진단(근본원인): 결정적 레이어는 멀쩡했다 — `recommend resolve-mode` 가 `mode: auto (complete forced) ← inherited` 를 정확히 출력하고 전역 CLI 도 최신이었다. 문제는 그 다음, agent 가 받는 **런북 전문의 프레이밍**: `mode: auto` 결론 바로 아래에 거대한 §1 파싱-우선순위 벽글 + §2 "한 번에 하나씩 물어"(MANUAL) 프레이밍이 지배하고, AUTO 의 "즉시 auto-pick·일시정지 없음"은 sub-bullet 로 파묻혀 있었다. agent 가 prose 를 skim 하며 지배적 MANUAL 프레이밍으로 떨어졌다.
- 픽스(CODE 가 권위 — sidecar resolver-first 철학): `resolveMode` 가 이제 `{mode,axis,weights,source}`(`SbsResolution`)를 **반환**(기존 print 출력은 그대로 — `recommend resolve-mode` CLI 후방호환). `modules/sbs.ts` 가 그 반환값으로 분기해 `mode==="auto"` 면 런북 본문 **위에** 🤖 AUTO 행동배너를 front-load: "매 라운드 즉시 auto-pick·라운드별 질문 없음·유일 일시정지=합의화면 1회·아래 §2 의 대기 묘사는 MANUAL 용이니 auto-pick 으로 치환해 읽어라". 모델 해석을 제거하고 행동명령을 코드로 박았다(prose 수정이 아니라 — prose-skim 이 실패원인이므로 prose 만 고치는 건 근본해결이 아님).
- 배너 포맷: 고정축이면 `<완성도(complete)> 축 forced`(상속 시 `← recommend-default 상속`), 가중치 spec 이면 `4축 가중평균(<weights>)`. MANUAL 은 배너 미출력(clean).
- 검증: `help` 로드 · `recommend resolve-mode go` 출력 **무변경**(후방호환) · `sbs go`→AUTO 배너 front-load(complete inherited) · `sbs manual`→배너 없음 · 엣지 `auto:complete=2,simple=3`(가중치 early-return 경로)·`auto:safe`(명시 단일축) 배너 정확.

## feat(paper): publish lifecycle — Zenodo REST (DOI) + arXiv submission package, keys via secret

🗣️ "paper 명령에 arxiv·zenodo 배포·수정·삭제를 붙여라 — 키는 secret CLI 연결"

- 동기: 유저 — `paper` 가 scaffold→build→cover 까지였는데 배포 surface 가 없었다. 배포(publish)·수정(update)·삭제(unpublish) 전체 수명주기를 도구에 박아 손-제출 회귀를 없앰. 자격증명은 commons `git-safety` 대로 `secret` CLI 경유(인라인·로그 금지).
- 정직한 제약(commons honesty): **arXiv 는 프로그래밍 제출 API 가 없다**(SWORDv1 폐지 · web 업로드만) → 자동 제출을 가짜로 만들지 않고, 제출용 tarball 패키징 + 업로드 가이드만 출력. **Zenodo 는 완전한 REST 수명주기** → 실제 배포.
- 신규 verb(`modules/paper.ts`):
  - `publish <slug> --to zenodo|arxiv|both [--sandbox] [--source]` — Zenodo: deposition 생성→main.pdf(+`--source` 면 소스 tarball) 업로드→메타데이터→발행→DOI 발급. arXiv: `arxiv-submission.tar.gz`(main.tex+main.bbl+figures 평탄화) 생성 + https://arxiv.org/submit 가이드.
  - `update <slug> --to zenodo` — Zenodo new-version(상속 파일 삭제→새 빌드 재업로드→재발행 · 버전형 DOI). arXiv 는 재패키징(웹 replace 안내).
  - `unpublish <slug>` — Zenodo DRAFT deposition 삭제. **발행본은 API 삭제 불가**(DOI 영구) → 그대로 보고(가짜 삭제 안 함).
  - `status <slug>` — per-paper 발행 원장(`PAPERS/<slug>/publish.json`) 표시.
- 메타데이터: PAPER.md `@title` + main.tex `\title`/abstract 추출(LaTeX 스트립·이모지 보존) · 기본값(upload_type=publication · preprint · cc-by-4.0)은 `PAPERS/<slug>/zenodo.json` 으로 per-paper override.
- 키: `secret get zenodo.token`(prod) / `zenodo.sandbox_token`(--sandbox) · 스코프 deposit:write+deposit:actions. 토큰 값은 절대 argv/로그에 안 실림.
- 검증: `paper help`/`paper status __nope__`/`publish`(target 누락 usage) 스모크 · arxiv 패키징 E2E(tarball 내용·publish.json·status 반영) · 메타 추출 regex 실측(이모지 보존·latex 제거) · **Zenodo sandbox 라이브 실증**(create 201→upload 201→metadata 200→delete-draft 204 = unpublish 경로 일치 · draft 깨끗이 삭제 · 잔존물 0).

## feat(commons+ing): upstream-fix teeth — block forwarding a defect fix to an upstream repo

🗣️ "hexa-lang 막히면 ING로 떠넘기지 말고 그 세션에서 직접 다 고쳐라 — 규칙을 강화하고, 떠넘기기 자체를 명령에서 막았다"

- 동기: 유저 — 에이전트가 hexa-lang upstream 결함을 자꾸 `ing add --to hexa-lang` 으로 인계하려 함. commons `upstream-fix` 가 이미 "직접 고쳐라"였지만 약했다 → ① 규칙 강화 ② 실제 차단 이빨.
- commons(`config/commons.md` `upstream-fix`): 문구 강화 — "막힌 그 세션에서 clone/worktree→수정→그 repo 빌드/CI 검증→거기서 `pr-cycle` 머지까지 직접 완료, ING 은 내 repo 의 `↩resume` 메모로만". dont 에 **`ing add --to hexa-lang` 류 결함수정 인계 절대 금지**(반복 위반 명시) + "upstream 이라 못 고친다 핑계" 추가. `ing add --to <repo>` 는 진짜 신규 TODO 전용임을 못박음.
- 이빨(`modules/ing.ts` `add/next --to`): 대상이 upstream(`hexa`/`hexa-lang`/`demiurge`[+`-wt-*`])이고 텍스트가 결함수정(fix·bug·broken·repair·patch·crash·regress·error·fail / 버그·고쳐·막힘·깨짐·에러·오류·실패·수정)으로 보이면 **차단(exit 2)** + 그 세션에서 직접 고치는 절차 안내. 신규 TODO(비-fix 표현)는 통과. opt-out 플래그 없음(no-escape-hatch). `@convergence upstream-fix-handoff` 마커로 박제.
- 검증: `ing add --to hexa-lang "fix broken seed"`/`"시드 깨짐 고쳐줘"` → exit 2 차단·안내 출력 · regex 단위 6/6(en·ko fix=block · `add new deck domain`/타 repo=pass · `hexa-lang-wt-*`=block · `demiurge 오류 수정`=block).

## chore(paper): raise default min-figures floor 4 → 9 (= NeuroLM bar)

🗣️ "결과그림 기본 하한을 정답지(NeuroLM)와 동일하게 9장으로 — 4장은 너무 헐거웠다"

- 동기: 유저 결정 — 직전 사이클에서 둔 result-figure 기본 하한 4를 NeuroLM 정답지의 실제 그림 밀도(9+)에 맞춰 **9** 로 상향. 도구가 "정답지만큼" 요구하게.
- 변경(`modules/paper.ts`): `DEFAULT_MIN_FIGURES` 4 → 9. 게이트 로직·`--min-figures N`(0=해제)은 그대로 — 기본값만 상향. 헤더 주석·PAPER.md 체크리스트(≥9)·usage `defaults` 라인 lockstep.
- 영향: `paper build` 가 기본적으로 결과그림 ≥9 를 요구(미달 exit3). 가벼운 노트/단문은 `--min-figures <N>` 로 낮춰 빌드.
- 검증: `paper help` defaults → `min-figures=9` 노출 · 2-fig 스캐폴드 기본 빌드 → `2 result figs < 9` 로 FAIL(exit3) · `--min-figures 2` → 그림 게이트 통과 확인.

## feat(paper): HARD content-floor gates — ≥10 pages AND ≥4 result figures

🗣️ "논문이 덜 됐으면 빌드를 통과 못 시킨다 — 페이지수도, 결과그림 개수도 강제 (둘 중 하나라도 미달이면 exit 3)"

- 동기: NeuroLM 정답지를 템플릿에 박은 데 이어, 유저 요청 — 결과그림 개수와 페이지수를 **경고가 아니라 하드 게이트**로. 덜 채운 논문이 "빌드 성공"으로 새지 않게 한다.
- 변경(`modules/paper.ts` `build`): ① 페이지 floor 를 경고→**하드 실패**(기존 g51 10p, `pages < min` 이면 return 3). ② **결과그림 게이트 신설** — main.tex 의 `\begin{figure}` 수에서 cover(`\label{fig:cover}`) 를 빼 result-figure 수를 세고 `< min` 이면 실패. 기본 `min-figures=4`(NeuroLM 바=9+). 둘 다 `--min-pages N`/`--min-figures N` 로 조정, `0` 이면 해제. pdfinfo 없으면 페이지 게이트는 측정불가로 skip(명시 로그).
- `new` 배려: 갓 만든 TODO 스캐폴드는 당연히 floor 미달 → 프리뷰 빌드가 `3` 이어도 `new` 는 "컴파일됨·floor 아직 미달(정상)" 안내로 처리하고 0 반환(컴파일 실패 1/2 는 그대로 전파).
- 검증(smoke-paper · 3p·2figs): 기본 빌드 → `content-floor gate FAILED — 3 pages < 10 · 2 result figs < 4` **real exit 3** · `--min-pages 0 --min-figures 0` → PASS exit 0 · `--min-pages 3 --min-figures 2` → PASS. `paper help`/`defaults` 라인에 min-figures 노출 확인.

## feat(paper): NeuroLM quality-target template + bundled reference sample (cover still allowed)

🗣️ "남이 쓴 좋은 논문 한 편(NeuroLM)을 정답지로 옆에 두고, paper new 가 그 구조를 따라 나오게 했다 — 표지는 우리 식대로 허용"

- 동기: 유저가 `paper` 명령을 "참고해서 구현"하라며 가리킨 레퍼런스 = `demiurge/PAPERS/_reference_samples/2409.00101_neurolm.pdf` (NeuroLM, Jiang et al., ICLR 2025 — 제3자 arxiv 논문, 우리가 쓴 게 아님). dancinlab 자작 샘플이 아닌 **외부 품질 정답지**를 sidecar 로 가져와 `paper new` 산출물이 그 바를 따르게 한다.
- 레퍼런스 반입: `templates/paper/_reference_samples/` 에 NeuroLM PDF(22쪽·1.8MB·읽기전용) + 무엇을 보고 맞출지 적은 README 동봉.
- 템플릿(`modules/paper.ts` `mainTexTemplate`) NeuroLM 구조로 교체: 섹션을 Intro(+Contributions) · Background and Related Work · Method · Experiments · Ablation · Discussion · Limitations · Conclusion(+Tier ledger) 로 정렬 · **결과 그림 디스플린** 반영 — TikZ 아키텍처 블록도(Fig.~arch) + pgfplots 막대 결과그림(Fig.~main) 스캐폴드 동봉(캡션=특정 결과 연결). natbib·hyperref·11pt(ICLR류)은 기존 preamble 유지.
- **마케팅/티저 표지 허용**(유저 명시 결정): NeuroLM 은 표지가 없지만 우리는 `cover` verb + `\includegraphics{cover.png}` 를 그대로 둠 — 의도된 로컬 divergence 로 헤더 주석에 명시. `PAPER.md` 체크리스트에 결과그림 ≥6(NeuroLM 바=9+) 추가.
- 검증: 스캐폴드 후 정상 PNG cover 로 `paper build` → `3 pages · 1 refs · 37KB` 컴파일 성공(cover+TikZ+pgfplots+8섹션+bib 전부) · `paper help` 로드 OK · g51 10쪽 미달은 TODO 스캐폴드라 경고만(빌드 성공).

## fix(brainstorm): quote `$ARGUMENTS` + rewrite runbook to subagent-dispatch form

🗣️ "발산을 메인 대화가 아니라 서브에이전트 한 명에게 던진다 — 게다가 괄호 든 seed 도 안 깨진다"

- 동기: 유저가 `/brainstorm` 을 괄호 든 seed 로 호출 → 셸이 `( )` 를 glob 으로 해석해 명령이 깨지고, fallback echo 가 "sidecar CLI not found" 라고 **오진** 메시지를 띄움(실제 CLI 는 정상 설치). 더해 런북이 inline형이라 발산 라운드가 전부 메인 컨텍스트에 쌓였다.
- 원인 1 (glob 깨짐): `commands/brainstorm.md` 가 `sidecar brainstorm $ARGUMENTS` 로 **따옴표 없이** 인자를 넘김 → `"$ARGUMENTS"` 로 인용해 root-cause fix(ING 보드의 stdin-safe 가이드와 동일 정신). `argument-hint: "[seed]"` 추가.
- 원인 2 (inline 발산): `templates/brainstorm.md` 를 dispatch형 런북으로 재작성 — `/abg` 골격(절차·규칙·종료메시지)을 차용하되 **단발 `Agent` 하나**(한 줄기 발산 → Workflow 불필요 · commons `fanout-workflow` 단발 예외)에 발산 규약을 self-contained 프롬프트로 통째로 위임, 최종 dedup→cluster→3–5 shortlist 만 메인에 회수. `modules/runbooks.ts` `runBrainstorm` 이 seed 인자를 받아 런북 뒤 `seed:` 줄로 파라미터화.
- 검증: `brainstorm "AI 코딩 (사이드카) 개선"`(괄호 seed) → `seed: AI 코딩 (사이드카) 개선` 깨짐 없이 통과 · 빈 seed → REACTIVE 안내 · `help` 로드 OK · `toolkit write` 71개 카탈로그 100%.

## chore(load): drop the `🖥️ 부하 —` prefix from the per-turn load line

🖥️ "매 턴 부하 라인에서 라벨 접두사만 빼고 수치는 그대로"

- 동기: 유저 요청 — 매 턴 상단 부하 보고에서 `🖥️ 부하 —` 접두사가 군더더기. 라인 자체(CPU·RAM·swap·wt)는 유지하되 접두사만 제거.
- 변경(`modules/load.ts` `line()`): `head` 를 `정상=""` / `위험="⚠️ "` 로 바꿔 정상 상태는 `CPU …/… 🟢 · RAM … · swap … · wt …` 로 시작. 위험 상태는 `⚠️ ` 마커를 남겨 기존 자원위험 경고 라우팅 보존.
- 검증: `load inject` 출력이 `CPU 2.33/10 🟢 · …` 로 접두사 없이 시작 확인. lockstep: ARCHITECTURE.json 3축-신호등 노드(`⚠️ 부하`→`⚠️ ` 마커 · 접두사 제거 명시).
- 박제: sidecar/CLAUDE.md 작업규칙 강화 — "어떤 구현·수정이든 완료되면 사용자 지시 없어도 그 턴에 자동 `sidecar ship`(direct-execute · 4축/확인 없이)" 로 명문화(유저 요청).

## feat(lint): HELP-BACKTICK gate — ossify the recurring cli HELP backtick break

🔒 "한 세션에 두 번 낸 'HELP 백틱→리터럴 깨짐' 실수를 commit 게이트로 박제"

- 동기: `cli/index.ts` 의 `export const HELP = \`…\`` 는 템플릿 리터럴이라, 도움말 줄에 **이스케이프 안 된 백틱**을 넣으면 리터럴이 조기 종료돼 `sidecar help` + 모든 tsx/esbuild 빌드가 조용히 깨진다. 이번 세션에 fleet-full·folders help 편집에서 각각 1번씩, 총 2번 재발 → root-cause 박제.
- 검출(`lintHelpBacktick`): `cli/index.ts` 를 **텍스트로** 읽어(파일이 이미 깨져도 동작) HELP 블록(`export const HELP = \`` ~ `` `; ``) 안의 각 줄에서 이스케이프된 `\\\`` 를 제거한 뒤 남은 백틱을 `HELP-BACKTICK`(block)로 플래그. `export const HELP` 없으면 no-op(sidecar-repo 한정).
- 배선: `lint.ts` 4e' + severity-map(config/+.harness/) `HELP-BACKTICK:block` + `@convergence HELP_NO_RAW_BACKTICK`.
- 검증: HELP 라인에 raw 백틱 주입 → `[block] HELP-BACKTICK cli/index.ts line 99 … exit 1` · 복원 시 0 · architecture lint clean(노드 압축) · help OK · toolkit 71.
- 잔여: 빌드 자체 파스 검사는 아님(텍스트 휴리스틱) — 이스케이프된 백틱만 허용하는 HELP 컨벤션 전제. 다른 템플릿 리터럴은 미검사(HELP 만 재발 대상이었음).

## feat(folder-docs): enforce per-folder CLAUDE.md at commit (existence-only) + commons rule

📁 "작업한 폴더엔 로컬 CLAUDE.md 필수 — scan/넛지에 그치던 걸 commit-time block 게이트로 강제"

- 동기: 폴더별 CLAUDE.md 가 `folders scan` + post-edit warn 넛지뿐이라 실질 강제가 없었다. 유저 요청 = 생성·관리 강제 + commons 등록.
- lint 게이트(`FOLDER-GUIDE-MISSING` · block): `sidecar lint` 가 **staged 파일의 폴더**만 검사 — 그 폴더가 자격(`folderGuides` roots/depth/minFiles)인데 로컬 `CLAUDE.md` 없으면 커밋 차단(`folders scaffold <dir>`). 전체-repo 스캔이 아니라 staged-scoped 라 무관 폴더 누락이 무관 커밋을 막지 않는다("작업한 폴더만 관리").
- **존재만 강제 · 내용 자유양식**: 가이드 파일 내부를 do/dont 등으로 강제하는 content lint 는 없음(유저 명시).
- commons 등록: `## folder-docs` 규칙 신설(do/dont 한 쌍 — commons SSOT 포맷). severity-map(config/+.harness/) 에 `FOLDER-GUIDE-MISSING:block`.
- repo 준수화: 누락이던 `lib/`·`modules/` 에 실제 내용 채운 `CLAUDE.md` 생성(목적·핵심파일·규칙·gotcha).
- lockstep: ARCHITECTURE lint 노드(4h) · cli help · README folders 행. 검증: guide 치우고 staged → `[block] FOLDER-GUIDE-MISSING modules/` 발사·복원 시 소멸 · `help` 로드 OK · `folders scan` 0.

## fix(fleet-full): stop the implement-skip collapse + make sequential the default

🛰️ "fleet-full 이 패러다임 전환(abstract)만 돌던 구조적 누수를 막고 3 페이즈 전부 순서대로 통과시킴"

- 증상: `/fleet-full` 이 research+implement+abstract 3 페이즈를 엮어야 하는데 실전에선 implement 를 건너뛰고 abstract(패러다임 전환)만 무한순환.
- 루트커즈 2개: ① §3 `research→implement` 규칙이 "고신뢰 레버 없으면 implement 건너뛰고 abstract" 라 — 싼 research 는 대개 고신뢰 레버를 못 찾으니 매 라운드 abstract 로 직행. ② §5 비용 게이트가 implement **페이즈 전체**를 4축+go 로 막아 — 무비용 자동순환(research·abstract)이 게이트 걸린 implement 를 영구 회피.
- 수정(templates/fleet-full.md): research→abstract 직행 **금지**(lazy-ceiling c14 d) — 레버 약해도 가장 싼 로컬 implement/probe 로 **벽을 측정한 뒤에만** abstract 승격(abstract 진입 전제 = 직전 implement 의 캡처 수치 c2). 게이트를 "페이즈"→"비용"으로 재정의: 싼/로컬 implement(무비용·작은 n·worktree)는 research·abstract 와 동급 자동 진행, **비싼(pool/GPU rent/대규모) implement 만** 4축+go.
- 순차 기본: `parallel` 인자일 때만 Workflow fan-out, 미지정 시 **순차(afg-style · 한 레인씩 foreground await)**. §0/§1/§7 + 인트로 헤드라인 배선.
- lockstep: commands/fleet-full.md description(805자<cap) · cli help 라인 · ARCHITECTURE `fleet full` 노드 · TOOLKIT 71 entries.
- 검증: help 로드 OK(백틱 리터럴 깨짐 1건 fix) · `fleet full status` OK · ARCHITECTURE.json valid.

## feat(ing): age-aware pileup guard — stale/over-count items shout for a `done` scrub

🧹 "완료된 ING 라인이 scrub 안 된 채 ACTIVE 로 썩는 적체를 매 턴 들춰내 강제"

- 동기: `ing done` 은 이미 라인을 통째로 scrub 하지만, 끝난 작업에 `done` 을 안 부르면 active 라인이 묵은 채 쌓였다(현 보드 9건 중 4건이 6일+ 방치). 데이터모델이 아니라 **환기 부재**가 원인 — 자동삭제는 위험(장기 cross-repo 건은 진짜 진행중)하니 매 턴 적체를 큰소리로 들춰 scrub 을 강제.
- inject(매 UserPromptSubmit)·show: 각 work 항목에 나이 `⏳Nd` 표시. `bloatDirective` — `ing.staleDays`(기본 5) 초과 묵음 항목이나 `ing.maxActive`(기본 12) 초과 시 `🧹 ING 적체 — N건 5일+ 묵음 — #id(⏳Nd)… 끝난 항목 지금 \`ing done <id>\` 로 scrub(보드는 ACTIVE 만 · 완료분은 CHANGELOG)` 강제 라인 추가. 진행중이면 그 줄 현행화 요구(방치 금지).
- 턴-마감 게이트 문구에 `done(완료=scrub→CHANGELOG)` 명시 강화.
- config `ing` 확장: `{ editThreshold, staleDays:5, maxActive:12 }`(기존 editThreshold 보존). 자동삭제 없음 — NUDGE 강화만(나이는 done-vs-active 의 proxy).
- 검증: 실보드 inject 가 `🧹 ING 적체 — 4건 5일+ 묵음 #1·#5·#6·#8(⏳6d)` 정확 발사(최근 #11 ⏳0d 제외) · show 나이 표시 · `help` 로드 OK · ARCHITECTURE/config lockstep.

## feat(guards): preserve-state scatter-dir BLOCK + single-doc scatter-filename BLOCK

🗂️ "산출물 '위치·이름' 거버넌스 2종에 코드 이빨 — 흩어진 결과 디렉토리·문서를 쓰기 직전 하드 차단"

- 동기: commons `preserve-state`·`single-doc` 이 거버넌스 텍스트만 있고 코드 강제가 비거나 약했음. naming-guard 와 같은 "산출물 위치·이름" 계열 2종을 BLOCK 으로 격상(유저 ④ 표준 선택).
- preserve-state(신규 `state-guard.ts`): scatter 디렉토리(`.verdicts`·`verdicts`·`bench`·`.bench`·`experiments`·`scratch`·`scripts/scratch`) 안에 산출물 생성 시 BLOCK → 단일 git-tracked `state/` 루트로 유도. Write/Edit(`detectBannedStateDir`) + Bash mkdir/touch/cp/mv(`detectBannedStateDirBash`, naming 빵틀 재사용) 양쪽. `state/`·`build/`·`dist/`·`.harness/`·`node_modules/`·`.git/` 하위는 통과. `@state-ok`(content)/`# state-ok`(bash) 면제. config `stateGuard`(기본 true). `@convergence NO_SCATTER_STATE_DIR`.
- single-doc(기존 `DOC-SCATTER` 격상): scatter 파일명(`*-report/summary/notes/plan/guide/design/spec/overview/audit/status.md`·`UPPERCASE.md`·`\d{6,8}[-_]*.md`) 생성 시 **scope 무관 항상 BLOCK**(전엔 `docs.scopeDirs` 안에서만 warn) — `docs.ts` 에서 `isScatter` 검사를 scope 게이트 위로 이동(naming 과 같은 "이름 자체가 문제" 철학) + preWrite 라우팅에서 `DOC-SCATTER`/`DOC-ARCH-NONROOT` 는 enforce 레벨 무관 항상 emitBlock. quickref 누락(`DOC-NO-QUICKREF`) 같은 약한 건 scope-한정 warn 유지. 면제는 `docs.allow` 리스트 + `docs.enforce:off`.
- 검증: state-guard 17 unit ALL PASS(.verdicts·bench·experiments·scripts/scratch BLOCK · state//build/ allow · marker allow · ls/rm 비생성 allow) · scatter .md e2e(`foo-report`·`x-summary`·`20260624-notes`·`-guide` deny · README/CHANGELOG allow) · naming/cloud 회귀 BLOCK 유지 · `help` 로드 OK · ARCHITECTURE/README/config lockstep.

## feat(naming-guard): escalate to BLOCK + cover bash mv/cp/touch/mkdir

🔒 "warn-only 라 무시되던 `_v2`·`_final`·`_copy` 작명 가드를 하드 차단으로 — 이력은 git history 로만"

- 동기: `naming-guard` 의 `@convergence` 마커가 `threshold=warn-only proves too weak 이면 block 으로 격상` 이라 예고. 유저가 그 격상을 명시 요청. 또한 가드가 `pre write`(Write/Edit) 에만 있어 `mv a.ts a_v2.ts`·`touch report_final.md`·`mkdir model_v2` 같은 **CLI 작명**이 통째로 샜다.
- BLOCK 격상: `pre write` 의 `emitWarn` → `return emitBlock` (Write/Edit 로 버전/복사 접미사 파일·폴더 생성 시 하드 deny).
- Bash 커버리지 신설: `detectVersionedNameBash` — `mv`/`cp`/`ln`/`rename`(목적지=마지막 인자만)·`touch`(각 인자)·`mkdir`(각 경로 세그먼트)·`git mv` 가 버전접미 이름을 **생성**하면 차단. `mv foo_v2.ts foo.ts`(나쁜 이름→고치는 방향)는 목적지만 검사해 통과(FP 방지). flag 토큰·`echo`/`ls`/`cat`/`rm` 등 비-생성 명령 무시.
- 면제: `@canonical-ok`(Write/Edit content) / `# canonical-ok`(bash 인라인) — 실 public API 버저닝용. 기존 escape 유지(새 구멍 아님).
- 검증: Write/Edit 16종(`model_v2.py`·`config copy.json`·`notes 2.md`·`model_v2/`… BLOCK · `final_report`·`_test.go`·`.spec.ts`·`v2/api.ts`·marker ALLOW) · Bash 16종(`mv …_v2`·`mkdir -p src/model_v2/sub`·`git mv …_copy` BLOCK · 고침방향·flag·비생성·marker ALLOW) · end-to-end `pre write`/`pre bash` 실제 `permissionDecision:deny` 발사 확인 · `help` 로드 OK · ARCHITECTURE/config 코멘트 lockstep.

## fix(cloud-guard): cover the `runpod` Python CLI + `api.runpod.ai` serverless host

🔒 "runpod 차단도 vast 처럼 표면 누락 — Go `runpodctl` 만 막고 공식 Python `runpod` CLI 와 서버리스 엔드포인트가 샜다"

- 증상: `runpod config`·`runpod project deploy`·`runpod pod create`·`runpod exec` (공식 pip `runpod` CLI) 전부 ALLOW · `curl https://api.runpod.ai/v2/<id>/run`(서버리스) ALLOW. `runpodctl`·`api.runpod.io`·`rest.runpod.io` 만 막혀 있었다.
- 수정: `CLI_COMMANDS` 에 `runpod` 추가(두 RunPod CLI 헤드 모두 command-position 무조건 차단) · API regex 에 `api.runpod.ai`(서버리스 호스트) 추가. `@convergence BOTH_RUNPOD_CLIS` 박제.
- root-cause(따옴표 인식 세그먼트): `vast`/`runpod` 를 무조건차단으로 만들자 `grep -E "vast|runpod"` 처럼 **따옴표 안 정규식 `|`** 가 shell 파이프로 오인돼 false-block 발생(stripQuotes 를 먼저 하고 `|` 로 쪼개 따옴표 경계 소실). `segments()` 헬퍼 신설 — **따옴표 밖** `;|&()` 만 분리, 따옴표 안 `|` 는 데이터로 보존. `detectRawCloudCli`·`detectRawDojoDeck` 양쪽 적용 · `leadToken` 이 토큰별 stripQuotes. 기존 `vastai`/`runpodctl` 의 같은 잠복 FP 도 동시 해소. `@convergence QUOTE_AWARE_SEGMENT` 박제.
- 잔여(정직): `python -c "import runpod; …"` SDK 직접 호출은 여전히 통과 — `import runpod` 전체 차단은 코드 열람까지 막는 과차단이라 의도적 비포함(같은 부류의 vastai/SDK 벡터와 동일).
- 검증: `runpod` 5종 + `api.runpod.ai` 2종 BLOCK · `runpodctl`/`.io`/`rest` 회귀 유지 · 따옴표 정규식(`grep "vast|runpod"`·`awk "/vast|runpod/"`)·양성(`echo`·`hexa cloud`) ALLOW · 따옴표 헤드 `"vast" create` BLOCK.

## fix(cloud-guard): block `vast` unconditionally — drop the leaking verb whitelist

🔒 "vast.ai 차단이 '또 풀리던' 진짜 원인 — `vast` 만 동사 화이트리스트라 새 서브커맨드가 줄줄 샜다"

- 증상: 유저가 "vast cli 등 금지처리가 또 풀렸다" 보고. 실측 결과 `vast cli`·`vast set api-key`·`vast scp`·`vast attach`·`vast execute`·`vast logs`·`vast reboot`·`vast label`·`vast recycle`·… 14종이 전부 ALLOW 로 새고 있었다.
- 원인: `cloud-guard.ts` 의 `vast` 만 `VAST_VERBS`(create·launch·start·stop·destroy·ssh·show·search·copy·cloud·instance 11개) 화이트리스트로 게이트 — 그 목록에 없는 vast.ai 서브커맨드는 `continue`(=ALLOW). vast.ai 가 서브커맨드를 늘릴 때마다 가드가 "재-unlock" 되는 구조적 구멍. `vastai`·`runpodctl` 은 원래 무조건 차단인데 `vast` 만 예외였다.
- 수정: `vast` 의 동사 화이트리스트 특수분기 제거 → `CLI_COMMANDS`(runpodctl·vastai·vast) 무조건 차단으로 통일(command-position bare `vast` = vast.ai CLI). path 충돌 우려는 `./vast`·`/usr/bin/vast` 가 bare head 와 불일치라 비영향 — no-override 가드라 DOJO_TRAIN_NAME_BROAD 선례처럼 false-positive 편향. `@convergence NO_VAST_VERB_WHITELIST` 박제.
- 검증: 14종 vast 서브커맨드 전부 BLOCK 🔒 · `vastai`/`runpodctl`/`cloud rent` 회귀 BLOCK 유지 · 양성(`echo vast`·`grep vast`·`./vast foo`·`cat /etc/vast.conf`·`hexa cloud`·`hexa dojo`) 전부 ALLOW · `help` 로드 OK.

## feat(easy): add deterministic `scaffold` + `lint` builtins — /sbs wraps a real backbone

🎓 "easy 가 show/inject 만이라 sbs chat-form 이 손-self-check 에 그쳤던 구멍을 메움 — archive 의 `hexa easy` 결정적 빌트인 수준"

- 동기: archive_sidecar 의 sbs 런북은 chat-form 7요소 라운드를 `hexa easy scaffold`(빈 7-슬롯 골격) + `hexa easy lint`(축별 advisory 점수) 결정적 빌트인으로 감쌌으나, 현재 `sidecar easy` 는 `show|inject`(스타일 주입)만이라 그 backbone 이 없었다. 두 verb 를 `modules/easy.ts` 에 추가해 sbs 가 실 빌트인을 래핑하게 승격.
- `sidecar easy scaffold "<q>"` — 라운드의 빈 7-슬롯 골격(아이콘·이름/별칭·하는 일·비유·ASCII(4종 안내)·비교표·추천 + `→ A · B · 또는 자유응답`)을 결정적으로 발행. LLM 은 창의 슬롯만 채운다.
- `sidecar easy lint <file|->` — 렌더된 라운드를 styles 의 측정 축으로 advisory 채점: jargon-ratio(≤0.30) · analogy-presence(같은/처럼/마치) · ascii-diagram-presence(펜스 박스문자) · acronym-expansion(약어 첫 등장 풀어쓰기) · 7-element adoption(icon·비유·ascii·표 ≥3/4). **항상 exit 0(advisory · 라운드 미차단 · NO LLM)**.
- 배선: `cli/index.ts` help 라인 갱신 · `templates/sbs.md` 의 Step2 7요소 블록을 "styles self-check 만" → "scaffold→채움→lint 빌트인 래핑(graceful fallback 유지)" 으로 승격. SSOT(`styles/easy.<lang>.md`) 복제 금지 원칙 유지.
- 검증: `help` 로드 OK · `scaffold` 골격 발행 OK · `lint` good round → all PASS · bad round(jargon 0.47·무비유·무ASCII·약어 7개 미풀이) → 5 warn 정확 · 잘못된 subverb → usage · `toolkit write` 71 entries.

## feat(sbs): restore full archive_sidecar fidelity in the /sbs runbook

🧭 "60줄로 압축돼 정밀도를 잃었던 /sbs 런북을 archive_sidecar 0.15.0 (517+207줄) 수준으로 복원"

- 동기: `dancinlab/archive_sidecar`(구 sidecar · private 아카이브)의 `step-by-step` 플러그인이 가진 정밀 런북을 현재 단일-CLI 아키텍처의 `templates/sbs.md` 로 1:1 이식. 기존 압축본이 잃었던 12개 블록 복원 — resolver-first parse 전수 우선순위·`auto ── manual` 다이어그램·7요소 chat-form·non-skippable 재스캔 hard gate·미지값 무날조(양 모드)·AskUserQuestion fallback·합의화면 응답처리(go/Qn=/새모호성)·plan.md `@L assert` 계약(grep/file/verdict 3종 + 후방호환)·백그라운드 Agent 발사·auto-QA 4축 hybrid fail 정책·status flip·9-section 인계 dossier·end-user dossier·Halt·Closure.
- 현재 subsystem 적응 (archive 참조 → 현재 매핑): resolver-first 는 `modules/sbs.ts` 가 이미 CODE 로 `resolveMode` 호출(코드 무변경) · `hexa easy scaffold/lint` 빌트인 → `sidecar easy` styles SSOT(`~/.sidecar/cli/styles/easy.<lang>.md`) point+self-check · `sidecar handoff add <repo>` (retired) → `sidecar ing add --to <repo>`(handoff-guard 강제) · `plan-guard` 부재 → `@L` 계약 포맷은 문서화하되 advisory(미래 enforcer 들어오면 그대로 강제) · `/cycle`·`/domain` → `abg`·ING 보드.
- 배선: `commands/sbs.md` description + `cli/index.ts` help 라인을 새 충실도로 갱신(picker/help lockstep). 설계 SSOT(subsystem·데이터흐름) 불변이라 ARCHITECTURE 무변경 — 런북 정밀도 복원이지 설계변경 아님.
- 검증: `help` 로드 OK · `sbs manual/auto/auto:safe/no-token` smoke (resolver 엣지 — bare `auto`→FIXED complete 상속 · `auto:safe`→override · no-token→상속 모두 정확) · `toolkit write` 71 entries 카탈로그 100%.

## fix(rebrand): deplete remaining harness leftovers (identifiers · prose · uninstall bug)

🧹 "rebrand sweep 가 놓친 harness 잔재를 dry 까지 소진"

- 코드 식별자: `HarnessConfig`→`SidecarConfig`(lib/config.ts) · `harnessBin`→`sidecarBin` + launchd `com.harness.mem-guard`→`com.sidecar.mem-guard`(mem-guard.ts) · `isHarness*`→`isSidecar*`(setup·shadow·uninstall) · "non-harness hooks" 주석 정정.
- **버그 fix**: `uninstall.ts` 의 settings.json 자동제거 판정이 `/\bharness\b/` 로 hook 명령을 매칭 — rebrand 후 hook 은 `sidecar` 라 영영 false → sidecar-only settings 를 못 지웠다. `/\bsidecar\b/` 로 교정.
- 프로즈/트리거: ARCHITECTURE.json·README·docs·commands/*.md·gen_commands.py 의 한글 "하네스"→"사이드카"(ARCHITECTURE 의 "원본 하네스/새 하네스" 계보 표현은 이름-중립 "원본 도구/이 도구" 로). keywords.json 은 이미 클린(0).
- 유지: per-repo 관례 `.harness/`·`harness.config.json`·legacy `.harness-engine` ignore·CHANGELOG 이력.
- 검증: `하네스` 0 · 비-`.harness`/`harness.config` latin harness 0 · help 로드·`uninstall --dry-run`·`shadow plan` 스모크·`lint`/`architecture lint`/`toolkit` 그린.

## feat(architecture-lint): tighten tree-hygiene to 700자/6-piled + BLOCK — force fine decomposition

🌳 "ARCHITECTURE.json 트리를 산문 leaf 말고 잘게 쪼갠 노드로 쓰게 강제"

- 동기: 설계 트리가 한 노드 `상세` 에 한 문단(900자+)을 욱여넣어도 막을 게 없었다(임계 1500자/10-piled · 사실상 무발화). "좀더 강제" 요청.
- 강제: `architecture.ts` 임계 `MAX_CELL_CHARS 1500→700` · `MAX_PILED_ITEMS 10→6`. severity-map(`config/` + repo `.harness/`)에 `ARCH-BIG-CELL`·`ARCH-PILED`·`ARCH-HISTORY = block` 명시 → `sidecar lint`(pre-commit)가 위반 시 커밋 차단(이전엔 fallback=block 에 의존 + 주석은 "warn-only" 로 stale). standalone `architecture lint` 도 위반 시 exit 1(이전 --strict 일 때만).
- 현행 트리 정합: 700 초과 5개 노드(fleet 929·shadow 808·convergence 720·pr-cycle 716·load 708)를 요약 + children 으로 분해 · `danger 가드` 의 괄호내 ` · ` 목록을 쉼표로(piled 오집계 해소). 결과 max 698자/6-piled.
- 문서: `architecture` 노드에 `lint (트리 위생)` child 추가 · README 에 트리 위생 강제 항목 · lint.ts 4c 주석 정정(warn-only→block).
- 검증: `architecture lint: ok` · `lint: ok` · `toolkit` 71 in-sync · init 스모크 그린.

## fix(init): scaffold ARCHITECTURE.json (not .md) + CLAUDE.md as tree-less entry pointer

🏛️ "init 이 SSOT 인 .json 대신 .md 를 만들고, CLAUDE.md 에 파일트리를 박던 문제"

- 문제: `sidecar init` scaffold 가 ① `ARCHITECTURE.md`(prose)를 생성 — 구조 SSOT 는 `ARCHITECTURE.json`(JSON 트리, AI·툴 파싱용) 인데 어긋남 · ② `CLAUDE.md` 에 디렉토리 트리를 박음 — single-doc 상 트리는 ARCHITECTURE.json 단일 SSOT 라 중복·drift 유발.
- 수정: `init.ts` scaffold 를 `ARCHITECTURE.json` 스켈레톤(schemaVersion 2.0 · columns · tree[src/·state/])으로 교체 · `CLAUDE.md` 를 진입점(설명 + SSOT 포인터 + 작업규칙, **트리 없음**)으로 · CHANGELOG 머리말도 ARCHITECTURE.json 참조. `lib/config.ts` docs.architecture 기본값 `.md`→`.json` · `atlas.ts` ATLAS 헤더 SSOT 포인터도 `.json`. (읽기 폴백 `.json||.md` 는 레거시 repo 용으로 유지.)
- 정합: `docs.ts` 는 ARCHITECTURE.json 존재 시 CLAUDE.md 트리를 면제(CLAUDE-MD-NO-TREE) — scaffold 결과가 lint 와 일치.
- 검증: 임시 repo `init` → `ARCHITECTURE.json` 유효 JSON 생성·`.md` 미생성·CLAUDE.md 트리 0줄·`lint: ok`·`architecture show` 가 .json 읽음.

## fix(rebrand): global-home paths built via `homedir(), ".harness"` → `.sidecar`

🩹 "리브랜드 누락 — homedir 기반 글로벌 경로 5곳이 옛 ~/.harness 를 계속 가리킴"

- 회귀: 직전 rebrand sweep 은 리터럴 `~/.harness`·`.harness/cli` 만 치환 → 코드가 `resolve(homedir(), ".harness", …)` 로 만드는 **글로벌 홈 경로 5곳**(pool.json·recommend-default·companions.json·lsp-rebuild.log·cli)은 누락, 이동된 옛 경로를 가리켜 `pool list`=no hosts·`recommend get-default`=source none 으로 깨짐.
- 수정: 그 5줄만 `homedir(), ".sidecar"` 로. **per-repo `REPO_ROOT, ".harness"`(8곳)은 그대로** — `.harness/` 관례는 의도적 유지(교차 repo).
- 검증: `pool list` 가 `~/.sidecar/pool.json` 의 호스트 정상 표시 · `recommend get-default` = FIXED complete [source: global] · `lint fast` ok.

## chore(rebrand): harness → sidecar — full command + repo + global-install rename

🪪 "harness 라는 이름을 sidecar 로 — 명령어·repo·전역 설치까지 전부"

- 동기: canonical 이름을 `sidecar` 로 확정. 기존 GitHub `dancinlab/sidecar`(구 0.4.x harness 격 프로젝트)는 `archive_sidecar` 로 rename + **private** 처리해 이름을 비우고, 현재 프로젝트가 그 이름을 승계.
- 치환 범위: CLI 명령 `harness`→`sidecar`(`bin/harness`→`bin/sidecar`) · `HARNESS_*` env→`SIDECAR_*` · `@dancinlab/harness`→`@dancinlab/sidecar` · 플러그인/마켓플레이스 name · 전역 홈 `~/.harness/cli`→`~/.sidecar/cli` · `dancinlab/harness`→`dancinlab/sidecar` · 산문/타이틀. 155 파일 sweep.
- **의도적 유지**(교차 20 repo 공유 관례 + 진행중 클린업 충돌 회피): per-repo 런타임 디렉토리 `.harness/` 와 설정 파일 `harness.config.json` 은 그대로 — `sidecar` CLI 가 계속 읽음. 관례 rename 은 ING follow-on 으로 분리.
- 이력 보존: `CHANGELOG.md` 의 과거 엔트리는 당시 이름(harness) 그대로 둠(이력 = 사실 기록, canonical-naming).
- 검증: `tsx cli/index.ts help` 로드 OK · `toolkit check` 71 entries in-sync · `lint fast` ok.
- 후속(글로벌 재배선): `~/.harness/cli`→`~/.sidecar/cli` 이동 · `~/.local/bin/sidecar` 래퍼 · `~/.claude/settings.json` 36 hook `harness`→`sidecar` · shadow 66 재생성 · 로컬 dir rename.

## fix(load): worktree 표기 다른 축과 동일화 — 나무 이모지 제거 + 신호등 + ≥10 빨강

🚦 "worktree 도 CPU/RAM 처럼 `wt N 🟢` 한 형식으로"

- 직전(#161)의 `🌲 wt N` 표기를 다른 자원 축(CPU/RAM/swap)과 **동일 형식 `wt N <신호등>`** 으로 통일 — 나무 이모지 제거, `light()` 헬퍼 재사용으로 색상 신호등 부여.
- threshold: 🟢 0-2 · 🟡 3-9 · 🔴 **≥10**(이전 ≥4 → 사용자 기준 10개부터 빨강) — `light(worktrees, 3, 10)`.
- 영향: `modules/load.ts` · ARCHITECTURE.json(load 노드) · README.md.

## feat(load): 부하 한 줄 우측에 worktree 갯수 표시 (🌲 wt N · stranded 가시화)

🌲 "지금 worktree 몇 개 떠있나 — 매 턴 눈에"

- 매 턴 부하 readout(`harness load`) 끝에 **추가 git worktree 수**(main 제외)를 `🌲 wt N` 으로 붙임 — 신호등 🟢0 · 🟡1-3 · 🔴≥4. 격리 agent 가 만든 worktree 가 정리 안 되고 쌓이는 걸(stranded) 매 턴 눈에 보이게 해 `harness worktree gc` 를 유도.
- 구현: `load.ts:readSnapshot` 에 `git worktree list --porcelain` plumbing 1회(빠름) → `^worktree ` 카운트 - 1. line/설명줄에 표시. 비-git 디렉토리는 0.
- 영향: `modules/load.ts` · ARCHITECTURE.json(load 노드) · README.md.

## feat(commons): do/dont 형식 **write-time** hard-deny (sidecar 동형 · 커밋 아닌 수정 시점 차단)

🚧 "잘못 쓰는 순간 막는다 — 커밋까지 안 기다리고"

- 배경: commons do/dont 형식 검사(COMMONS-PROSE/COMMONS-NO-DODONT)가 `harness lint`(**커밋 시점**)에만 돌아서, 산문을 써 넣어도 커밋 전까진 통과했다. sidecar 의 skill-desc write-deny 처럼 **수정(Write) 즉시** 막아야 한다는 피드백.
- 고침: `commons.ts` 의 검사 코어를 `lintCommonsText(text, rel)` 로 분리(파일 읽기와 분리) → ① 커밋 게이트 `lintCommonsFormat()`(lint 4g) ② **write-time `commonsWriteViolation(filePath, content)`** 둘이 공유. `pre.ts:preWrite` 가 commons.md(bundled `config/` 또는 repo `.harness/` override) 전체-문서 Write 를 가로채 do/dont-only 아니면 **PreToolUse `permissionDecision: deny`** 로 쓰기 자체를 차단(`descWriteViolation`(SKILL-DESC) 바로 뒤, 동형 패턴).
- 2층 방어: write-time deny(즉시) + commit-time lint 4g(backstop) — skill-desc 가드와 동일 구조. Edit 의 new_string 단편(섹션 헤더 없는 조각)은 full-file 맥락이 없어 커밋 lint 가 맡고, 전체-문서 Write 는 write 시점에 막는다.
- 검증: 산문 든 commons.md Write → `deny` 발화 확인 · 정상 do/dont → 통과. 영향: `modules/commons.ts`(코어 분리 + write 가드) · `modules/pre.ts`(preWrite 배선) · ARCHITECTURE.json.

## refactor(claudemd): CLAUDE.md = 진입 포인터(트리 제거) + 작업규칙 do/dont — 트리는 ARCHITECTURE.json 단일 SSOT

🗺️ "지도는 한 곳에만 — CLAUDE.md 는 입구 표지판"

- 배경: 디렉토리·모듈 트리가 `CLAUDE.md` 와 `ARCHITECTURE.json` 양쪽에 있어 중복 → 한쪽만 갱신되면 drift. `single-doc` 정신대로 **트리는 ARCHITECTURE.json 단일 SSOT** 로 일원화.
- CLAUDE.md 슬림화: 큰 ASCII 트리 블록(25줄)을 제거하고 **SSOT 포인터**(구조→ARCHITECTURE.json · 거버넌스→commons.md · 이력→CHANGELOG)로 대체. 작업규칙 3불릿도 commons 와 톤 통일해 **do/dont** 형식으로. **41→16줄**(매 턴 claudemd 재주입 토큰 절감).
- 린터 완화(트리 면제): `docs.ts:claudeMdViolations` 의 **CLAUDE-MD-NO-TREE** 검사가 구조 SSOT(ARCHITECTURE.json/.md) 존재 시 면제되도록 — 트리가 거기 단일 SSOT 면 CLAUDE.md 는 진입 포인터로 충분(트리 없으면 여전히 block, 구조 문서 자체가 없는 repo 보호). CLAUDE-MD-MISSING 문구도 "구조 SSOT 부재 시 트리 포함" 으로 정정.
- 영향: `CLAUDE.md`(트리 제거 + do/dont) · `modules/docs.ts`(트리 면제 게이트) · ARCHITECTURE.json(claudemd 노드) · README.md.

## refactor(commons): do/dont 압축(-70%) + slug 키 + do/dont 형식 린터 (sidecar 포팅)

✂️ "거버넌스 규칙을 산문에서 do/dont 두 줄로 — 가볍게, 다시 못 부풀게"

- 배경: `config/commons.md`(매 턴 주입되는 거버넌스 SSOT)가 규칙당 5~10줄 산문 + 메커니즘/실증 박제로 350줄·38KB 까지 비대 → 매 턴 컨텍스트를 무겁게 먹었다. sidecar 의 do/dont 린터(governance = `do`/`dont` 쌍, SKILL.md 본문을 그 형식으로 강제) 철학을 harness 에 이식.
- 압축: 27규칙 전부 `## <slug> — <title>` + `- do:`/`- dont:` 두 줄로 재작성. **350→119줄 · 38,841→11,732 바이트(-70%)**. 메커니즘 세부·실증 사례는 버리고(코드 hook 이 강제 + git/CHANGELOG 가 이력) do/dont 핵심만 남김 — 강제력 불변.
- slug 키(번호 폐기): `c1~c27` 번호는 순서가 바뀌면 깨지므로 **의미 slug**(`root-cause`·`break-walls`·`fanout-workflow`…)로 전환. 내부 cross-ref(`(c1·c16)` → `root-cause·no-escape-hatch`)와 외부 활성 참조(`cloud-guard.ts`·`lint.ts` 주석·`CLAUDE.md`)도 slug 로 정정. `@convergence` 마커의 과거 incident 기록(threshold)은 그 시점 박제라 불변.
- 린터(재발 차단): `commons.ts:lintCommonsFormat()` 신설 — 각 `## ` 섹션 본문이 do/dont 줄만인지(산문 단락 금지) + 섹션마다 do/dont ≥1 인지 검사. `harness lint` 4g 로 통합, `severity-map.json` 에 **COMMONS-PROSE/COMMONS-NO-DODONT = block** → 거버넌스가 산문으로 다시 부풀면 커밋 차단(첫 `## ` 이전 머리말은 면제).

```
전 (before)                              후 (after)
─────────────────────────              ─────────────────────────
 ## c1 — root cause                      ## root-cause — …
 원인을 고친다... 금지:@ts-ignore         - do: 증상 아닌 원인 · 재발은 @convergence
 ·eslint... (산문 18줄)                   - dont: @ts-ignore·eslint·빈catch… (2줄)
 350줄 · 38KB · 번호 ID(순서의존)          119줄 · 12KB · slug ID(순서무관) + 린터
```

- 영향: `config/commons.md`(재작성) · `modules/commons.ts`(린터) · `modules/lint.ts`(4g 통합 + 주석 slug) · `config/severity-map.json` + `.harness/severity-map.json`(2 룰) · `modules/cloud-guard.ts`(주석 slug) · `CLAUDE.md` · ARCHITECTURE.json. ⚙️ `harness ship` 후 전 repo 의 inject 가 가벼워짐.

## feat(email): Postmark 트랜잭션 메일 발송 명령 `/email` (`secret` 토큰 · curl -K)

📮 "터미널에서 바로 메일 한 통"

- 하는 일: Postmark REST API(`POST /email`)로 트랜잭션 이메일을 보낸다. 서버 토큰은 `secret get postmark.server_token` 으로만 가져오고(절대 인라인·로그 금지), curl `-K` config 파일로 헤더에 실어 프로세스 argv 에도 안 뜬다 — `imagine` 의 키-은닉 기법 그대로. 본문은 FILE 에서 읽어(provenance·argv 누출 0) `--text`/`--html`, 짧은 건 `-m <inline>`.
- 표면: `email send --to <a[,b]> --subject <s> [--from <a>] [--text <file>|-m <inline>] [--html <file>] [--cc][--bcc][--reply-to][--tag][--stream][--attach <f>]... [--dry]` · `history [--count N][--offset N][--tag t][--json][--local]`(Postmark outbound API 또는 로컬 원장) · `list`(토큰·기본 From·스트림 점검) · `help`. `--from` 미지정 시 `secret get postmark.from` 기본값. `--dry` 는 발송 없이 payload 만 렌더(첨부 base64 는 파일명만 요약). 성공 조용·실패 큰소리 + `email.jsonl` 로컬 원장.
- 영향: `modules/email.ts`(신규) · `cli/index.ts`(등록 `email`/`mail` + HELP 라인) · `commands/email.md`(bare 슬래시 위임자). ⚙️ 적용: `harness ship` 후 picker 에 `/email` 노출. 사용 전 `secret set postmark.server_token <토큰>`.

## feat(commands): hexa-surface 슬래시 4종(/hexa·/cloud·/dojo·/deck) + /verify YAML 깨짐 수정

🧩 "이웃 CLI(hexa) 도 슬래시로 손에 잡히게"

- 하는 일: `hexa` CLI 의 자주 쓰는 서브커맨드를 bare 슬래시로 노출 — `/hexa`(passthrough)·`/cloud`(=`hexa cloud` GPU 디스패치)·`/dojo`(=`hexa dojo` 학습 빵틀)·`/deck`(=`hexa deck` 인풋덱 빵틀). 각 `commands/*.md` 는 desc+`Triggers —`(KO+EN) 갖춘 얇은 위임자(`hexa <sub> $ARGUMENTS`), hexa 부재 시 graceful echo. 기존 hexa-위임 패턴(/kick·/verify·/atlas)과 동형.
- 충돌 해소: 기존 harness `/dojo`(= `harness dojo` 훈련잡 스캐폴더)는 **`/hdojo` 로 이전**하고 `/dojo` 는 `hexa dojo` 에 양보 — 사용자 의도(`/dojo`=hexa dojo). harness CLI 의 `dojo` 명령 자체는 불변.
- 버그 수정(`/verify` 인지 실패): `commands/verify.md` 의 `argument-hint: "[rubric | fence "<claim>"]"` 가 **중첩 큰따옴표**로 YAML frontmatter 를 깨뜨려 → Claude Code 가 description 대신 SHADOW_MARKER 주석을 picker 설명으로 표시 → /verify 가 자연어 인지 안 됨. 안쪽을 작은따옴표(`'<claim>'`)로 고쳐 파싱 복원. 전 commands/*.md 중첩-따옴표 0 확인.
- 영향: `commands/{hexa,cloud,dojo,deck,hdojo}.md`(신규/이전) · `commands/verify.md`(YAML fix) · ARCHITECTURE.json · README.md. ⚙️ 적용: ship 후 `harness shadow --force` 로 마커-없는 기존 `/cloud` 잔재까지 source 로 heal.

## feat(hooks): sidecar 참고 — 컴팩션 생존(PreCompact/PostCompact 재주입) + skill-desc write-time hard-deny

🧠 "긴 대화 중간에 기억이 날아가도 다시 붙여준다"

- 배경: `dancinlab/sidecar` 대비 harness 미달 2건을 닫는다(QA 후속). ① harness 의 매-턴 inject(commons·recommend·prefs·easy)는 UserPromptSubmit 라 자동 컴팩션 후에도 복귀하지만, **세션-스코프 inject(architecture·git-context·toolkit·companions·ing)는 SessionStart 에서만 떠 컴팩션 시 증발** — 긴 세션 중반에 설계트리·명령카탈로그·ING 보드가 사라져 "구조를 다시 추측" 하게 된다. ② 새 명령 description 이 1400자 skill-listing cap 을 넘기면 엔트리가 잘려 인지가 죽는데, 막을 게 커밋-시점 lint warn 뿐이었다.
- 고침 ①(컴팩션 생존): `setup.ts:hookSpec()` 에 **PreCompact + PostCompact** 추가 — 세션-스코프 inject 6개(commons·architecture·git-context·toolkit·companions·ing)를 컴팩션 전(요약기가 보도록)+후(새 윈도우 직후 신선)에 재주입. sidecar `project-tape` 의 PreCompact+PostCompact 재주입과 동형. inject 명령은 `hookEventName` 을 echo 하므로 새 이벤트에 무수정 동작.
- 고침 ②(skill-desc hard-deny): `pre write` 가 `commands/*.md`·`SKILL.md` write 직전 description 을 측정 — 1400자 cap 초과면 **PreToolUse deny(`SKILL-DESC-CAP`)로 쓰기 차단**(sidecar 충실 이식: cap=객관적 CC 한계라 deny), `Triggers —` 누락은 warn(`SKILL-DESC-TRIGGERS`). 커밋-시점 lint 4f(`SHADOW-DESC`)는 백스톱으로 유지 → 쓰기·커밋 2층 방어.

```
전 (before)                                  후 (after)
─────────────────────────────────          ─────────────────────────────────
 컴팩션 후 architecture·ing·toolkit 증발     PreCompact+PostCompact 가 6개 재주입
 cap초과 desc → 커밋 때 warn(이미 씀)         쓰는 순간 deny(애초에 못 씀)
```

- 영향: `modules/setup.ts`(PreCompact/PostCompact) · `modules/pre.ts`(SKILL-DESC deny) · `modules/shadow.ts`(`descWriteViolation`) · ARCHITECTURE.json·README.md. ⚙️ 적용: ship 후 `harness install-hooks` 재실행으로 전역 settings.json 에 새 이벤트 머지(setup SSOT 가 바뀌어도 기존 전역 settings 는 자동추적 안 됨 — install-hooks 가 동기화 경로).

## fix(shadow): 맨-명령 인지 복원 — `shadow --force` 로 마커-없는 stale shadow heal + sidecar s18 desc-lint 포팅

🪞 "복사본이 원본보다 낡아 이름표가 떨어졌다"

- 증상: 슬래시 없이 "fleet"·"sbs auto go"·"easy" 같은 **맨 텍스트로 명령이 인지 안 됨**. 원인은 `~/.claude/commands/*.md`(로드되는 shadow) 22개가 `SHADOW_MARKER` 도입 *전* 생성돼 마커가 없고, `harness shadow` 가 이를 "손수작성" false-positive 로 보고 덮어쓰기를 skip → 옛 버전이 잔존. 그중 **18개가 현행 source description 의 `Triggers —` 줄을 잃어**, Claude Code 가 세션 시작에 로드하는 skill 목록에서 그 명령의 트리거가 사라져 자연어 인지가 조용히 죽었다. (source `commands/*.md` 는 멀쩡했다 — 미러만 낡음.)
- sidecar 비교(`dancinlab/sidecar` 방법 점검): sidecar 는 명령을 skill 로 등록하고 `skill-desc-guard`(@D s18)로 description ≤ 1400자(Claude Code per-entry skill-listing cap)를 강제 — cap 초과 시 엔트리가 잘려 인지가 죽는다. harness 의 source description 은 전부 cap 이내(최대 540자)였으므로 length 문제는 아니었고, 진짜 원인은 **shadow 미러 staleness** 였다.
- 고침 ①: `harness shadow --force` — 마커-없는 충돌도 source(=SSOT)로 덮어쓴다. 마커 도입 전 shadow 를 한 방에 heal. 기본값은 그대로 보수적(skip), `--force` 만 override. `@convergence id=SHADOW_PREMARKER_STALE state=ossified`.
- 고침 ②(재발방지): sidecar s18 을 harness 로 포팅 — `harness lint` 4f 가 `commands/*.md` 의 description 이 1400자 cap 이내 + `Triggers —` 절을 갖는지 검사(`SHADOW-DESC`, warn). 새 명령이 트리거 없이/너무 길게 추가되면 커밋 게이트가 환기.

```
전 (before)                                  후 (after)
─────────────────────────────────          ─────────────────────────────────
 shadow refresh → 마커없는 22개 skip          shadow --force → 22개 source 로 heal
 18개 Triggers 증발 → 맨텍스트 인지 ✗          61개 전부 Triggers 보유 → 인지 ✓
 트리거 누락 감지 수단 없음                     lint 4f SHADOW-DESC(warn) 가 환기
```

- 영향: `modules/shadow.ts`(--force + `lintCommandDescriptions` + marker) · `modules/lint.ts`(4f) · `cli/index.ts`(help) · `config/severity-map.json`(SHADOW-DESC=warn) · `TOOLKIT.jsonl`.

## fix(hooks): #151 잔재 청소 — 낡은 전역 settings.json 재동기화 + 자기-repo settings.json 삭제

🧹 "방송국은 바꿨는데 옛 송출목록이 그대로였다"

- 하는 일: #151 은 *설치기*만 global-only 로 바꾸고 **이미 깔려 있던 결과물 2개**를 안 건드렸다 — 이번에 그 둘을 마저 정리한다. ① 호스트의 전역 `~/.claude/settings.json` 이 옛 설치기로 깔린 뒤 캐노니컬 훅 세트(`setup.ts:hookSpec` = SSOT)로 **재동기화된 적이 없어** `load`·`claudemd`·`architecture`·`ing`(UserPromptSubmit) · `git-context`·`toolkit`·`companions`(SessionStart) · `Stop` 게이트(`ing staleness-check`·`convergence due-check`)가 통째로 누락 + 폐기된 `handoff inject` 잔존 → `harness install-hooks` 로 재동기화(idempotent 머지). ② harness 자기 repo 의 `.claude/settings.json`(자기-도그푸드 잔존물)이 #151 의 "per-repo settings.json 금지" 정책을 스스로 위반하며 남아 있었다 → 삭제.
- 비유: 송출 규칙(설치기)은 새로 정했는데, 이미 전파 타고 나간 옛 편성표(전역 settings)와 사내 테스트 송출(자기 repo settings)을 안 내려 그대로 방송되던 것.

```
전 (before)                              후 (after)
───────────────────────────────        ───────────────────────────────
 전역 settings = 옛 세트(load 등 누락)    전역 = 캐노니컬 100% 일치
 부하줄·ing·Stop = 조용히 죽음            전역에서 정상 방출
 repo settings 잔존 → 가드/load 이중발사   repo settings 삭제 → 1중
```

- 증상(왜 "공용만 쓰니 안 됨"): repo 의 잔존 settings 가 `load inject`+가드를 따로 또 배선해 **이 repo 안에서만** 부하줄이 떠 있었다. 공용(전역)만 쓰는 순간 그 보강이 사라져 🖥️ 부하줄·claudemd·ing·Stop 게이트가 전부 무음 사망.
- 근원/재발방지: 근본원인은 "설치기 SSOT 가 바뀌어도 *기존* 전역 settings 는 자동 추적되지 않는다" — `harness install-hooks` 재실행이 유일한 동기화 경로. 호스트 onboarding/업데이트 시 재실행하면 항상 캐노니컬로 수렴한다.
- 영향: `~/.claude/settings.json`(재동기화 · 호스트-로컬) · `.claude/settings.json`(삭제 · git rm) · CHANGELOG.

## fix(hooks): 훅 배선 GLOBAL-ONLY — per-repo .claude/settings.json 금지 (중복 주입 근절)

🪝 "한 스피커만 켜기"

- 하는 일: 훅(가드+인젝트)을 까는 경로를 **전역 `~/.claude/settings.json` 1벌로 통일**한다. `harness init` 은 더 이상 per-repo `.claude/settings.json` 을 스캐폴드하지 않고(`--hooks` 플래그 제거), `harness install-hooks --repo` 는 차단(exit 1)된다. 훅 배선은 호스트당 한 번 `harness install` 로 끝낸다.
- 비유: 같은 방송을 스피커 3대(전역 install + 플러그인 + per-repo init)가 동시에 틀던 걸, 스피커 하나만 남기는 것. 3대가 같이 틀면 commons·recommend·prefs·easy 가 매 턴 2~3중으로 쌓여 사용자의 짧은 입력(`sbs auto go` 등)이 묻혀 인식이 안 됐다.

```
전 (before)                          후 (after)
─────────────────────────          ─────────────────────────
 init --hooks → repo settings        init → repo settings 안 씀
 + 전역 + 플러그인 = 2~3중 주입       전역 1벌만 = 1중 주입
 새 repo 마다 재발                    근원 차단 (init/install-hooks --repo)
```

- 근원/재발방지: `modules/init.ts` 에 `@convergence id=INIT-INJECT-DUP state=ossified` 마커. inject = host-wide 정책이라 전역 레이어가 소유하고 repo 레이어는 repo-고유(config·`.harness/*` 규칙)만 가진다.
- 영향: `init.ts`(--hooks·snippet 제거) · `setup.ts`(install-hooks --repo 거부) · `update.ts`·`cli/index.ts`(help) · README·docs/languages.md 안내 갱신.

## feat(commons): c27 — 다수 동시 서브에이전트 fan-out 은 Workflow 로 (rate-limit 사망 방지)

🚦 c27 — "동시 발사 신호등"

- 하는 일: 독립 작업을 여러 서브에이전트로 동시에 펼칠 때(≥3 동시, 또는 fleet·abg·gap full·cycle-all 배치) `Agent` 를 N개 직접 쏘지 말고 `Workflow` 도구 한 번으로 묶게 만든다. Workflow 가 동시성을 min(16,cores−2)로 cap+큐잉하고 토큰 budget 을 공유해, 동시 API 스트림 폭주로 인한 rate-limit 즉사를 구조적으로 막는다.
- 비유: 교차로에 신호등을 다는 것 — 차(에이전트) 16대까지만 동시에 통과시키고 나머지는 대기선에 줄 세운다. 신호등 없이 전부 한꺼번에 진입하면(N개 병렬 Agent) 교차로가 마비된다(rate-limit 사망).

```
전 (before)                      후 (after · c27)
─────────────────────────        ─────────────────────────
 abg/fleet → Agent ×N 동시   →    abg/fleet → Workflow 1회
 = API 스트림 N개 폭주             = cap(≤16)+큐잉+budget 공유
 = rate-limit 즉사                = 폭주 차단
```

- 적용: `config/commons.md` c27 신설(SSOT) + fan-out 런북(`templates/abg·gap·fleet·fleet-lab·fleet-abstract·fleet-full`)을 Workflow 라우팅으로 갱신. fleet 의 fire-on-arrival 스파인은 보존 — 다수 레인 동시 발사 배치만 Workflow 로 묶고, 단일 레인 재발사는 그대로 `Agent` 1개(동시 스트림 1 = rate-limit 무관). 예외: `afg`(순차·포그라운드 = 동시성 0)·단발 단일 agent 는 Workflow 불필요.

## feat(companions): sibling-CLI command surface injected at SessionStart — agent stops re-probing `hexa cloud`

🧰 companions — "이웃 도구 명함첩"

- 하는 일: `hexa` 같은 옆 프로젝트 CLI 의 명령 목록을 세션 시작에 컨텍스트로 깔아줘서, 에이전트가 "hexa 깔렸나? cloud 라는 서브명령 있나?"를 매번 더듬지 않게 한다.
- 비유: 새 사무실 첫날 책상에 동료 연락처 명함첩이 미리 놓여 있는 것 — 누가 뭘 하는지 일일이 물어볼 필요가 없다.

증상이던 누수: `hexa cloud`/`atlas`/`verify`/`drill` 이 멀쩡히 존재·동작하는데, harness 의 `toolkit inject` 는 **harness 자신의 명령**만 카탈로그로 주입했다. 이웃 CLI 표면을 깔아주는 운반 장치가 없어 매 세션 빈손으로 시작 → 더듬기 반복.

```
전 (before)                         후 (after)
────────────                        ────────────
 toolkit inject = harness 명령만 ✅    toolkit inject = harness 명령 ✅
 hexa 표면 ❌ ── 매 세션 재탐색        companions inject = hexa 표면 ✅ ── 즉시 인지
```

- **새 모듈 `companions {inject|list}`** — toolkit 의 자매. toolkit 이 harness 자신을 주입하면, companions 는 **이웃 CLI** 를 주입한다.
- **DOMAIN-AGNOSTIC 유지**: 엔진에 `hexa` 를 박지 않는다(아키텍처 1–4층 규칙). 어떤 CLI 를 띄울지는 **데이터** — repo `harness.config.json` 의 `companions` 키 + host-wide `~/.harness/companions.json` 을 cmd 기준 union(repo 우선). 그래서 hexa 는 전역 config 1곳에만 박히고, 모든 repo 세션이 자동으로 인지한다.
- **inject**: 각 companion 의 카탈로그 명령(default `--help`; hexa 는 `tool list` = 14줄 컴팩트)을 `execArgs`(8s timeout)로 실행 → `lines` 캡(default 40)으로 절단 → stderr 평문 블록 주입. cmd 부재/실패/무출력이면 그 항목 skip, 전부 없으면 무음 — companions 미설정 repo 에 영향 0.
- 등록: `cli/index.ts`(dispatch + HELP) · `hooks/hooks.json` + `modules/setup.ts` 의 SessionStart 리스트(toolkit 바로 뒤) · `lib/config.ts` 인터페이스에 `companions?` 키 · `TOOLKIT.jsonl` 재생성(70 entries).
- 재발방지: `modules/companions.ts` 에 `@convergence id=COMPANION_SURFACE_NOT_INJECTED`.

검증: `npx tsc --noEmit` (exit 0) · `toolkit check` (70 entries in sync) · `companions list`(hexa ✓ resolves) · `companions inject`(hexa 전 verb 표면 + cloud 노출 확인).

## feat(inject): ARCHITECTURE·ING turn-close gate — update + report per turn, not on-request

The every-turn ARCHITECTURE/ING injects told the model to keep the design tree and the in-progress
board current, but the directive was buried in a parenthetical note *in front of* a huge JSON dump —
so the model skimmed past it and only updated when the user explicitly asked. Two fixes:

- **Move the directive to a turn-close gate AFTER the tree/board** (recency = most-attended) in both
  `architecture inject` and `ing inject`. The gate fires per turn: if this turn changed
  code/structure/data-flow → update the affected node in-place / `harness ing done|add|next` **now**.
- **Mandate reporting**: when an update happened, the model must print `🏛️ ARCHITECTURE 갱신: …` /
  `🔵 ING 갱신: …` one-liner so the user sees what changed — but stay silent (no false claim) when
  nothing relevant changed. Pinned durably in commons c12 (turn-close section).

## docs(commons): c26 — 도구 능력·상태는 그 도구에 물어라 (바이너리 self-report = cross-repo 인지 SSOT)

CLI 도구의 서브시스템·GPU·빌드변종·버전 상태는 stale 문서/기억이 아니라 `<tool> --help`/상태 서브커맨드로 확인하라는 cross-project 규칙 추가. 동기: hexa-lang 의 flame/forge/hexa-cuda 상태가 repo-내부 README/ARCHITECTURE 에만 있어 anima 등 타 repo 세션이 GPU parity/cuda_available/릴리스를 인지 못하고 추측 → stale-claim 반복. 바이너리 self-report(`hexa gpu`/`hexa --help`)는 어느 repo 에서든 그 설치본의 현재 진실을 보여 cross-repo 인지의 SSOT가 된다.

## chore(prs): merge in 3 stranded PRs after review (c23 · c24 · ing worktree-aware) + retire superseded #125

Reconciled the 4 abandoned PRs the reaper surfaced. All had rotted to CONFLICTING (the c25 naming
rule landed in the same commons.md region), so rather than 4 fragile rebases each rule/fix was
reviewed and re-applied to current main:

- **c23** (was PR #80) — equivalent-reimplementation reads the reference white-box (intermediate-state
  diff to first divergence), no black-box tune-to-green; parity is a springboard, not a terminus.
- **c24** (was PR #82) — implementation is "done" only once wired into the production call path
  (order: implement → wire → QA); unwired/bench-only code is labelled dead-until-wired, not "done".
- **ing worktree-aware board root** (was PR #78) — `modules/ing.ts` resolves the board cwd via
  `git rev-parse --show-toplevel` (`BOARD_ROOT`), falling back to `REPO_ROOT`, so `ing add/show/done`
  in a linked worktree write to the correct repo ref instead of an ancestry-walked sibling.
- **#125** (lazy-ceiling) — superseded: the content already lives in main's c14; closed, not merged.

c23·c24 keep their original numbers (slot between c22 and the already-merged c25).

## feat(naming-guard): canonical-name discipline — warn on version/copy-suffixed file·folder names (commons c25)

New cross-project rule + mechanical guard: file/dir names should be canonical native names, NOT
carry version/copy suffixes (`_v2` · `_v12` · `_final` · `_copy` · `_old` · `_new` · `_bak` ·
`foo 2` · `foo(1)` …). Those bake history into the filename, which is git's job — the result is a
pile of stale siblings nobody dares delete. The rule: ONE canonical file, updated in place; old
versions live in git history (generalizes c4's update-in-place from docs to all files).

`pre write` now runs `naming-guard` (default-on, WARN-only — it guides, never blocks): on a Write/Edit
to a versioned name it emits `NAMING-VERSION-SUFFIX` steering to a canonical name + in-place update.
Checks the filename AND its immediate parent folder. Deliberately excludes `test`/`spec` (`_test.go`·
`.spec.ts` are canonical test naming, not version suffixes — flagging them would warn on every edit).
A genuinely intentional name (real public API versioning) is exempted with a `@canonical-ok` marker.
Rule is c25 (c23·c24 are reserved by in-flight PRs #80·#82).

- `modules/naming-guard.ts` (new) + `modules/pre.ts` wiring · `lib/config.ts` `namingGuard` flag (default true)
- `config/commons.md` c25 · `ARCHITECTURE.json` + `README.md` + `CLAUDE.md` guard inventory

## feat(pr-cycle): stale-PR reaper — abandoned open PRs no longer rot, reconciled every cycle

pr-cycle only ever handled ITS OWN branch's PR, so a single interrupted or failed merge left a PR
open forever — and no later run revisited it. Over days a once-MERGEABLE PR rots into CONFLICTING.
(Found 4 such abandoned PRs on this repo: 2 still cleanly mergeable, 2 rotted into conflicts.) New
step 6 runs after a verified merge: enumerate MY other open PRs and reconcile each — auto squash-merge
the MERGEABLE ones (same trust model as the main flow: own PR · `--admin` · `--delete-branch`) and
LOUDLY report the ones a machine can't safely land (CONFLICTING / blocked) with the exact next step
(rebase or `gh pr close`). GitHub computes `mergeable` asynchronously, so UNKNOWN is re-polled. The
reaper never fails the cycle (the primary merge is already done) and is opt-out via `--no-reap`
(threaded through `harness ship` too). Net effect: a created-but-unmerged PR can never be silently
forgotten — every subsequent cycle either lands it or shouts about it.

- `modules/pr-cycle.ts` — `reapStalePrs()` + step 6 call · `--no-reap` added to `OWN_FLAGS`
- `cli/index.ts` help line · `commands/pr-cycle.md` description/arg-hint

## docs(commons): README is a current-state SSOT (update-in-place), not a history log — same discipline as ARCHITECTURE

The doc-gate already demanded README refresh alongside meaningful changes, but only ARCHITECTURE
carried the explicit "현재상태 스냅샷, 이력 로그 아님 / update-in-place / no version·date·`이전엔…`"
discipline (commons c4). README was labelled merely "최신 정보 유지", which read as license to *append*
a history line each cycle. Per user direction, README now sits in the same class as ARCHITECTURE: a
current-state SSOT that is overwritten in place, with history living in CHANGELOG + git.

- `config/commons.md` c4 — added the README clause (current-state · update-in-place · no version/date/
  `이전엔`/`deprecated` accumulation; refreshing README = overwriting the affected section, not appending)
- `modules/pr-cycle.ts` · `modules/lint.ts` — the README doc-gate message now states "현재상태 SSOT ·
  이력 아님 = 제자리 덮어쓰기" instead of the ambiguous "최신 정보 유지"
- `README.md` — added a 📌 note declaring README a current-state SSOT (no history accumulation)

## fix(research): arXiv search ignored the query — date-sort + OR-joined terms → relevance default + per-term AND

`harness research arxiv "<free text>"` returned the *newest* arXiv uploads regardless of the query
(a "DiffusionGemma" paper for an "inhibitory plasticity continual learning" search) because the URL
hardcoded `sortBy=submittedDate&sortOrder=descending`. A free-text query wants the best-MATCHING
papers, not the latest — so the default is now `sortBy=relevance`, with `--sort date|updated` to
restore recency ordering when the caller genuinely wants it. A second bug compounded it: the query
was built as `all:<whole string>`, which arXiv expands to `all:a OR all:b OR all:c …` (so the
results matched ANY term — noisy). Each whitespace term is now prefixed `all:` and joined with `AND`
for a precise conjunctive search; a `"quoted phrase"` is kept as one `all:"…"` term. by-id lookups
are unchanged. The `arxiv`/`research` slash commands delegate to this module so both surfaces inherit
the fix. Verified against the live API: the relevance default now returns on-topic neuroscience
papers (spiking-neuron sequence learning, dendritic backprop), `--sort date` returns the latest, and
`research arxiv 1706.03762` still resolves "Attention Is All You Need".

- `modules/research.ts` — `--sort` flag + per-term AND query builder
- `cli/index.ts` help line · `commands/research.md` + `commands/arxiv.md` arg-hints/descriptions

## fix(ing): `resetIngStaleness` missing from import — `ing add`/`done` crashed with ReferenceError

`modules/ing.ts` called `resetIngStaleness()` at two sites (after a board write — `add` and `done`,
to clear the edits-since-update counter, c6) but its import line pulled in only `ingStalenessWarn`
from `./ing-staleness.ts`. Because `tsx` runs transpile-only (no type-check), the missing binding
was not caught at load — `harness ing help`/`show` passed, but any write path threw
`ReferenceError: resetIngStaleness is not defined` at runtime, forcing manual git-plumbing
fallbacks to register ING entries. Root cause was a split-import omission (the function was always
exported from `ing-staleness.ts`); fix adds `resetIngStaleness` to the existing import. Verified:
`ing add --stdin` now exits 0 and the entry shows in `ing show`.

## feat(load): per-turn macOS resource readout — CPU load + RAM pressure + swap (⚠️ on danger)

New `harness load {show|inject}` module wired into `UserPromptSubmit` so every reply opens with a
one-line resource readout. Motivation: the user's Mac kept dying under load — and a Mac that dies
fails on MEMORY (compressor + swap blowup), not CPU. So CPU load alone was insufficient; the line
now carries three axes with traffic lights:

- **CPU** = load1 / cores (🟢<0.7 · 🟡<1.0 · 🔴≥1.0)
- **RAM** = (active+wired+compressor) used% + kernel pressure level (normal/warn/critical)
- **swap** = used (🟢<2G · 🟡<6G · 🔴≥6G)

When any axis is 🔴 or kernel pressure ≥ warn the line flips to `⚠️ 부하` and injects a guard note
telling the agent to advise against heavy work (mass build · parallel agents · GPU). Cost-safe by
design: reads only `sysctl` + `vm_stat` (instant) — deliberately NOT the `memory_pressure` CLI,
which does a full system scan and would be too heavy for an every-prompt hook. Non-macOS → no-op.

- `modules/load.ts` + `cli/index.ts` registration + help line
- `hooks/hooks.json` UserPromptSubmit (+ mirrored in `modules/setup.ts`, `modules/init.ts`,
  `.claude/settings.json`) · `commands/load.md` slash delegator (`/load`)

## docs(commons): lift two fleet-full lessons to cross-project governance (c14·c19)

The fleet-full runbook hardening was project-specific; two of the lessons are project-agnostic
and belong in the always-on commons SSOT so every agent (not just fleet campaigns) inherits them:

- **c14 (d) — mechanism-family census**: strengthened the lazy-ceiling rule. "N levers falsified
  → 🧱" is NOT dry when the N levers are all one family — orthogonal families went unexplored.
  Enumerate (cite) orthogonal mechanism families and falsify each before declaring a wall; one
  family exhausted is a reopen target, not a terminus. (Empirical: a TF32 "hardware ceiling" was
  precision-emulation-family tunnel vision; megakernel/Stream-K/sparsity families reopened it.)
- **c19 — long-runner agent lifecycle**: added "how to read a delegated long-running agent's
  state without killing it." Slow ≠ stalled; re-ping/resume of a live agent RESETS its progress
  (the pinging causes the stall); when in doubt capture ground-truth on the host (`pgrep`/
  `nvidia-smi`/`tail`) instead of guessing; "came to rest" with empty output ≠ a result; verify
  a late notification against current main/SSOT before acting (may be stale/superseded);
  checkpoint pushes are the precondition for resume-not-restart.

## docs(fleet-full): harden the runbook with 3 field-proven lessons from a long GPU campaign

A multi-hour `fleet full` campaign (forge cuBLAS-independence on hexa-lang) surfaced three
recurring failure modes the runbook didn't guard against. Folded them back into
`templates/fleet-full.md`:

- **long-runner lifecycle (§5.5, new)** — the biggest one. A legitimate ~30–50 min GPU
  measurement was mis-read as a "stalled zombie" ~8 times; each re-ping/resume RESET the
  agent's progress and re-triggered a "still warming up" report — the pinging itself caused
  the stall. Rule: slow ≠ stalled; never re-ping a live measuring agent; when in doubt capture
  ground-truth directly on the host (`pgrep`/`nvidia-smi`/`tail log`) instead of guessing; a
  "came to rest" with empty output is NOT a result; verify a late "came to rest" against
  current main/SSOT before acting (it may be a stale/superseded duplicate).
- **mechanism-family census (§3)** — a frontier was declared a measured 🧱 after falsifying 3
  levers that were all ONE family (precision-emulation); orthogonal families (sparsity,
  sub-cubic, fusion, megakernel) were never enumerated. Rule: "N levers falsified" within a
  single family ≠ dry → reopen (🔓) on the orthogonal family. §6 depletion now requires
  exhaustion across mechanism *families*, not just deeper params of one.
- **착륙 = 수치 / landing = numbers (§3)** — an agent returning without captured measurements
  (or only a commit-message "MEASURED" claim) is NOT a landing: re-fire the same round, never
  advance the phase (c2).

## feat(ship): one-shot propagate to ALL surfaces — pr-cycle → self-update → shadow

A harness change lives on three surfaces — the merged repo, the global CLI clone
(`~/.harness/cli`), and the shadow mirror (`~/.claude/commands/`, the source of bare `/cmd`
slash commands since plugin.json ships `commands: []`). The standard cycle ran `pr-cycle` +
`self-update` but NOT `shadow`, so a newly added slash command (`/fleet-abstract`, `/fleet-full`)
merged and worked from the terminal yet stayed **invisible in the picker** — reloading the
plugin couldn't help, because the plugin doesn't serve commands at all. Root cause: the three
propagation steps were separate and one was routinely forgotten.

- `harness ship [--no-doc]` (`modules/ship.ts`): runs the three in the one correct order —
  pr-cycle (verified merge) → self-update (global CLI) → shadow (re-mirror slash commands) —
  and STOPS on the first failure (a failed merge never touches CLI/shadow). `--no-doc` forwards
  to pr-cycle for config/data-only changes. `@convergence SHIP_PROPAGATE_ALL_SURFACES`.
- `commands/ship.md` slash delegator (bare `/ship`, KO/EN triggers); HELP line + ARCHITECTURE
  node + README list; TOOLKIT catalog 67 → 68 (in sync).
- `CLAUDE.md` 작업 규칙: **구현 후에는 항상 `harness ship`** — codified so the shadow step can
  never be dropped again.

## feat(fleet): abstract + full modes — abstraction-driven dive & full-stack auto-phasing campaign

`fleet` was a 2-mode engine (generic build lanes + `fleet lab` research frontier). Empirical
search (`lab`) stops at tool/cost ceilings, and there was no codified counterpart for the
*abstraction* direction — stepping back from accumulated laws to derive a meta-law and design
an escape principle by thought when the instruments are exhausted. Two new modes close that gap.

- `modules/fleet.ts`: refactored the `lab: boolean` flag into a `Mode` map (fleet · lab ·
  abstract · full) — one engine, per-mode roster file + runbook + vocabulary so a build-fleet,
  research-lab, abstraction-dive, and full-stack campaign coexist in one repo without clobbering
  each other's roster.
- `fleet abstract` (`templates/fleet-abstract.md`, roster `.harness/fleet/abstract`):
  abstraction-driven layer dive. Each lane = an accumulated law-set / ceiling empirical search
  couldn't break. Rounds: census LAWS → peel one layer to the shared trade-off (meta-law) →
  invent an escape principle (orthogonal lever) → cast as a falsifiable prediction + cheapest
  refutation, handed to compute/research. Meta-laws (🌌) reopenable by a new lens; all output
  flagged abstract/unverified (d6 — coordinates, not discovery); lazy-ceiling forbidden (c14 d).
- `fleet full` (`templates/fleet-full.md`, roster `.harness/fleet/full`): full-stack campaign
  that auto-phases research→implement→abstract→falsify per frontier — cheap research finds
  levers → justified implement+measure → empirical wall → auto-promote to abstraction → escape
  becomes a falsifiable prediction → descend back to experiment. Depletion needs BOTH axes dry.
- `commands/fleet-abstract.md` + `commands/fleet-full.md` slash delegators (bare `/fleet-abstract`
  · `/fleet-full`, KO/EN triggers); HELP lines + ARCHITECTURE fleet node + README list updated;
  TOOLKIT catalog 65 → 67 (in sync, coverage gate green).

## fix(toolkit): catalog truncation — 6 commands were silently dropped (+ coverage gate)

The HELP-body extraction searched for a bare `` `; `` close delimiter, but the HELP text
contains an ESCAPED inline backtick (`worktree gc\`;` on the worktree line) — so extraction
truncated THERE, silently dropping every command after worktree from the catalog
(atlas · convergence · ing · sync · upstream · verdict). The agent-facing catalog (and
TOOLKIT.jsonl) was missing 6 commands.

- Fix: close on the line-start `` \n`; `` (the real template terminator), not an escaped
  inline `` \`; ``. Catalog 59 → 65 entries (all dispatch commands now present).
- New coverage gate: `toolkit check` asserts EVERY `cli/index.ts` dispatch `case` is in the
  catalog (alias map excepted) → exit 1 on any uncatalogued command, so a new command can
  never silently miss the catalog again. `harness lint` surfaces it as TOOLKIT-DRIFT (warn).
- `@convergence HELP_CLOSE_DELIM_NEWLINE`.

## fix(research): robust arXiv rate-limit handling — backoff retry + agent-recognizable notice

Extends the prior rate-limit fix: arXiv throttles a burst with MULTIPLE signals —
a `Rate exceeded.` text body, an HTTP 429, OR a 503 page — all with 0 `<entry>`, all
looking like an empty result. The string-only check missed the 429/503 pages, so the
command still said `no results` for queries with thousands of papers.

Now `research arxiv`:
- detects a throttle by `status >= 500` OR `/rate exceeded/` OR a non-Atom body (a real
  empty result is a valid `<feed>` with totalResults 0 — that path is untouched);
- **auto-retries with backoff** (3s, 6s) — a transient burst self-heals, and EACH backoff
  emits a `⏳ arXiv rate-limited (burst · HTTP <code>) — auto-retry n/2` notice so an AI
  agent recognizes a RATE problem (recoverable), not a stuck/broken command;
- on persistence, `loudFail`s with `… this is a RATE limit (not a missing paper / not a
  bug). Wait ~30s and retry` (exit 1) — never the misleading `no results`.

Verified live while arXiv was actively throttling (HTTP 429): two backoff notices then the
clear rate-limit error. `@convergence ARXIV_RATELIMIT_NOT_NORESULTS` (state updated).

## fix(research): distinguish arXiv rate-limit from genuine no-results

QA of `research arxiv` surfaced a symptom-hides-cause bug (c1): arXiv throttles a
burst (>~1 req/3s) with a bare `Rate exceeded.` body, which has 0 `<entry>` elements
— identical to a real empty result set — so the command reported `no results for
"<id>"` for papers that DO exist. Now the empty-entry path checks for the throttle
body and emits a clear rate-limit error (exit 1) instead. Verified live while the
throttle was active: `research arxiv hep-th/9901001` → "arXiv rate-limited this
request … wait ~30s and retry". `@convergence ARXIV_RATELIMIT_NOT_NORESULTS`.

QA verdict (this session): research arxiv search ✅ · by-id ✅ ("Attention Is All You
Need") · usage ✅ · no-results ✅ · rate-limit ✅ (now distinguished) · research yt ✅
(3blue1brown, 286 transcript lines). arxiv needs no key (public API); secret resolves
~/.hx/bin/secret with 20+ keys.

## feat(toolkit): agent-facing command catalog + SessionStart injection (sidecar TOOLKIT parity)

Commands existed and worked, but an AI agent only learned of them REACTIVELY — via a
keyword trigger — so commands without a trigger (`research`/`arxiv`, `secret`, `imagine`,
`watch`…) were a discoverability blind spot: the agent didn't know to reach for them.

🗂️ toolkit — "harness 명령 카탈로그"

New `harness toolkit {list|inject|json|write|check}` (`modules/toolkit.ts`):
- SSOT is the `HELP` text in `cli/index.ts` — toolkit PARSES it (read as text to avoid the
  entry module's import side effects), so there is ONE source and zero drift. Each command
  is enriched with its keyword triggers (from `keywords.json`) as `⟨triggers⟩`.
- **inject** — SessionStart additionalContext: the WHOLE command surface as a compact
  `id — use ⟨triggers⟩` catalog, so the agent proactively knows every command (matches
  sidecar's once-per-session COMMANDS.md injection). Wired into `hooks.json` + `setup.ts`.
- **write** — materializes `TOOLKIT.jsonl` (repo-root committed artifact, 59 entries).
- **check** — regenerates from HELP and snapshot-diffs the committed file → exit 1 on drift.
  `harness lint` surfaces drift as **TOOLKIT-DRIFT (warn)** — warn, not block, because the
  inject regenerates live from HELP so the agent is always current; the file is the snapshot.

Also closes the immediate gap surfaced while QAing `research arxiv` + `secret` (both verified
working — arxiv keyless public API, secret resolves `~/.hx/bin/secret` with 20+ keys).

## docs(commons): c14 (d) — 게으른 천장(lazy ceiling) 금지 · research census + 측정이 천장의 심판

c14 의 벽 분류 (d) "진짜 천장" 에 **lazy-ceiling 금지** 규칙을 추가했다. 그동안 (d) 는 MULTI-LENS
+ ABLATION 으로만 천장을 확정하라 했지, **성능/하드웨어 천장 특유의 함정**은 명시하지 않았다.
실증 사고: forge GPU TF32 미달(512–3072 `~0.87×`)을 1-pass 직관으로 "consumer Blackwell FP32-accum
하드웨어 천장"이라 박제 → deep research census 가 게으른 프레임을 깼다(FP16-accum 분할보상
[Ozaki/3xTF32, arxiv 2203.03341] 우회 후보 = 잘못된 축 가능성).

**단 — research 가설은 확정이 아니다(c2)**: GPU 측정이 그 우회로를 정밀화했다 — 정확도는 ~400×
향상(FP32-equiv·deterministic moat)이나 속도는 1.5–1.8× **더 느림**. 측정 root-cause = 그 카드
FP16:TF32 비가 ~1.8× 뿐(datacenter 2–4× 가정이 consumer 5070 미적용) → MMA-multiplier(2–3×) >
rate-advantage → 속도-우회는 hardware-dependent, **5070 에선 closed**. r-sched(LDS cadence) 변종도
byte-eq PASS(max|Δ|=0)이나 perf flat — ptxas 가 이미 near-optimal(CloudRift 5090 finding 미전이).

규칙: ⓐ 알고리즘 cite-census(파라미터 sweep 아님) → ⓑ 레버를 측정(c2)으로 검증 → ⓒ 인용 레버를
전부 시도/falsify 한 뒤에만 terminal 🧱. 1-pass 직관 박제 = 게으른 천장. 흔한 함정 = wrong-axis.
research 는 게으른 프레임을 깨고 미시도 레버를 드러내되 **측정이 최종 심판** — 남은 레버(Ozaki-INT8
n≥8K, INT8 이 ~4× rate 라 multiplier 초과) 시도 전엔 미완. 진짜 천장도 흔히 양쪽 공유 캡 →
"parity 도달, 너머는 구조 레버(fusion·결정성)" 가 정직한 종착이지 "미달"이 아니다.

## fix(worktree): age backstop in gc — stop squash/no-push agent worktrees piling up

`worktree gc` (and pr-cycle's sweep) reaped ONLY worktrees whose upstream is `[gone]`
(pushed + remote-deleted). Fleet / sub-agent worktrees created with `isolation:worktree`
are usually squash-merged and never individually pushed → their branch never gets
`[gone]` → both sweeps skipped them forever. Result observed: 67 worktrees / 84GB / 6
days of accumulation.

🌳 age 백스톱 — "오래된 천막은 나이로 걷는다"

- gc now reaps an AGENT worktree on EITHER `[gone]` upstream OR HEAD-commit age >
  `worktree.maxAgeDays` (new config, default 3).
- The unconditional live-work guards are unchanged: dirty / locked / recently-touched
  (<1h) worktrees are NEVER wiped.
- An aged worktree carrying un-pushed commits has its tip preserved under
  `refs/reaped/<branch>` BEFORE removal — fully recoverable (`git worktree add <path> <sha>`),
  while the working-tree disk is reclaimed.

Verified in an isolated clone: a 6-day-old unpushed agent worktree → tip saved to
`refs/reaped/agent-aged` then swept; a <1h worktree → skipped (protected).

pr-cycle's own-branch `[gone]` sweep is unchanged (it correctly reaps the branch it just
merged); the age backstop in the SessionStart `worktree gc` is what collects the orphaned
fleet leftovers.

## feat(convergence): capture-token enforcement loop (emit → resolve → Stop nudge)

The recurrence trigger no longer just prints an advisory hint — it now closes a
mechanical loop so a "detected a recurrence but never wrote the marker" gap can't
slip silently past (c1).

🎟️ 캡처 토큰 — "놓치면 안 되는 일에 번호표 붙이기"

- EMIT — a `convergence-recurrence` keyword match (rule gains `capture:CONVERGENCE-DUE`)
  prints a unique `⟦CONVERGENCE-DUE id=… matched="…"⟧` token AND records a debt to
  `logs/convergence-debt.json` (`markCaptureDebt`).
- RESOLVE — a post-edit that lands a *well-formed* `@convergence` marker in a code file
  clears the debt synchronously (`resolveConvergenceDebtOnEdit` → `scanFileMarkers`,
  reusing the same validator so a malformed marker does NOT count).
- ENFORCE — at session Stop, `harness convergence due-check` warns once if the debt is
  still open, then resets (`convergenceDueWarn`) — the same warn-only soft-nudge shape
  as `ing-staleness` (the recurrence keyword can false-positive, so no hard block).

Data-driven: the engine reads a generic `capture` field on the keyword rule (no trigger
id hardcoded). Wired into both the plugin Stop hook (`hooks.json`) and `harness init`
setup (`setup.ts`). Verified end-to-end: emit → token+debt, due-check → warn+reset,
marker edit → auto-resolve, malformed marker → does NOT resolve; `convergence scan`
stays clean (24/24 well-formed).

## feat(convergence): broaden recurrence-trigger patterns (user-curated + memory-frequency)

Expanded the `convergence-recurrence` keyword trigger so it fires on far more recurrence phrasings,
prompting the inline `@convergence` marker (c1). Patterns now include bare high-signal tokens curated
with the user + drawn from cross-repo memory frequency: `또`·`다시`·`실수`·`원인`·`⚠️`·`OOM`
(+`out of memory`·`oom-kill`·`메모리 부족`)·`재발`·`stale`·`낡은`·`구버전`·`회귀`·`regression`·
`recurr`·`broke again`·`keeps breaking`·`reintroduced`·`reopened`… (39 patterns). Bare `또`/`다시`/
`실수`/`원인` over-fire by design — the user opted for broad recall (the hint is an advisory reminder,
not a block). JSON validated; trigger fires on `또 OOM 으로 죽었어`.

## feat(convergence): mechanically ENFORCE inline @convergence markers (c1) — scan gate + recurrence trigger

@convergence recurrence-prevention markers (c1) were a guideline only — nothing validated them and
nothing fired when a defect actually recurred. Now hardened to a gate:
- **`harness convergence scan`** (NEW) — scans git-tracked code (ts/hexa/py/sh/go/rs/c…) and validates
  every `@convergence` marker carries the required keys `state`·`id` + a state in the allowed enum;
  exit 1 on any malformed. Detection requires a `<key>=` after the tag, so prose mentions of the tag
  in comments are skipped (no false positives). MARKER_TAG is split in-source so the scanner never
  flags its own file.
- **`harness lint` gate** — calls the scanner; malformed markers raise `CONVERGENCE-MALFORMED`
  (severity-map → block), so a commit can't ship a half-written marker.
- **recurrence keyword trigger** (`config/keywords.json` convergence-recurrence) — fires on recurrence
  signals and injects a reminder to write the inline marker. Patterns DIVERSIFIED from cross-repo
  memory frequency (top signals: stale·regression·again·재발·recurrence·repeat) — 재발·stale·낡은·
  구버전·회귀·"또 깨/터/났"·regression·recurr·"broke again"·"keeps breaking"·reintroduced·reopened…
- commons c1 + ARCHITECTURE convergence node + cli help reworded: marker is mechanically gated, not
  advisory. Verified: 22 existing markers pass scan (exit 0); a missing-state marker → exit 1.

## fix(shadow): marker AFTER frontmatter — picker shows command descriptions, not the marker comment

`harness shadow` PREPENDED `SHADOW_MARKER` (`<!-- harness-shadow … -->`) to each generated
`~/.claude/commands/*.md`, pushing the YAML frontmatter to line 2. Claude Code only parses
`description:` when the `---` fence is on line 1, so all 35 shadow-generated commands rendered the
marker comment as their slash-picker description (e.g. `/architecture  <!-- harness-shadow: …`).
Root cause (c1): marker placement broke frontmatter position. Fix: `withMarker()` inserts the marker
AFTER the closing `---` of the frontmatter (frontmatter stays on line 1 → description renders);
no-frontmatter files still prepend. Marker still present → `isHarnessShadow()` / `shadow remove`
tracking unchanged (35/35 retain it). `@convergence SHADOW_MARKER_AFTER_FRONTMATTER` records the
recurrence guard. Verified: regenerated shadows have `---` on line 1 + description intact.

## fix(plugin): `commands: []` — kill duplicate slash entries (`/fleet` + `/harness:fleet` → bare `/fleet` only)

The picker showed EVERY command twice: a bare `/fleet` (from `harness shadow`'s user-scope
`~/.claude/commands/fleet.md`) AND a namespaced `/harness:fleet` (from the plugin auto-loading its
`commands/` dir). Root cause (c1): the plugin double-registered commands that `harness shadow` already
exposes bare. Claude Code namespaces plugin commands as `/<plugin>:<cmd>` UNCONDITIONALLY (verified
against the plugins-reference manifest schema — there is no bare-command escape hatch from inside a
plugin; per-command "micro-plugins" still yield `/fleet:fleet`, NOT bare). The retired sidecar showed
bare single commands because it shipped them as user-scope files, not as plugin commands.

Fix: `.claude-plugin/plugin.json` adds `"commands": []`, which REPLACES the default `commands/`
directory scan with an empty list (plugins-reference: the `commands` field "replaces the default") →
the plugin registers ZERO namespaced commands. Slash commands now come ONLY from `harness shadow`'s
bare `~/.claude/commands/*.md` delegators → one bare `/fleet` in the picker, no `/harness:fleet`. The
`commands/` files still ship in the plugin (they are the source shadow mirrors from) — they are just
not loaded as plugin commands. Aligns the plugin with harness's own shadow design. plugin.json bumped
0.9.6 → 0.9.7; `comment_commands` field documents the intentional-empty so it is not "fixed" later.
Takes effect after `/plugin update` + reload. Docs lockstep: CLAUDE.md tree + ARCHITECTURE plugin
node + commands node. (Also `commands/fleet-lab.md` added so `/fleet-lab` shows bare via shadow.)

## feat(fleet): `fleet lab` — research-driven perpetual frontier lab (a `fleet` subcommand)

A research-specialized variant of `/fleet`. Each lane is a BLOCKING FRONTIER (a wall); every round
gates CHEAP research (web/arxiv/code-census, mini-safe) BEFORE expensive implement/measure
(pool/GPU/build), then records the measured result to SSOT, then re-researches or walls. Walls (🧱)
are declared only by MEASUREMENT and are REOPENABLE by new research. Codifies the manual
"research-first → measure → SSOT → repeat" loop (reference-first / implement-to-wall) so a frontier
gets peeled one researched lever at a time instead of being declared a wall on shallow grounds.

- `templates/fleet-lab.md` (NEW) — the lab runbook: research-gate lifecycle, wall discipline
  (measured + reopenable), 🔬 lab report shape, SSOT-record step (ARCHITECTURE.json
  `blocking-frontiers` + memory), cost/destructive halts inherited from fleet.
- `modules/fleet.ts` — leading `lab` token branches to a SEPARATE roster `.harness/fleet/lab`
  (so a research-lab run and a build-fleet run coexist without clobbering) + prints `fleet-lab.md`.
  Reached via the existing `/fleet` sidecar (`/fleet lab …` → `harness fleet lab …`) — NO new
  command/module/slash needed since `lab` is a `fleet` subcommand, not a top-level command.
- `cli/index.ts` — help line for `fleet lab`.

## chore: scrub dead `sidecar` provenance refs from live code/docs (history + convergence preserved)

`sidecar` was harness's RETIRED predecessor package; harness was ported from it, leaving
"(sidecar X parity)" provenance markers scattered through comments/docs/ARCHITECTURE. The package is
long gone, so these are dead references — zero function, only confusion. Removed all LIVE refs (25
files: `modules/*.ts` except shadow, `lib/config.ts`, `cli/index.ts`, `ARCHITECTURE.json`,
`CLAUDE.md`, `README.md`, `commands/verify.md`) with grammar preserved (`(sidecar X parity)` dropped;
prose forms rewritten; `(sidecar 패턴)` → `(슬래시-명령 패턴)`). PRESERVED: `CHANGELOG.md` (append-only
history — "ported from sidecar" was true when written, c4) and `modules/shadow.ts` (its
`@convergence SHADOW_GEN_NATIVE` record is the dead-sidecar-cache-path recurrence guard — the word is
load-bearing there, c1). Residual `sidecar` outside those two = 0 (grep-verified); `harness help`
loads + `ARCHITECTURE.json` valid.

## feat(danger-guard): rm-rf-root block is now opt-in (config dangerGuard.rmRfRoot, default OFF)

Per user request — `rm -rf` should not be guarded. The catastrophic-delete block (`rm -rf /` · `/*` · `~` ·
`$HOME` · `*`) is now gated by `config.dangerGuard.rmRfRoot`, default `false` = NOT guarded. The other
three code-level danger rules (`--no-verify` gate-bypass · `git reset --hard` tree-destroy · `curl|sh`
remote-exec) stay always-on.

- `modules/danger-guard.ts` — `detectDangerousBash` skips `DANGER-RM-RF-ROOT` when `!dangerGuard.rmRfRoot`.
- `lib/config.ts` — new `dangerGuard: { rmRfRoot: boolean }`, default `{ rmRfRoot: false }`.
- Removed the `H-RM-RF-ROOT` regex rule from `config/enforcement.json` AND `.harness/enforcement.json`
  (the config-layer backup would otherwise still block regardless of the code toggle).
- Verified: toggle off (default) → `rm -rf /` · `~` · `$HOME/*` pass; reset-hard + curl|sh still block;
  toggle on → rm-rf-root blocks again. Re-enable any time with `dangerGuard.rmRfRoot: true`.


## fix(self-update): always target the GLOBAL install (~/.harness/cli), never reset a dev clone

`self-update` updated `HARNESS_ROOT` — whichever clone the running binary lives in. Run via `npx tsx`
from a dev checkout it updated THAT clone and reported `already current` **without the path**, so it
looked like the global install on PATH had refreshed when it hadn't (the global `~/.harness/cli` stayed
stale). Worse, `git reset --hard origin/main` against a dev clone silently discards local commits/work.

- `modules/setup.ts` — `selfUpdate()` now ONLY ever refreshes `GLOBAL_CLI` (`~/.harness/cli`, what the
  `harness` wrapper on PATH runs) via the extracted `updateClone(dir)` helper. The path is printed even
  on `already current`, so it is never ambiguous which clone was checked. When invoked from a different
  (dev) clone it prints a note that the GLOBAL install was updated — not the running clone — and never
  touches the dev clone (no destructive `reset --hard` on hand-edited work; use git there).
- Verified: global behind → `318c5d3 → 6a65fc0 — global …` advance; already-current → path shown;
  dev-clone uncommitted changes preserved across the run.


## feat(mem-guard): OOM prevention — free-RAM preflight before bg-spawn + opt-in launchd notify watchdog

A recurring, expensive failure on a 16GB Mac: parallel fan-out (cycle-all / all-bg-go / fleet) accumulates
6+ detached `claude` agent processes (~400-490MB each) across sessions until macOS jetsam force-quits apps —
"the Mac keeps dying." Diagnosed from real `JetsamEvent-*.ips` reports (6/13–6/18) + a kernel panic (6/17):
the six top memory holders at OOM time were all `2.1.179` (claude) processes. Nothing throttled the spawn.

- `modules/mem-guard.ts` (new) — two layers:
  - **PreToolUse preflight** (always-on, `config.memGuard.enabled`): before a background-spawn bash command
    (`… &` / nohup / disown / setsid), `memInfo()` reads system available RAM from `vm_stat`+`sysctl`
    (free+inactive+speculative+purgeable). Below `warnPct` (15) → WARN; below `blockPct` (0 = off by default)
    → BLOCK the spawn. Wired into `modules/pre.ts` as `MEM-LOW`/`MEM-OOM`, before the config rules.
  - **launchd watchdog** (OPT-IN via `harness mem-guard install`): a LaunchAgent runs `mem-guard tick` every
    `watchdogIntervalSec` (45) and posts a macOS notification when available RAM is low — throttled to once
    per 5 min. NOTIFY-ONLY (never kills, never changes a setting). The only layer that sees ACROSS separate
    Claude sessions (each session's preflight is blind to the others — the actual accumulation that OOMs).
- Verbs: `status` (snapshot + top holders), `check` (exit 1 if low · scriptable), `tick`, `install`/`uninstall`.
  Registered in `cli/index.ts` (+ `mem` alias) + help line. Config `memGuard{enabled,warnPct,blockPct,watchdogIntervalSec}`.
- Verified: detection 11/11 (`&` matched, `&&` not); block path → `permissionDecision:deny`; warn-only path
  (blockPct=0) → stderr only, exit 0; non-spawn → no-op; `status`/`check`/`tick`/usage all pass.
  `@convergence in_flight MAC_OOM_FANOUT_JETSAM`.

## feat(git-context): SessionStart stale-branch guard — warn when HEAD is behind origin/<default> (plugin 0.9.5 → 0.9.6)

A recurring, expensive failure: a session starts on a stale branch (HEAD behind origin/main after a merge),
the agent reads the pre-merge code, believes it is current, and re-implements already-merged work. Real
incident — a duplicate fix PR (#3736) was built for work already merged (#3734) because the session began on
an old feature branch and never noticed HEAD ≠ the merged tip. Nothing flagged the staleness.

- `modules/git-context.ts` (new) — `git-context inject` (SessionStart) computes HEAD vs origin/<default>
  (main|master) from LOCAL refs (no network fetch): `rev-list --left-right --count <ref>...HEAD`. When HEAD
  is BEHIND (or detached-stale) it injects a loud ⚠️ block with the exact remedy — `git log origin/<default>
  -- <file>` before trusting any file as current, and checkout/rebase before starting new work. On a clean
  default branch it stays SILENT (no context noise). `git-context show` prints the position on demand.
- Wired into SessionStart in both `hooks/hooks.json` (plugin) and `modules/setup.ts` (settings.json install).
  Registered in `cli/index.ts` + help line.
- Verified: clean `main` → silent (0-char inject); synthetic branch 2-behind origin/main → ⚠️ STALE block
  fires (show + inject both). `@convergence in_flight STALE_BRANCH_TRAP`.
- plugin.json 0.9.5 → 0.9.6.

## feat(ing): c6 ing-staleness nudge — warn at Stop when code edited but board untouched (plugin 0.9.4 → 0.9.5)

The every-turn `ing inject` only ever SHOWED the board; nothing nudged the agent to UPDATE it as work
moved, so the board drifted stale and the next session's inject surfaced an out-of-date picture. Added a
soft staleness nudge. (A hard commit-block was rejected: there's no ground truth for "this edit should
change ing", so blocking would be a false-positive factory — this is warn-only.)

- `modules/ing-staleness.ts` (new) — a file-backed counter in LOG_DIR: `bumpEditIfCode` (called from
  `post edit`) increments on each CODE file edit (docs/config ignored); `resetIngStaleness` (called from
  `ing add/next/done`) clears it; `ingStalenessWarn(threshold)` returns a one-line warn + resets when the
  counter ≥ threshold (so it nags at most once per N edits, not every Stop).
- New `Stop` hook → `harness ing staleness-check` (wired in both `hooks/hooks.json` and the settings.json
  install path `modules/setup.ts`). Threshold is `config().ing.editThreshold` (default 5; 0 disables).
- This is the buildable slice of "강제 할수 있나": inject is already force-delivered every turn, and
  ARCHITECTURE currency is already a HARD commit block (lint CHANGELOG/ARCHITECTURE rules = `block`
  severity). ing freshness can only be nudged (warn), not forced — documented as such.
- Verified: 7/7 lifecycle cases (under-threshold silent · docs ignored · threshold-hit warns · resets after
  warn · ing-touch clears · threshold 0 disables) + CLI `ing staleness-check` warns once then goes silent.
- plugin.json 0.9.4 → 0.9.5.

## feat(heartbeat): c22 now auto-tracks un-registered `&`/nohup background long-runners (plugin 0.9.3 → 0.9.4)

The c22 abandonment guard (≥10-min check of a live long-runner) only ever fired for jobs registered via
`ing pod add` or the ledger work-registry. A fire-and-forget job thrown with a bare `&`/`nohup`/`disown` —
the most common way to leave something running and walk away — was invisible: `live` was empty so
`staleLongRunnerWarn` returned null and the 10-min nudge never came. This is exactly the gap "왜 10분 강제 안되지"
pointed at.

- `modules/heartbeat-guard.ts` — new `detectBackgroundLaunch(cmd)`: a detach construct
  (`nohup`·`setsid`·`disown`·trailing job-control `&`) over a known long-runner / sub-agent term
  (`claude -p`·`hexa cloud`·`torchrun`·`deepspeed`·`runpodctl`·`vastai`·`training`·`dojo`·`sbatch`/`srun`…).
  `recordAutoRunner` persists the detected job to `auto-runners.json` and arms the `.live-runner` marker;
  `autoRunnerLabels` reads non-expired entries and GCs them. `staleLongRunnerWarn` now merges these
  auto-detected labels alongside pods + ledger agents.
- 2h TTL (`AUTO_RUNNER_TTL_SEC`) auto-expires an auto-detected job — we can't observe a detached job's exit
  (its PID isn't in the command string), so the TTL bounds the false-nag window for jobs that already finished.
- `modules/post.ts` — `post bash` calls `detectBackgroundLaunch` + `recordAutoRunner` on every command, so an
  un-registered launch is tracked the moment it runs (no `ing pod add` needed).
- Verified: 9/9 detection cases (nohup/claude -p/disown/setsid match; `python train.py`, `ls -la &`,
  `echo && echo`, `2>&1` correctly NOT matched); warn fires for an un-registered bg job; TTL expires at 3h.
- plugin.json 0.9.3 → 0.9.4.

## feat(pool): `pool list` now shows LIVE CPU + GPU load per host (plugin 0.9.2 → 0.9.3)

`pool list` previously read only the cached roster (offline) — it showed static specs (cores/mem/GPU) but
nothing about how busy each host is right now. Added a live-load probe so `list` answers "which host is free?"
at a glance.

- `modules/pool.ts` — new `LOAD_PROBE` (POSIX-sh, Linux + macOS): emits `LOAD=<loadavg1>|CORES=<n>|GPU=<util,memUsedMiB,memTotalMiB,count|none>`.
  CPU load = 1-min loadavg ÷ cores → %; GPU = nvidia-smi averaged util + summed VRAM across all GPUs. `list`
  SSH-probes every non-blocked host in PARALLEL (pmap, cap 8) and appends a `⚡CPU N% · GPU M%·used/totalGiB` badge.
- Load is NOT cached (unlike specs) — it changes second-to-second, so `list` now does a live SSH round-trip
  (blocked restricted hosts are never reached; unreachable hosts show `⚡도달 불가`). Specs stay cached.
- Verified: `pool list` on the live roster shows `aiden ⚡CPU 141%(16.87) · GPU 0%·0.2/12GiB`, blocked
  hosts (akida·ghost) un-probed.
- plugin.json 0.9.2 → 0.9.3.

## fix(exec): spawn `error` event was unhandled → a SessionStart hook crash (plugin 0.9.1 → 0.9.2)

`/reload-plugins` in a repo with a stale linked worktree (its dir deleted) crashed the SessionStart hook
(`node:events` — "Emitted 'error' event on ChildProcess"): `worktree gc` ran `git status` with `cwd` set to
the gone worktree path, `spawn` raised ENOENT, and `lib/exec.ts execArgs` had NO `'error'` listener — so the
unhandled event killed the whole hook (and the promise would also have hung, never hitting `close`). Every
`execShell`/`execArgs` caller was exposed to this (any spawn ENOENT/EACCES, e.g. a minimal-PATH hook env).

- `lib/exec.ts` — `execArgs` now handles the child `'error'` event: degrade to a non-zero `ExecResult`
  (`code 127` + the spawn error in stderr) via a single-resolve guard, so a spawn failure never crashes the
  process or hangs. The stdin write/end is wrapped too (child may already be gone). `@convergence ossified
  EXEC_SPAWN_ERROR_UNHANDLED`.
- Effect: `worktree gc` (and all hooks) tolerate stale/dead worktree dirs — they degrade and get pruned
  instead of crashing SessionStart. Verified: `worktree gc` in the affected repo swept 42 items, exit 0;
  `execShell` on a nonexistent cwd returns code 127 (no crash).
- plugin.json 0.9.1 → 0.9.2.

## fix(guard): rm -rf guard was over-blocking — now matches the root ITSELF, not every absolute path (plugin 0.9.0 → 0.9.1)

`DANGER-RM-RF-ROOT` / `H-RM-RF-ROOT` matched any target starting with `/` (or `~`/`$HOME`), so legitimate
`rm -rf /tmp/x`, `rm -rf ~/foo`, `rm -rf /Users/me/build` were all vetoed — too conservative (kept tripping
real work, needing `# rm-ok` every time). Tightened to a boundary-anchored target: it now blocks ONLY the
catastrophic roots — bare `/` · `/*` · `~` · `~/` · `~/*` · `$HOME`(`/`,`/*`) · `${HOME}` · bare `*` — while
specific subpaths pass. The `# rm-ok <reason>` escape stays for an intentional root-level delete.

- `modules/danger-guard.ts` + `config/enforcement.json` (mirrored SSOTs) — same tightened regex.
- Verified with an 18-case block/allow matrix (10 catastrophic → block, 8 subpaths → allow): 18/18.
- README guard row clarified (root-only). plugin.json 0.9.0 → 0.9.1.

## feat(imagine): video generation — Seedance 2.0 text-to-video + image-to-video (plugin 0.8.0 → 0.9.0)

`imagine` was image-only. It now generates video too, routed by the output extension, with exact pinned
model versions. Image default stays `openai/gpt-image-2` ("image2").

- VIDEO by output extension (`.mp4/.mov/.webm/.m4v/.gif`) → fal queue, pinned **Seedance 2.0**
  (exact fal endpoints, verified): text-to-video `bytedance/seedance-2.0/text-to-video`; with `-i <image>`
  → image-to-video `bytedance/seedance-2.0/image-to-video` (the input image animates). Fast tier =
  `…/fast/…`; override any with `-m`.
- `-i <image-file|url>` (image-to-video input): http(s) URL passed through as `image_url`; a local file is
  inlined as a base64 data-URI (fal accepts data: URIs). `-i` with a non-video output is rejected.
- `backendFal` generalized to image+video (kind param + optional imageUrl): video payload is prompt
  (+ image_url for i2v), longer poll budget, result URL from `video.url`/`videos[].url`.
- header/usage/list + README + ARCHITECTURE imagine node document image2 + Seedance 2.0 t2v/i2v.
- plugin.json 0.8.0 → 0.9.0.

## feat(poll): `harness poll` — self-paced ≥10-min polling runbook (c19-sanctioned · plugin 0.7.1 → 0.8.0)

Codifies the "10분 폴링" pattern: watch slow background state (fleet lanes · pods · CI · queues) by waking
on a timer and checking ONCE per wake — not by reacting to every idle ping, and not via a hand-rolled bash
`sleep` loop (the c19 poll-interval guard blocks sub-30-min loops). `harness poll` is the sanctioned
alternative, sibling to `ci-track --watch` (which it points at for CI specifically).

- `templates/poll.md` (NEW) — the loop (wake→check once→fire-on-arrival→report→reschedule), the ≥10-min
  floor + why (prompt-cache 5-min TTL · default 1200–1800s), how to wait without bash sleep (ScheduleWakeup
  ≥600s / `/loop`), "don't poll what the harness already notifies you about," and stop conditions.
- `modules/runbooks.ts` `runPoll` — emits the runbook + echoes a `# interval:` (first numeric arg, clamped
  to a ≥600s floor, default 1200s) and `# target:` (remaining args).
- `cli/index.ts` — `poll` registered + help line. `commands/poll.md` (NEW) — `/poll [interval] [target]`
  slash delegator (triggers "10분 폴링"·"주기적으로 확인"·"poll every"·"watch loop").
- ARCHITECTURE poll node. plugin.json 0.7.1 → 0.8.0.

## fix(ing): `ing add/next --stdin` — register free text with shell-special chars safely (plugin 0.7.0 → 0.7.1)

`/ing add <free text>` broke when the text held shell-special chars (parens, quotes, `$`, `→`): the slash
command's unquoted `$ARGUMENTS` mis-parsed in bash, so agents fell back to hand-editing ING.jsonl. (The
companion "harness CLI not found" failure is resolved separately by `harness install` putting the global
command on PATH.)

- `modules/ing.ts` — `add`/`next` accept a STDIN text path: `--stdin` flag (or a lone `-`) reads the entry
  text from stdin instead of argv. Opt-in only, so an interactive no-text call still shows usage and never
  blocks on a TTY. Agent-safe form: `printf '%s' "<text>" | harness ing add --stdin` (works with `--to` too).
- `usage()` + `commands/ing.md` description document the STDIN-safe form.
- plugin.json 0.7.0 → 0.7.1.

## feat(kick): `harness kick` (alias `drill`) — hexa-lang gap-breakthrough/discovery passthrough (plugin 0.6.0 → 0.7.0)

Ports sidecar's `/kick` (skills/kick) into harness: a thin wrapper over `hexa kick --seed "<seed>"`
— the hexa-lang gap-breakthrough / discovery engine (aliased to `hexa drill`).

- `modules/kick.ts` (NEW) — resolves `hexa` on PATH; bare natural-language args join into
  `--seed "<seed>"`, a leading flag (`--rounds N`, `--engine mk9|mk10`, …) passes through verbatim.
  Long-running engine → INHERITED stdio (live stream, no capture/timeout), unlike the short
  `secret`/`research` captures. Missing `hexa` → exit 127 + install guidance.
- `cli/index.ts` — `kick` + `drill` alias registered; help line.
- `commands/kick.md` (NEW) — `/kick <seed>` slash delegator → `harness kick $ARGUMENTS` (sidecar parity:
  Korean + English triggers — "돌파해줘"·"발산"·"gap breakthrough on"·"drill <X>").
- ARCHITECTURE kick node. plugin.json 0.6.0 → 0.7.0.

## docs: sync CLAUDE.md/README/ARCHITECTURE with install·shadow·ci-track (no code change)

Project map / design SSOT had drifted from the commands shipped this session.

- `CLAUDE.md` — intro notes the global command is bootstrapped by `harness install`; modules tree line
  adds install(global bootstrap)/self-update/install-hooks/shadow + ci-track; scripts/ line names install.sh (SSOT).
- `ARCHITECTURE.json` — added the `shadow` module node (install·ci-track nodes already present).
- `README.md` — added the `harness shadow` plugin-less fallback note; renamed the `verify` command row to
  `ci` (verify kept as a legacy alias; config key stays `verify.checks`).

## feat(install): `harness install` — one-shot COMMON/global setup (clone + wrapper + global hooks · plugin 0.5.2 → 0.6.0)

There was no bootstrap for the GLOBAL command: README/`self-update` referenced `~/.harness/cli` +
`~/.local/bin/harness` as the install, but nothing CREATED it — first-time setup was manual, and the
`install` verb was just an undocumented alias of `init` (per-repo scaffold). `harness install` now means
"install harness on this machine as a common command," distinct from `init` (scaffold THIS repo).

- `scripts/install.sh` (NEW · SSOT) — curl-able bootstrap: clone `dancinlab/harness` → `~/.harness/cli`
  (ff-update if present) · write a `harness` exec-wrapper to `~/.local/bin/harness` (a script, NOT a
  symlink — `bin/harness` resolves its dir via `BASH_SOURCE` without readlink, so a symlink would
  mis-resolve the install dir) · PATH check · `install-hooks --global`. Idempotent. Flags
  `--no-hooks` · `--ref=` · `--dir=` · `--bin=` · `--dry-run`; env `HARNESS_DIR`/`HARNESS_BIN`/`HARNESS_REF`.
  One-liner: `curl -fsSL https://raw.githubusercontent.com/dancinlab/harness/main/scripts/install.sh | bash`.
- `modules/setup.ts` `runInstall` — `harness install` delegates to the SSOT script (same logic from the
  curl bootstrap and the CLI verb).
- `cli/index.ts` — `install` split from `init` (was an alias); registered + help line. `init` stays the
  per-repo scaffold.
- docs: README "0. 공용(전역) 설치" section + docs/install.md "공용(전역) 설치" table; ARCHITECTURE install node.

## fix(qa): full-command QA sweep — `--force-with-lease` dual-SSOT contradiction + 3 init/uninstall cosmetics (plugin 0.5.1 → 0.5.2)

Ran a 5-family parallel QA sweep over the whole CLI (~125 cases: setup/lifecycle · guards · gates/ledgers ·
runbooks · utility). One REAL bug + three cosmetic inconsistencies found and fixed; everything else PASS
(the inject commands' "0 output" on a bare call is by-design — they require a hook JSON envelope on stdin).

- **REAL — `git push --force-with-lease` was hard-blocked with no override** (`modules/git-guard.ts`): the
  code guard ran first and denied `--force-with-lease`, but `config/enforcement.json` H-FORCE-PUSH *exempts*
  it (it's the safe form — refuses to overwrite if the remote moved). The two SSOTs disagreed, breaking the
  standard rebase→lease-push workflow. Aligned the code guard to config intent: blind `--force`/`-f`/`+refspec`
  still blocked, `--force-with-lease` allowed, and a `# force-ok <reason>` inline marker overrides a bare-force
  block (escape parity with config). `@convergence ossified FORCE_LEASE_DUAL_SSOT`.
- cosmetic — `init` reported `state/` as "create" even when it already existed (`modules/init.ts`): now `skip`.
- cosmetic — `init --hooks` warned "Snippet below:" when an existing `.claude/settings.json` blocked the
  auto-merge but never printed the snippet: now prints it ("merge these hooks into your existing …").
- cosmetic — `uninstall` `.gitignore` drop-set was out of sync with `init`'s appended lines (dropped a dead
  `.harness/handoff/`, orphaned the `ING.jsonl*` lines): now drops exactly what `init` adds.
- plugin.json 0.5.1 → 0.5.2.

## fix(recommend): direct-execute commands (pr-cycle · ci · lint · ship …) run immediately — no 4-axis box / no confirmation (plugin 0.5.0 → 0.5.1)

When the user named a deterministic command to run — "pr cycle" / "머지해줘" — the every-turn
recommend-axes rule (FIXED ① complete) treated it as a recommendation moment and rendered the
4-axis box + waited for a pick, instead of just running the command. Executing a command the user
explicitly asked for is not a decision; the box is for genuine "which approach / what to build"
choices.

- `config/recommend.md` r1 — added an EXEMPT carve-out: direct-execute commands
  (`pr-cycle`·`ci`·`lint`·`ship`·`ci-track`·`self-update` …) run immediately, no box, no
  "진행할까요?" confirmation. A real branch/strategy choice INSIDE a command still uses the box.
- `commands/pr-cycle.md` — description marked ⚡ DIRECT-EXECUTE (run on request; doc-gate +
  branch-guard still protect, so "just do it" stays safe).
- plugin.json 0.5.0 → 0.5.1 so `/plugin update` re-copies the rule carrier.

## feat(ci-track): remote PR/CI tracker — replaces hand-rolled gh-poll + merge-on-green loops (plugin 0.4.1 → 0.5.0)

Long merge-on-green campaigns repeatedly hand-rolled CI polling — `gh pr checks <pr> | grep`,
`/tmp/pr_mon.sh` watch loops, manual pass/fail/pending counting — because harness had no command
to track a PR's remote CI. `harness ci-track` centralizes it.

- `modules/ci-track.ts` + `cli/index.ts` registration + `commands/ci-track.md` + help line.
- `harness ci-track <pr#|branch|url> [-R owner/repo]` — wraps `gh pr checks --json name,state,bucket`
  into an aggregate (pass/fail/pending counts + failing/pending check names) and a verdict:
  🟢 GREEN (exit 0) · 🔴 RED (exit 2) · 🟡 PENDING (exit 1) · ⚪ NONE (exit 0).
- `--watch [--interval=60] [--timeout=1800]` polls IN-PROCESS until terminal — the sanctioned
  replacement for a bash sleep loop (c19: the poll lives inside the CLI, not in agent-authored bash).
- `--merge-on-green` auto `gh pr merge --squash --admin --delete-branch` once all checks pass.
- `@convergence(ossified) CI_TRACK_NATIVE`. Verified against live GitHub CI: aggregate + verdict +
  pending-name listing + exit-code propagation all correct (NONE/PENDING/GREEN observed on real PRs).

## feat(hooks): inject ARCHITECTURE.json + ING.jsonl every turn (UserPromptSubmit), not just SessionStart (plugin 0.4.0 → 0.4.1)

`architecture inject` and `ing inject` were wired ONLY into SessionStart — surfaced once per
session, then buried as the conversation grew. The design SSOT (ARCHITECTURE.json) and the
in-progress board (ING.jsonl) deserve the same per-turn salience that `claudemd inject` (CLAUDE.md)
and `commons`/`recommend` already get. Both inject commands are event-agnostic (they echo the
received `hook_event_name`), so this is pure hook wiring — no code change.

- `hooks/hooks.json` + `modules/setup.ts` — added `architecture inject` and `ing inject` to the
  UserPromptSubmit chain (kept in SessionStart too). So the design tree + the WIP board re-inject
  every turn.
- `.claude-plugin/plugin.json` 0.4.0 → 0.4.1 so `/plugin update` re-copies the new hooks.json.
- ARCHITECTURE architecture-module node updated (SessionStart → SessionStart + every UserPromptSubmit).

## chore(plugin): bump 0.3.0 → 0.4.0 so `/plugin update` re-copies the bundled CLI

`claude plugin update` only re-copies the installed plugin cache when plugin.json's VERSION
changes — a same-version commit (CLI/command-only change) is reported "already at latest" and the
bundle goes stale, so hooks running `${CLAUDE_PLUGIN_ROOT}/bin/harness` keep the old CLI. The
self-contained-plugin commits since 0.3.0 (bare /arxiv·/yt #91, `harness shadow` #92, the
code-level danger+secret guards #93) only reached the global `~/.harness/cli` via `self-update`,
not the plugin bundle. Bumping the version makes `/plugin update` + reload pull all of them into
the bundle as one unit. Going forward: bump plugin.json on every shipped change that touches the
plugin payload (the whole repo is the payload now).

## feat(guards): code-level enforcement for the irreversible / gate-bypass commands (were regex-only)

Five `block`-policy rules lived ONLY in the `enforcement.json` regex layer — overridable by a
profile edit, and (until the STDIN fix earlier) silently dead when the whole pre-hook layer broke.
Per the repo's own `NO_RAW_CLOUD_CLI` principle ("hard rules belong in code, not a regex a profile
edit can weaken"), the genuinely irreversible / gate-bypassing ones are now mirrored into CODE
guards that run before the config layer, default-on:

- `modules/danger-guard.ts` (`pre bash`) — blocks `git --no-verify`/`-n` (bypasses the c14 lint+doc
  commit gate), `git reset --hard` / `clean -fd` / `checkout -- .` (working-tree destroy), `rm -rf`
  on `/` `~` `$HOME` or bare `*` (catastrophic), and `curl|wget … | sh` (remote code exec).
- `modules/secret-guard.ts` (`pre write`) — blocks hardcoded credential literals (AWS keys, private
  keys, `gh*_`/`sk-` tokens, `key/secret/password/token = "…"`) in code/config files (a committed
  secret is an irreversible git-history leak, commons c1).
- Each honors its INLINE escape marker (`# no-verify-ok` · `# reset-ok` · `# rm-ok` ·
  `# curl-pipe-ok` · `// @secret-ok`) — an explicit, per-command, visible opt-out (c16-compatible) —
  but is NOT a config toggle. The regex rules stay as a backup layer.
- Wired in `modules/pre.ts`; `@convergence(ossified)` markers in both guards. ARCHITECTURE PreToolUse
  node updated. Verified: each pattern denies via the real hook; inline markers + benign + non-code
  files pass.

## feat(shadow): `harness shadow` — native bare-/cmd generator (retires sidecar `shadow`)

Claude Code namespaces plugin commands as `/harness:cmd`; the bare `/cmd` form users actually type
needs a user-scope `~/.claude/commands/<name>.md`. The retired `sidecar` package generated those —
and when sidecar was removed, the generated shadows still pointed at a dead
`$CLAUDE_PLUGIN_ROOT` / `~/.claude/plugins/cache/sidecar/...` path, so `/arxiv` and friends died.
`harness shadow` is the harness-native, sidecar-free replacement: it mirrors harness's OWN
`commands/*.md` into `~/.claude/commands/` as bare delegators that always call `harness <cmd>`.

- `modules/shadow.ts` + `cli/index.ts` registration + `commands/shadow.md` + help line.
- Verbs — `shadow` (write/refresh), `shadow plan` (dry-run), `shadow remove` (delete only
  harness-generated shadows). Every generated file carries a `<!-- harness-shadow -->` marker, so
  `remove` never deletes a hand-authored same-name command and `apply` never clobbers one (skips + warns).
- `@convergence(ossified) SHADOW_GEN_NATIVE` — records the dead-sidecar-path recurrence this prevents.

## feat(commands): bare `/arxiv` + `/yt` delegators (research-skill parity, sidecar-free)

The host had a layer of user-scope shadow commands (`~/.claude/commands/*.md`) left over from the
retired `sidecar` package: they invoked `hexa run "$CLAUDE_PLUGIN_ROOT/bin/_*.hexa"` with a fallback
to a `~/.claude/plugins/cache/sidecar/...` path that no longer exists — so `/arxiv` and friends died
with "source file not found". harness already implements arxiv + youtube-transcript natively
(`modules/research.ts`, no API key, no sidecar), exposed as `/research arxiv|yt`.

- `commands/arxiv.md`, `commands/yt.md` — bare convenience commands delegating to `harness research
  arxiv|yt`, so the names users type resolve to harness's own implementation (sidecar dependency 0).
- Host cleanup (not in repo): the 43 broken sidecar shadows under `~/.claude/commands/` were
  triaged — 11 that harness backs were repointed to `harness <cmd>`, 32 sidecar-only ones (cycle
  family · mem · walkie · hf · quota · master · skillopt · sidecar · lab · inject · todo · trail …)
  were removed per the user's "제거" directive. Backup at `~/.harness-migration-backup/`.

## feat(plugin): SELF-CONTAINED plugin — CLI ships inside it, `/plugin update`+reload = everything latest (sidecar parity)

The harness shipped as TWO decoupled clones: the CLI lived at `~/.harness/cli` (refreshed only by
`harness self-update`'s git pull), and the CC plugin (`./plugin`) carried just hooks+commands that
called the global `harness`. So a CLI fix (e.g. the STDIN guard fix below) required a manual
`harness self-update` — reloading the plugin did NOT pick it up. sidecar avoided this by bundling
the CLI in the plugin; this change does the same.

- **repo root IS the plugin** — marketplace `source` `./plugin` → `.`; `plugin/.claude-plugin/plugin.json`
  → root `.claude-plugin/plugin.json`; `plugin/hooks` → `hooks/`; `plugin/commands` → `commands/`.
  The payload now includes `bin/ · cli/ · lib/ · modules/ · config/ · templates/ · styles/`.
- **hooks run the bundled CLI** — new `hooks/run.sh` dispatcher resolves `${CLAUDE_PLUGIN_ROOT}/bin/harness`
  first (the plugin's own copy), falls back to a global `harness` on PATH, and exits 0 silently if
  neither exists. `hooks/hooks.json` calls `run.sh` for every surface. So `/plugin update` + reload
  refreshes CLI+hooks+commands as ONE unit — no per-project copy, no separate `harness self-update`.
- `bin/harness` already resolves its dir relative to itself, so the bundled copy runs standalone
  (tsx via the repo walk-up or `npx --yes tsx` when the cloned payload has no `node_modules`).
- plugin.json 0.2.0 → 0.3.0; marketplace + README + ARCHITECTURE + CLAUDE.md updated in lockstep.
- Verified: plugin-context (`CLAUDE_PLUGIN_ROOT=$PWD`) blocks raw `vastai` via stdin; benign `ls`
  passes; global fallback still blocks when `CLAUDE_PLUGIN_ROOT` is unset; a host with neither is
  silent (exit 0); bundled `bin/harness help` loads.
- ⚠ Host step for TRUE reload-only updates: re-point the CC marketplace from the local `directory`
  source (`~/.harness/cli`) to the GitHub repo (`dancinlab/harness`) so `/plugin update` git-pulls.
  The classic `~/.harness/cli` + `harness self-update` install stays valid as a fallback.

## fix(pre): code-level guards (cloud-raw c11 · force-push · poll c19) read tool input from STDIN, not an unset env var

The `pre bash`/`pre write` hooks resolved their tool input ONLY from `$CLAUDE_TOOL_INPUT` /
`$CODEX_TOOL_INPUT` env vars. Current Claude Code does not set those — it pipes the PreToolUse
payload (`{tool_name, tool_input:{command|file_path|content}, …}`) on STDIN. So `parseToolInput()`
always saw an empty command, `if (!cmd) return 0` fired, and EVERY code-level guard silently
passed: raw `vastai`/`runpodctl`/`vast` provider CLIs (the ossified `NO_RAW_CLOUD_CLI` block),
git force-push, and the c19 poll-interval guard all no-op'd. The block logic was never wrong —
the input carrier was. (The 5 inject modules — commons·recommend·prefs·ing·architecture — already
read stdin via `readStdin()`; `pre.ts` was the lone hold-out on the dead env path.)

- `modules/pre.ts` — `parseToolInput()` now tries env FIRST (Codex back-compat), then STDIN
  (current CC), and unwraps a full payload's `.tool_input` or accepts a bare input object.
  New `@convergence(ossified) PRETOOLUSE_INPUT_FROM_STDIN` marks the recurrence guard.
- Verified via the real hook: stdin `{tool_input:{command:"vastai …"}}` → `permissionDecision:deny`;
  `hexa cloud …`/`ls` → pass; env legacy form still blocks; `pre write` unwraps `file_path` from stdin.
- ⚠ Live effect requires `harness self-update` (propagates to `~/.harness/cli`); the plugin copy
  updates on next plugin sync.

## feat(architecture): `architecture lint` — mechanical c4 tree-hygiene gate

The architecture module could only `inject`/`show` the design SSOT — nothing guarded the JSON
tree's *shape*. In practice a node drifts: instead of splitting into children, a single leaf
accretes a wall of ` · `-joined claims until one cell holds thousands of characters (commons c4
explicitly forbids this — "split piled-up cells into one child per logical item"). That drift was
only ever caught by a human eyeballing the rendered viewer, repo by repo, after the fact.

`harness architecture lint` now flags it mechanically, walking the repo-root `ARCHITECTURE.json`
and emitting one warning per offending leaf:

- `ARCH-BIG-CELL` — a string leaf past ~1.5 KB (a subsection masquerading as one cell).
- `ARCH-PILED` — a leaf gluing more than 10 ` · `-joined items (a child list flattened into text).
- `ARCH-HISTORY` — a `previous`/`deprecated`/`history`/`changelog`/`이전` key smuggling
  change-history into a current-state snapshot tree (history belongs in CHANGELOG + git, c4).

Wired into `harness lint` as a **warn-only** check (step 4c): violations are reported and logged
to the lint JSONL but never block — `classify()`'s `defer` fallback keeps pre-existing oversized
trees from failing CI on day one, while making the drift visible every run. `--strict` flips the
standalone `architecture lint` to exit 1 for repos that want a hard gate. Verified against the
hexa-lang tree (25 real warnings surfaced, incl. a 4563-char / 41-item domain cell); the harness's
own tree is clean.

- `modules/architecture.ts` — new `lint` subcommand + exported `lintArchitectureTree()` walker.
- `modules/lint.ts` — step 4c folds the walker's hits into the violation stream (warn-only).
- `cli/index.ts` — usage line documents the new `lint` verb.

## fix(recommend): default-mode path doc was stale `~/.sidecar`, code reads `~/.harness`

The recommend-axes rule carrier (`config/recommend.md`, injected EVERY turn) still documented
the standing default mode as living in `$HOME/.sidecar/recommend-default` — a leftover from the
old sidecar harness. But the implementation (`modules/recommend.ts`) has long read the two-tier
`.harness/recommend-default` (per-repo) → `~/.harness/recommend-default` (global). The map
pointed at a road the code doesn't walk: anyone following the injected rule set the mode in the
wrong file and it silently never took effect. The harness now documents the path it actually uses
(self-hosting, not sidecar host-state).

- `config/recommend.md` r4 — path corrected to per-repo `.harness/recommend-default` (committed,
  wins) → host-wide `~/.harness/recommend-default` (`set-default --global`), matching code precedence.
- `modules/recommend.ts` — dropped the stale `sidecar uses ~/.sidecar host-state` comparison comment.
- harness repo `.sidecar` reference count: 2 → 0 (verified by grep + inject-body scan).

## feat(plugin): global slash-command set — every harness command recognized as /cmd (sidecar pattern)

`plugin/commands/*.md` 50개 신설 — 하네스의 전체 사용자-대면 명령을 sidecar식 슬래시 명령으로 노출. 각 `.md`는 프런트매터(rich `description` + **Triggers** 자연어구 + `argument-hint` + `allowed-tools: Bash`) + `!`harness <cmd> $ARGUMENTS`` 본문의 얇은 위임자. Claude Code가 description/Triggers로 인지 → `/paper`·`/imagine`·`/pr-cycle`·`/sbs`·`/fleet`·`/ing`·`/verify`… 한국어("논문 만들어"·"PR 돌려"·"진행보드") + 영어 트리거 양쪽.

- **공용셋(shared/global) · 프로젝트 무관**: 명령이 플러그인 1곳(commands/)에 살고 harness 플러그인으로 배포 → 프로젝트마다 복사/갱신 불필요. 중앙 갱신 = `harness self-update` + 플러그인 update. (plugin.json 0.1.0→0.2.0 으로 update 트리거)
- **범위**: tools(paper·imagine·research·watch·secret·lsp) · runbooks(sbs·abg·afg·fleet·pod·dojo·micro-exp·bypass·go·brainstorm·gap·demi) · gates/ledgers(pr-cycle·lint·ci·verify·audit·gc·docs·folders·end·worktree·ing·verdict·atlas·upstream·convergence·sync·errors·ledger·bitter-gate·lockdown·pool) · config(recommend·prefs·easy·commons·architecture·claudemd) · setup(init·install-hooks·update·self-update·uninstall). hook-intern 전용(pre·post·prompt)은 제외.
- **생성 규율**: `_tools/gen_commands.py` 데이터테이블에서 일괄 생성(일관성·재생성 가능). YAML 프런트매터 안전성 검증(콜론-스페이스 0·50/50 파싱) + 본문은 `command -v harness` 가드(미설치 시 안내).

## feat(paper): demiurge-house scientific-paper command (scaffold · cover · build · g51 gate)

`harness paper` 신설 — demiurge 하우스 페이퍼 규율을 도구로 박제(self-improving tool). 매 캠페인마다 손으로 재조립하던 LaTeX 프리앰블·표지·빌드·페이지 게이트를 한 명령으로 통일.

- **modules/paper.ts** + cli/index.ts 디스패치/도움말 배선.
- **`paper new <slug>`**: `PAPERS/<slug>/{main.tex,references.bib,PAPER.md,figures/}` 스캐폴드 — 하우스 프리앰블(이모지 제목 · 🔵🟢🟡🟠🔴 g5 tier-badge 디스크 · TikZ+pgfplots(+calc) · natbib unsrtnat · fal.ai 표지 include · §hypothesis/method/measurement/finding/ledger/limitations). 표지를 `harness imagine`(fal)로 생성 후 빌드.
- **`paper build <slug|dir>`**: xelatex→bibtex→xelatex×2 → pages+refs 보고 + g51 ≥10p 게이트(기본 10). 유효성 강화: 깨진/빈 PDF(pdfinfo 0p 또는 <1KB)는 실패 처리하고 컴파일 에러 줄 출력.
- **`paper cover <slug|dir>`**: `harness imagine` 위임으로 figures/cover.png 재생성(키는 `secret get fal.api_key`, 본 모듈은 키 미취급).
- **`paper list`**.
- **QA(c2)**: help·메인help 노출·new(--no-cover)·list·end-to-end(new→fal 표지 851KB→build 2p 717KB·g51 PASS)·실패경로(표지없음→exit 2+원인/해결 줄) 전수 PASS.
- xref: `imagine`(secret 경유 fal/openai) 재사용 — 표지 백엔드/키 로직 중복 0.

## docs(architecture): ARCHITECTURE = current-state snapshot, not a history log

Sessions kept accreting history into ARCHITECTURE.json — version/dated/`이전엔…`/`deprecated`
nodes — because the guidance called it a "갱신형 SSOT"(updatable SSOT), which a model reads
as "add an update entry" rather than "replace the affected node in place". The tree should
show only the final/current structure; history belongs in CHANGELOG + git.

- `modules/architecture.ts` — the SessionStart inject note (surfaced EVERY turn) now spells
  out: 현재상태 스냅샷이지 이력 로그 아님 — update-in-place + delete old wording; NO
  history/version/dated/previous/deprecated nodes. `@convergence ARCH_SNAPSHOT_NOT_HISTORY`
  ossified in the module header.
- `config/commons.md` c4 — added the same rule to the governance SSOT: "갱신" = replace the
  node in-place, not append; tree = this-moment final structure only; history → CHANGELOG + git.
- ARCHITECTURE.json itself was already clean (no real history nodes) — this is a recurrence-
  prevention hardening, not a cleanup.

## fix(pre): PreToolUse block schema — every code-level guard was a silent no-op

Root cause for "직접 CLI 막았는데 `vastai destroy` 가 그냥 실행됨": `emitBlock` emitted the
legacy `{"decision":"block"}` (+exit 0), which current Claude Code **no longer honors for
PreToolUse** — it only reads `hookSpecificOutput.permissionDecision`. So the guard printed
its reason to stdout and the tool ran anyway. This silently neutered ALL code-level
PreToolUse blocks (force-push · cloud-raw c11 · poll c19) **and** every config
`action:"block"` rule across every repo — they had zero teeth.

- `modules/pre.ts` `emitBlock` now emits the current schema as the operative key —
  `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny",
  "permissionDecisionReason":"[id] …"}}` — and keeps the legacy `decision`/`reason`
  fields appended for older Claude Code builds (harmless; new builds read
  hookSpecificOutput, old read decision). One function → fixes pre bash + pre write +
  all config block rules at once.
- Verified via the actual `pre bash` hook output: raw `vastai destroy` and
  `git push --force` now return `permissionDecision:"deny"`. `@convergence
  PRETOOLUSE_DENY_SCHEMA` ossified inline.
- Propagation: needs commit → `harness self-update` (global `~/.harness/cli` is
  git-commit-based, not working-tree); per-repo `.harness-engine` submodules pick it
  up on their next bump.

## feat(heartbeat-guard): c22 — warn when a LIVE long-runner goes unchecked >10min (abandonment)

c19 caps how OFTEN you may poll (anti-cache-bust); the OPPOSITE failure mode had no
guard — firing a long-runner (GPU pod, background agent) then walking away, so it
idle-burns and its result is never harvested. New c22 + `modules/heartbeat-guard.ts`:
a live tracked long-runner must be CHECKED at least every `poll.maxSilenceSec`
(default 600s = 10min). Covers ALL tracked runners, not just pods — ing-board pods +
ledger background agents.

- We can't intercept the ABSENCE of an action, so: `markPollActivity()` stamps a
  `lastPoll` heartbeat (`.harness/logs/heartbeat.json`) whenever a status-check
  command runs (`hexa cloud poll/tail/list/status/…`, `harness ing`, `harness ledger
  list`, `harness check/lab`, `gh run watch`, `squeue/sacct`); `staleLongRunnerWarn()`
  fires on agent activity (`post bash`) + session start (`ing inject`) if a live
  runner exists and the heartbeat is older than maxSilenceSec. WARN (not block) —
  abandonment is a nudge, the inverse of c19's hard cap.
- Perf gate: `ing pod add` sets a cheap `.harness/logs/.live-runner` marker; `done`/
  `pod rm` clears it when no pod remains. `post bash` skips the git-backed pod read
  unless the marker is set OR a ledger agent is active — so the no-live-job common
  case costs one stat. `post bash` reads the command from positional args OR the
  PostToolUse tool-input env (fallback) so the stamp doesn't miss.
- config: new `poll.maxSilenceSec` (default 600). `lib/config.ts` + DEFAULTS.
- Verified: 5/5 heartbeat smoke (no-live → null; live+never-polled → warn 한 번도;
  live+just-polled → null; live+700s-silent → warn; non-poll cmd doesn't stamp); CLI
  loads. Convergence in-file (`NO_ABANDONED_LONGRUNNER`).

## feat(cloud/dojo): hand-rolled-fanout warn + config-carried dojo stack (flame+forge+hexa-cuda)

Two gaps surfaced by the anima decode workflow, where a session hand-wrote `/tmp/h1305_launch.sh`
(a 12-shard staggered `hexa run` loop), `hexa cloud copy-to`'d it, and ran it remotely — bypassing
`hexa cloud`'s structured dispatch / `pods.json` registration / cost accounting. `copy-to` is the
sanctioned (whitelisted) path, so the existing raw-cloud block never saw the fanout.

- **cloud-guard `detectHandrolledShardFanout()` (WARN + redirect)** — `pre bash`, sibling of the
  `CLOUD-RAW-CLI` block. Catches the launcher LOOP itself via FOUR corroborating signals (loop /
  `xargs -P` + `nohup`/`setsid` detach + backgrounding `&` + an engine/training launcher: `hexa
  run`, torchrun/deepspeed/`accelerate launch`, or `python …`), so a benign local loop won't trip.
  It is a WARN (not the no-override block): a local CPU-parallel batch is legitimate (pod.md allows
  it); the moment it targets a pod the redirect points at `hexa cloud fire-shards`. Verified: 7/7
  smoke (h1305 + xargs + torchrun POSITIVE; single-fire + wc-loop + http.server + bare-split
  NEGATIVE) AND `detectRawCloudCli(h1305)=null` (warn-only, never the block). Convergence in-file
  (`NO_HANDROLLED_SHARD_FANOUT`).
- **config-carried dojo stack** — new optional `config.dojo {defaultLang, stack, delegate}`. The
  engine stays domain-agnostic: the preferred training/kernel stack is carried in per-repo config,
  never hardcoded. `runDojo` now reads it — defaults `--lang` from `defaultLang`, surfaces the
  `stack` label, and when `delegate` is set AND `hexa` is on PATH it shells out to `hexa dojo
  <delegate> <slug>` for the REAL artifacts (flame/forge `train.hexa`, `hexa_cuda` nvptx kernel),
  else emits a hexa-native stub. The generic run.sh glue was also fixed: it referenced the
  NON-EXISTENT `harness pod fire` — now `hexa cloud fire` / `fire-shards` (the real verbs).
  anima/harness.config.json set to `defaultLang=hexa · stack="flame+forge+hexa-cuda" ·
  delegate=flame_forge`; documented in harness.config.example.json. Verified: CLI loads; py stub
  (back-compat) emits 0 `harness pod fire` + `hexa cloud fire`; hexa stub emits `train.hexa` +
  `hexa run`.
- **templates/pod.md** — adds the `fire-shards` sub-flow + an explicit "❌ 손수 launcher.sh 금지"
  note pointing at the new guard.

(The root-cause `hexa cloud fire-shards` verb itself lives in hexa-lang `feat/cloud-fire-shards`
— implemented + `fire_shards_test PASS`, commit deferred there: that working tree is shared with
other live sessions and its CHANGELOG is mid-edit, so a clean selective commit waits.)

## feat(poll-guard): code-level enforcement of c19 — block short-interval poll loops over external long-runners

c19 ("poll external long-runners at ≥30min") was a hint; the main session's ScheduleWakeup interval
can't be intercepted by harness (runtime tool, not bash). But the OTHER way sessions poll — a bash
`while …; do <status>; sleep <N>; done` loop — IS a bash command, so it's now code-guarded. New
`modules/poll-guard.ts` `detectShortPollLoop()` runs in `pre bash` before config rules, default-on:
blocks a poll LOOP (`while`/`until`/`for … do … done`, or `watch -n <N>`) that (a) references an
external long-runner (runpod/vast/pod/gpu/nvidia-smi/r2/measure/dojo/train/torchrun/deepspeed/squeue
/sacct/cloud) AND (b) has a smallest `sleep` (or `watch` interval) < 1800s. It parses sleep units
(`60`, `90s`, `5m`, `1h`). Fast LOCAL/CI waits are c19-exempt and pass — the external-long-runner
term gates it, so `while ! curl -sf localhost:8080; do sleep 2; done` is fine. Compliant ≥1800s
loops, single sleeps, and plain loops without sleep all pass. QA via the real `pre bash` hook
(CLAUDE_TOOL_INPUT env per c2): 5 block / 5 pass, 0 false positives. Convergence ossified in-file
(`NO_SHORT_POLL_LOOP`).

## feat(cloud-guard): code-level block of raw runpod/vast CLI·API + raw dojo/deck launches (c11)

A session ran `runpodctl pod create` / `cloud rent` directly because c11 ("use hexa builtins")
was only a hint + keyword warn — nothing blocked it, and an enforcement.json regex rule can be
silently weakened by a profile edit. Fix is CODE-level, mirroring the built-in force-push guard:
new `modules/cloud-guard.ts` `detectRawCloudCli()` runs in `pre bash` BEFORE config rules,
default-on, NO override. Two guard families:
- **raw cloud CLI/API**: blocks `runpodctl …`, `vastai …`, `vast <verb> …`, `cloud rent`, and
  `api.runpod.io`/`rest.runpod.io`/`console.vast.ai` endpoints → use `hexa cloud`.
- **raw dojo/deck launches** (`detectRawDojoDeck`): blocks distributed/training launchers in
  command position — `torchrun …`, `deepspeed …`, `accelerate launch …`, `python[3] …train|
  finetune|sft|pretrain….py` — and hand-running a `run.sh` under a `dojo/`|`decks/` tree →
  use `hexa dojo` / `hexa deck`.
Sanctioned path (`hexa cloud`/`hexa dojo`/`hexa deck`) and innocents pass: `grep runpodctl logs`,
`echo runpodctl`, `cat vast/notes.md`, `vast=3`, `python app.py`, `python serve.py`,
`accelerate config`, `bash scripts/build.sh`. Segment-aware (splits on shell operators, strips
`sudo `/env-assignments, inspects each segment's lead token) so it's command-position-precise,
not substring. QA via the real `pre bash` hook (CLAUDE_TOOL_INPUT env, not stdin — cross-checked
per c2): all block/pass cases correct, 0 false positives. Convergence ossified in-file
(`NO_RAW_CLOUD_CLI`, `NO_RAW_DOJO_DECK`).

## docs(arch): dogfood c4 — decompose harness ARCHITECTURE.json `ing` node into children

Applied the c4 children-tree rule to harness's own ARCHITECTURE.json (the rule author should dogfood).
The `ing` module node had a 391-char ` · `-joined dump in 상세; split it into child detail nodes (lead
role line on the parent, each ` · ` item a child with verbatim text — lossless, lead+children == original).
The other 3 long cells (`pr-cycle` 264 = coherent →-pipeline flow, `claudemd` 332 = coherent explanatory
paragraph, `pool` 298 = coherent multi-sentence prose) were intentionally LEFT — per c4's anti-over-
decomposition clause, coherent sentences/flows must not be shredded into orphan fragments. This closes
the dancinlab-wide ARCHITECTURE.json tree pass: anima/edge/hexa-lang/demiurge/forge/phanes/hexa-codex/
airgenome/drive/gamebox/pool/void all restructured to real children trees via parallel agents (each
lossless-verified by non-whitespace char-multiset + JSON-valid + viewer-renderable), now harness itself.

## fix(lockdown): CLAUDE.md is never L0 — drop the self-capturing CLAUDE*.md regex alternation

`lib/lockdown.ts`'s L0 path-parser (which reads the `🔴 L0` block of the guide named by
`lockdown.fromMarkdown`, normally CLAUDE.md) included `CLAUDE(?:-…)?\.md` as a path-like token — so
whenever the parser scanned CLAUDE.md and the text mentioned `CLAUDE.md`, it added the guide to its
OWN L0 list. That's why harness kept treating CLAUDE.md as L0 even though it's the project map /
re-injected guide, not protected engine core. Removed the `|CLAUDE…\.md` alternation; the regex now
captures only real source paths (`src/… lib/… modules/…` etc). Verified in a throwaway repo:
`isL0("CLAUDE.md")=false`, `isL0("lib/core.ts")=true`. `fromMarkdown: "CLAUDE.md"` (CLAUDE.md as the
*declaration site* of the L0 list) is unchanged and correct. Convergence note ossified in-file
(`CLAUDEMD_NOT_L0`).

## docs(commons): c4 — ARCHITECTURE.json must use a real `children` tree (no one-cell dump)

Strengthened c4: when authoring ARCHITECTURE.json, express hierarchy as a `children` tree — do NOT
cram many facts into one column (esp. `상세`/`detail`) joined by ` · `/newlines. Many items piling
into one cell is the signal to decompose them into child nodes (a module's subcommands · fields ·
failure modes each become a child). Column values hold only the node's own short attributes
(one-line role, kind tag); deeper content drops one level into `children`. Goal: scanning the tree
reveals structure and detail unfolds with depth — a real hierarchy, not a flat table padded with
long prose. A node that grows bulky without children is a refactor target.

## docs(commons): add c20 — Pi5-Akida is anima neuromorphic-only (no shared-resource use)

New rule c20: the Raspberry Pi 5 + Akida neuromorphic chip (`pi5-akida`) is reserved for anima's
neuromorphic experiments only — never share/reallocate it for anything else (no common `pool`
roster, no general build/bench/CI runner, no GPU substitute). Sharing it would break the dedicated
neuromorphic experiment environment's reproducibility. CLAUDE.md SSOT pointer → c1–c20.

## refactor(recommend): retire `recommend.tape` DSL → `recommend.md` (plain Markdown carrier)

The 4-axis recommend rubric lived in `config/recommend.tape`, but `recommend.ts` only ever read it as
TEXT and injected it verbatim (no DSL parsing), so the `.tape` form added nothing. Moved the same
rules to `config/recommend.md` (Markdown, like commons.md / easy.md); `body()` reads recommend.md and
the MUST-FOLLOW header now lives in the file's first line. set-default / auto / fixed-axis directives,
`resolve-mode` (the sbs dependency), and per-repo `.harness` override are all unchanged. QA: show /
inject emit recommend.md, `resolve-mode auto:safe` + FIXED-axis directive verified, `recommend.tape`
removed. This is step 1 of the dancinlab-wide `.tape` retirement — data-bearing `.tape` files
(CLAIMS / PROMOTION / … across the other repos) are dropped outright in follow-up per-repo sweeps.

## docs(commons): add c19 — poll external long-runners (pod/r2/cloud) at ≥30min when not delegated

New rule c19: when the main session itself polls an **external** long-running job — GPU `pod`
(training/build), remote `r2`/measure-class experiments/benches, cloud jobs — rather than delegating
to a sub-agent, the poll interval is **≥30min (1800s)**. These don't change minute-to-minute, and
sub-5min wakeups bust the prompt cache (5min TTL) every time for cost/latency with no benefit.
Register the job on `harness ing pod`/ING (c6) and poll only its status at ≥30min; CI/deploy-queue-
class jobs that finish in minutes are the exception (poll fast). Better yet, hand the polling itself
to a sub-agent (isolated worktree) and free the main session. CLAUDE.md SSOT pointer → c1–c19.

## feat(c17): upstream 막힘 = 그 세션 직접 fix (현재작업 ING 박제 → resume 복원)

c17 was a split — compiler/runtime core → ING hand-off, everything else → direct fix — and the
split kept stalling (cores got punted rather than fixed). New policy: an upstream blocker is fixed
**in that session, directly** (core or app), via the upstream repo + `harness pr-cycle`. High-risk
substrate (codegen/runtime/byteeq/toolchain) just gets an isolated `git worktree` + STOP-on-
concurrent-session (c7/c9) — conflicts are avoided by isolation, not by punting. Because a fix can
run long, the interrupted task is first stashed on the board:
`harness ing add "↩resume <task>: <where·why·next>"`. ing now sorts `↩`-prefixed resume items to the
FRONT of `ing show` / SessionStart inject so the thing to return to surfaces first; after the fix
merges, resume it and `ing done <id>`. cross-repo `--to` is now only for genuinely handing work to
another session/person.

## feat(ing): board on a dedicated `ing` git ref + 수렴진화 → hexa `@convergence` attr

The in-progress board is no longer a working-tree file — it lives on a dedicated `ing` git ref:
- `ing add/done/pod/next/show/inject` read via `git show ing:ING.jsonl` and write via plumbing
  (`hash-object` → `mktree` → `commit-tree` → `update-ref` on `refs/heads/ing`), then best-effort
  `push origin ing`. So the board is **branch-switch-proof** (never in the worktree, so checkout/
  `reset --hard` can't clobber it — the bug that kept eating it), **committed + shared** (push), and
  **protected-main-safe** (its own ref, not main). Offline / no-push-perm → the local ref still
  advances and warns to sync later.
- `readItems` falls back to a legacy working-tree ING.jsonl when the ref is absent (one-time
  migration); the first write graduates those items onto the ref. `--to <repo>` writes the sibling's
  `ing` ref the same way.
- QA (throwaway repo + bare remote): add×2 → ref created · feat branch + `reset --hard` → board
  preserved · done → scrub · push → reached bare remote · remote removed → local ref advances + warn.
  All PASS.

commons c1 — 수렴진화 (recurring-defect learning) now uses hexa-lang's `@convergence` attr format
verbatim instead of the ad-hoc ✅/🔄/🚫 labels (SSOT: hexa-lang `self/convergence_scan.hexa`;
`hexa convergence dump <file>` scans/aggregates it): `// @convergence state=<state> id=<ID>
value="…" threshold="…"` with the canonical state enum (ossified | stable | in_flight | pending |
completed | completed_gap | failed | blocked). ing.ts carries the first two real entries
(`ING_BOARD_DEDICATED_REF`=ossified, `ING_NO_DIRECT_MAIN_PUSH`=failed).

## fix(ing): untrack ING.jsonl (gitignore) — branch-switch/reset no longer clobbers the board

ING.jsonl was git-tracked, so a `git checkout`/`reset --hard` (e.g. switching branches, or a
zombie reset) rolled the board back to the committed version — silently wiping the session's
`ing add/done` edits. (This bit us mid-session during the hexa-cloud work.) It also contradicted
c6's "커밋 불필요". Fix: the in-progress board is **local session state** → gitignore it.
- `.gitignore`: add `ING.jsonl` (+ `.bak`/`.tmp.*` rotation); `git rm --cached ING.jsonl` (file
  kept locally, just un-tracked).
- `init.ts`: gitignore scaffold now seeds those 3 lines, so every newly-init'd repo is safe.
- commons c6: ING.jsonl is now stated as **gitignore(untrack)** — branch/reset can't overwrite
  it; completed/handoff content still persists via CHANGELOG and the target repo's board.
- ing.ts: dropped the stale "(commit ING.jsonl)" hint; `--to` message now says the target repo
  surfaces it at next SessionStart (no commit needed). CLAUDE tree updated.
Note: sibling repos (hexa-lang, anima, …) are still tracked — they pick this up on their next
`harness init`/manual `git rm --cached ING.jsonl`; not auto-migrated here.

## qa(harness): fix the 3 deferred QA findings + commons rules (수렴진화 3-state · QA → c2)

Resolved the 3 items the full-module QA sweep had deferred:
- **verdict arg-flatten (⑥)** — `record id -- <argv>` now shell-quotes each token (`shq`), so
  `record id -- sh -c 'exit 3'` correctly FAILs instead of silently mis-tiering. Without `--`,
  args stay one shell line so `record id "a && b"` keeps shell operators (no regression).
- **git -c push --force bypass (⑧)** — detectForcePush now walks past git-level options
  (`-c key=val`, `--flag`) between `git` and `push`, so `git -c x=y push --force` blocks; refspec
  `+main` still blocks; `git push origin main` / `git log` still pass.
- **docsActive .json mismatch (⑨)** — docs.ts now uses an `archName()` auto-detect (prefer
  ARCHITECTURE.json, mirroring lint), so a .json-SSOT repo no longer reads as docs-inactive.
  Set `docs.scopeDirs:["docs"]` in harness.config (templates/styles runbooks are not separate
  SSOT docs → quickref-exempt) + added quickref to docs/extending·languages → `docs check` rc 0.

commons rules:
- **c1 수렴진화 (재발방지)** — a recurring defect's lesson is recorded as an inline comment IN the
  offending file, classified by **verification state** (not a running log): `// ✅ 수렴[필수]`
  (must, verified) · `// 🔄 수렴[진행]` (doing/done) · `// 🚫 수렴[금지]` (tried→proven-not-to-do).
  No scattered `*-incident.md`.
- **c2 post-impl QA** — moved the "full QA after every feature/bugfix" rule from CLAUDE.md into
  commons c2 (cross-project), with the parallel-agent + test-harness-artifact cross-check note.

## qa(harness): full-module QA sweep — fix 7 bugs (atlas · enforcement · folders · worktree)

Ran a QA sweep across all ~55 commands (4 parallel agents, throwaway repos). Runbook/util
commands clean; fixed 7 real defects:
- **atlas regex injection (data loss)** — `add`/`link` built a `RegExp` from the raw id, so
  `link "row."` matched & mutated UNRELATED rows. Now compares the first table cell by exact
  string (`cellId`), never a regex.
- **atlas link to nonexistent id** — used to print success while writing nothing; now refuses
  with exit 1 ("add it first").
- **atlas unescaped `|`** — a `|` in a claim spawned phantom table columns; now escaped to `\|`.
- **enforcement `H-RM-RF-ROOT` under-match (safety)** — `rm -rf /*`, `rm -rf / && …`, and
  `rm -fr /` all slipped through (end-anchor `\s*$` + hardcoded r-before-f order). New regex:
  r/f flags order- & case-insensitive via lookahead, no end-anchor (so trailing glob/chained
  commands still block). `rm -rf build/` / `rm file.txt` still pass.
- **folders scaffold path traversal** — `folders scaffold ../x` wrote a CLAUDE.md OUTSIDE the
  repo; added a `relative(REPO_ROOT, abs)` containment guard (refuses `..`-escaping targets).
- **worktree stale-base warning regex** — only matched `add -b <branch> <path>`; the standard
  `add <path> -b <branch>` order never warned. Loosened to `add\b.*?-b\s+(\S+)`.

Deferred (reported, not fixed): verdict `record` arg-flattening (argv→shell quoting is an
inherent trade-off — forcing quotes would break `record id "a && b"`), `git -c … push --force`
adjacency bypass (very low real-world likelihood), and `docsActive()` keying on `.md` only
while `lint` gates on `.json` (a default mismatch — design call, not a crash).

## qa(ing): full-module QA + `done` multi-id / unified message; CLAUDE post-impl QA rule

Ran a full QA sweep of the `ing` module (24 cases over show·add·next·done·pod·inject·--to
in throwaway repos). All green except two real gaps in `done`, now fixed:
- **multi-id** — `harness ing done 1 2 3` scrubs several at once. Guard: only when EVERY
  token is a real id (a stray non-id refuses the whole batch instead of part-scrubbing),
  so `done task 1` still text-searches "task 1" rather than letting the "1" token hijack it.
- **message** — the not-found path said "no work/next item matching" even though `done`
  now also targets pods; unified to "no item matching" (+ usage hint lists pods as `(pod)`).
Also recorded a `CLAUDE.md` working rule: **after any feature/bugfix, run a full QA sweep**
of that feature (all subcommands + edge cases, PASS/FAIL tally per c2) and fix what it
finds before closing — cross-checking with direct args when a failure smells like a test
harness artifact (e.g. zsh not word-splitting `$var`, which faked 2 failures this run).

## fix(ing): `harness ing done <id>` now scrubs pods too (was work/next only)

Root cause: the `done` handler filtered with `r.kind !== "pod"` in BOTH the id match
and the open-id listing, so `harness ing done <pod-id>` always failed with "no work/next
item matching …" — a finished GPU pod could only be removed via the separate
`ing pod rm`. Now `done` matches ANY kind by exact id, so it is the single "this is
finished" verb for work · next · pod alike (id is a pod's only handle since pods carry
no text). The open-id usage hint also lists pods (tagged `(pod)`). Text fallback stays
work/next-only and single-match-guarded (a loose term still can't mass-scrub the board).

## docs(commons): add c18 — releases = semver tag → CI asset publish (no manual build/upload)

New always-on rule c18: repos that ship a user-facing artifact (compiler/binary/package/CLI/model)
unify releases on a single entry point — cut a **semver tag** (`vX.Y.Z`) on verified main, and let
`.github/workflows/release.yml` (CI) build per-target assets and upload them to the GitHub release
(install.sh / package managers fetch those verbatim); no local manual build→upload. A release gate
(e.g. hexa-lang's `release-runtime-compile-gate.yml` byteeq/compile check) must pass before publish.
Optional rolling `edge` prerelease on each main push. Release is a step SEPARATE from c12 (merge):
cut the version AFTER the merge lands. Derived from observing the actual deploy releases of
**hexa-lang** (`v0.240.x` · release.yml + compile-gate + edge) and **anima** (`v3.54.x` frequent
patch tags). Scope note: academic-archive/DOI/paper "releases" are explicitly OUT — c18 means real
shipped artifacts only. CLAUDE pointer c1–c17 → c1–c18.

## docs(commons): split c17 by blocker type — compiler/runtime core → ING, the rest → direct fix

c17 (upstream-fix) was "fix any upstream block directly". Split it by the kind of blocker:
- **Compiler/runtime core** (compiler/codegen · runtime.a · gen3/gen4 byteeq · toolchain build
  failure · OOM substrate) → do NOT touch directly; **hand off via ING**
  (`harness ing add <symptom+repro> --to hexa-lang`). This is a high-risk zone where multiple
  sessions dig deep concurrently, so a direct edit invites collisions/regressions — leave it on
  the board and proceed. (This session itself never touched hexa-lang's compiler core, only its
  cloud layer.)
- **Everything else** (app logic · CLI · stdlib · cloud · config · docs, i.e. outside the core)
  → still fix the upstream repo directly + land via `harness pr-cycle` (no local shim), in an
  isolated `git worktree`, STOP on concurrent-session activity.
Rationale: for the compiler/runtime substrate, ING hand-off IS the safe straight-ahead move (not
an escape hatch) precisely because of the multi-session collision risk. commons rule count unchanged.

## docs(commons): consolidate — merge c6+c11 into one ING rule, add upstream-fix rule, renumber to c1–c17

Two changes, one cleanup pass over the commons SSOT:

1. **New rule (upstream-fix)** — when work is blocked by a bug/limit/gap in an **upstream**
   dependency (esp. `hexa`/`hexa-lang`, or any dancinlab-owned repo), do NOT paper over it
   locally with a wrapper/shadow/fork/monkey-patch — go fix the upstream repo directly and
   land it via `harness pr-cycle` (proceed whenever needed; don't defer it as "someone
   else's code"). Work shared checkouts in an isolated `git worktree` and STOP on
   concurrent-session activity. Extends c1 (root cause) + the no-escape-hatch rule. This
   session's hexa cloud → ING.jsonl upstream fix (hexa-lang PR #3531) is the canonical instance.

2. **Merge (ING dedup)** — old c6 (인계/hand-off → ING) and old c11 (track in-progress → ING)
   were two rules for the **same `ING.jsonl` board**; merged into a single c6 ("ING 단일 보드 —
   진행추적 · 인계"), folding in the handoff/trail-retirement history. Removes the genuine duplicate.

Net renumber **c1–c18 → c1–c17**: with c11 absorbed into c6 and the new upstream rule appended,
the rules now read c6(ING) · c11(canonical CLI) · c12(docs+pr-cycle) · c13(papers) · c14(walls) ·
c15(pool) · c16(no escape hatch) · c17(upstream-fix). Internal cross-refs + CLAUDE.md pointer
(c1–c17) + README's two `commons c1x` refs all updated in lockstep.

## refactor(trail): retire the `trail` feature — ING is the sole progress tracker

Drop `harness trail` (the main-flow return stack persisted to `TRAIL.md`) entirely,
mirroring the earlier `handoff` retirement: progress/side-quest tracking now lives on
the repo-root `ING.jsonl` board alone (c11 add/next/done). Removed `modules/trail.ts`,
its `cli/index.ts` import + dispatch case + help line, and `TRAIL.md` from the lockdown
allow-list (`lib/config.ts`). Renumbered `config/commons.md` — the old c13 (trail) is
gone and c14–c18 shift up to **c13–c17** (now matching the long-standing `c1–c17`
header), with the three internal cross-references (c14→c13 ×2, c17→c16) updated in
lockstep. Command count 42 → 41. (Sibling repos' existing `TRAIL.md` files are their
own data — untouched; they fall out of use as the feature is gone.)

## refactor(ing): retire the `handoff` feature — ING absorbs cross-repo hand-off

- `harness handoff` (별도 `handoff.jsonl` 레지스트리 + add/ls/done/inject/snapshot) **완전 폐기**. cross-session/cross-repo 인계는 이제 ING 하나로 통합(c6 = c11 한 보드).
- **새 기능 `harness ing add <text> --to <repo>`** — 형제 프로젝트(`~/<repo>`)의 `ING.jsonl` 에 `from` 태그를 달아 직접 남긴다. 대상 repo SessionStart 에 `📥<from>` 으로 표면화(work/show inject 가 from 구분 표시). 대상 repo 부재 시 거부.
- 제거: `modules/handoff.ts` · cli `handoff` 등록/help · plugin+init `handoff inject` hook · setup hook 목록 · `lib/paths.ts` `HANDOFF_DIR` · init `.harness/handoff/` gitignore · keywords `session-handoff` tool→`harness ing`.
- 유지: `handoff-guard`(HANDOFF.md/INBOX.md/inbox/*.md 흩뿌리기 차단 — 안내를 ING 로 전환). enforcement 코드 `HANDOFF-SCATTER` 유지.
- c6 재정의: "인계는 ING 로, 흩뿌리지 말 것". 이 repo `handoff.jsonl` 3건 → ING 마이그레이션(2건 로컬 work · 1건 `--to kosmos` 전달).
- Command count 43 → 42. 검증: `tsx cli/index.ts help` 로드 OK · `ing add --to kosmos` 스모크(kosmos ING.jsonl 에 from:harness 기록) · 전 JSON valid · handoff 핵심 잔여 0.

## refactor(init): absorb the hardcore profile into the default + retire `--hardcore`

- `harness init --hardcore` 폐기. 흡수 후 **기본 init 이 곧 (구)hardcore** — strict 가 디폴트: `protectedBranches:[main,master]` · pre-push(verify + errors drain) hook · single-doc scaffolds(ARCHITECTURE.md/CHANGELOG.md/CLAUDE.md/state/) · ledger staleSec 1800 · enforcement 15룰(block-everything; `--no-verify`·force-push·destructive-git·debug-leftover·hardcoded-secret 차단) · severity fallback=block 가 전부 기본값.
- `profile` 키 제거(코드에서 읽지 않던 순수 표기). `config/enforcement.hardcore.json`·`severity-map.hardcore.json` → 기본 `enforcement.json`·`severity-map.json` 으로 승격 후 변종 삭제(8룰 → 15룰). `harness.config.hardcore.example.json`·`docs/hardcore.md` 폐기.
- `modules/init.ts`: hardcore 분기 9곳 전부 흡수(Flags·starterConfig param·ruleSrc·prefs·single-doc·pre-push·로그). prefs 단일값 = code/docs english · response korean(현행 prefs 일치).
- `cli/index.ts` help(strict by default), `README.md`(self-dogfooding), `CLAUDE.md`(tree), 코드 주석 `(hardcore)` 일반화. `harness-hardcore`(엔진 배포 브랜치명, update.ts)는 별개라 유지. self-dogfooding repo 자신은 `protectedBranches` 미설정(main 직접 push) 유지.
- 검증: temp repo `harness init` → profile 0·protectedBranches·staleSec 1800·15룰·prefs docs english·pre-push·ARCHITECTURE.md scaffold 전부 기본 생성 · `tsx cli/index.ts help` 로드 OK · 전 JSON valid · 잔여 hardcore 0.

## chore(domain): retire the `harness domain` feature — full removal

- `harness domain` (long-horizon goal/milestone tracker → `<NAME>.md` + `.tape` + `DOMAINS.tape` roster) is **fully retired**. It generated the very scattered domain `.md`/`.tape`/roster docs that c4 single-doc discipline now consolidates into a single `ARCHITECTURE.json` tree SSOT (cf. hexa-codex #161, anima #662) — keeping the scatter-generator contradicted that.
- Removed `modules/domain.ts` + its 3 wirings in `cli/index.ts` (import · help block · `case "domain"`). No other code references it.
- Command count 44 → 43 (CLAUDE.md tree). hexa `dojo <domain>`/`deck <domain>` are unrelated (hexa builtins) and untouched.
- Verified: `help` loads clean · `harness domain` → `unknown cmd` · zero residual references.

## fix(pr-cycle): 머지 후 로컬 base(main) 자동 ff-sync — 로컬 뒤처짐 방지

- 문제: `gh pr merge` 가 origin/main 만 갱신하고 **로컬 main 은 그대로** 둬, pr-cycle 반복 시 로컬 main 이 origin 보다 한참 뒤처짐 → 다음 작업 브랜치가 stale base 에서 분기.
- 수정(`modules/pr-cycle.ts`): 머지 검증(onBase) 직후 **step 4.5** 추가 — feature 브랜치에서 `git fetch origin <base>:<base>` 로 로컬 base ref 만 ff 갱신(checkout 전환·working tree 무변, non-ff 면 거부=안전). HEAD 가 base 면 `git pull --ff-only` 폴백.
- slash command(`~/.claude/commands/pr-cycle.md`)에도 동일 base-sync 블록 추가(머지 직후, sweep 전).
- commons **c14** 에 "항상 최신 base 유지 — 로컬 main 뒤처짐 금지 · 새 브랜치는 최신 base 에서 분기" 명문화.
- 검증(c2): `help` 로드 OK · pr-cycle 자기 자신 머지 사이클에서 로컬 main behind 0 확인.

## feat(state): 작업 산출물을 `state/` 단일 폴더로 통일 (scratch·verdicts 흡수)

- 요구: 실험·벤치마킹·검증 등 작업 산출물 보관을 일관화 — 흩어진 `scripts/scratch`·`.verdicts` 대신 **repo-root `state/` 폴더 하나만** 사용(하위 디렉토리 안 쪼갬).
- 변경:
  - `lib/config.ts` — `docs.scratchDir` 기본값 `scripts/scratch` → **`state`**.
  - `modules/verdict.ts` · `modules/verify.ts` · `modules/atlas.ts` — verdict/claim 기록 경로 `.verdicts/` → **`state/`** (verdict 파일 `state/<slug>/<id>.txt` · `state/claims.jsonl`).
  - `modules/init.ts` — 새 repo 스캐폴드가 `scripts/scratch/` 대신 `state/` 생성 + CLAUDE.md 템플릿 트리 갱신.
  - `.gitignore` — `build/`(재생성 가능 컴파일 결과) 추가. `state/` 는 git-tracked(`.gitkeep`). 머신 자동로그는 기존대로 `.harness/`.
- 명문화: commons **c5** 를 "산출물은 `state/` 하나로" 로 강화(흩어진 산출물 디렉토리 신설 금지) · `ARCHITECTURE.json` config 노드 + CLAUDE.md tree 에 `state/` 반영.
- 검증(c2): `help` 로드 OK · `verdict record smoke/t1` → `state/smoke/t1.txt` 🟢 생성 재현 · `verify fence` → `state/claims.jsonl` 기록 재현 · `docs status` scratch=state/ 확인 · 스모크 산출물 정리.

## docs(commons): 헤더에 ARCHITECTURE.json 선참고 안내 추가 (.md fallback 미표기)

- commons.md 헤더 문단에 `🏛️ 프로젝트 설계는 먼저 ARCHITECTURE.json 을 참고하라` 한 줄 추가 — `harness architecture inject`(SessionStart 주입) 의 설계 트리를 단일 출처로 읽고 lockstep 갱신(c4·c14)하라는 안내. 매 UserPromptSubmit 재주입되므로 매턴 상주.
- `.json` 만 명시(사용자 요청대로 `.md` fallback 은 표기하지 않음 — 이 repo 는 JSON 트리 채택).

## docs(commons): c14 매턴 마감 강제 + c11 상태변동 ING 트리거 (미완성/WIP 매턴 push 허용)

- 요구: ① 매 턴 파일이 바뀌면 그 턴에 즉시 닫기(미완성·WIP 여도 push, 다음 턴으로 미루지 않기) ② 파일이 안 바뀌어도 작업 상태가 바뀌면 ING 갱신.
- c14 강화(`config/commons.md`): **매 턴 마감(turn-close)** 조항 추가 — staged/working 변동은 그 턴에 docs+commit+push(사이클 완료면 pr-cycle)로 닫고, "완성될 때까지 묵히기" 금지. **미완성·WIP 무방** — `wip:` 커밋으로라도 매턴 push 해 작업 유실·문서 drift 방지(이 repo 정책; c2 검증은 완성 시점에 닫되 push 를 미루지 않음).
- c11 강화: **상태변동 트리거** 추가 — 파일 변동과 무관하게 작업 상태(시작·단계전환·블로커·완료·다음 한 수)가 바뀌면 그 턴에 ING add/next/done 으로 보드 현행화(ING 는 커밋 불필요).
- salience: commons inject 가 매 UserPromptSubmit 재주입하므로 두 조항 모두 매턴 컨텍스트 상주.

## feat(claudemd): 프로젝트 규칙 매턴 재주입 — CLAUDE.md 를 commons 급으로 강제

- 문제: repo-root `CLAUDE.md`(프로젝트 규칙)는 Claude Code 기본으로 **SessionStart 1회만** 주입돼, 대화가 길어지면 컨텍스트에서 묻혀 규칙이 약해진다. 반면 `commons inject` 는 매 UserPromptSubmit 재주입돼 강하다.
- 신규 `modules/claudemd.ts` + `harness claudemd {inject|show}` — `commons inject` 와 같은 운반 장치로 repo-root CLAUDE.md 를 **매 UserPromptSubmit 재주입**(MUST-FOLLOW 헤더 prepend). 프로젝트 규칙을 commons 급 salience 로 유지.
- 토큰 효율: 선택적 `<!-- enforce:start -->…<!-- enforce:end -->` 블록이 있으면 그 hard-rules 섹션만 재주입(전체 프로젝트 맵 재전송 회피), 없으면 전체. 80KB 초과 절단. CLAUDE.md 부재 시 무음.
- 배선: `cli/index.ts` 등록 + help 라인 · `modules/setup.ts` hookSpec UserPromptSubmit(commons 다음) · `plugin/hooks/hooks.json` UserPromptSubmit 추가.
- 검증(c2): help 로드 OK(import 정상) · `claudemd inject` UserPromptSubmit 모사 → 유효 envelope(MUST-FOLLOW 헤더) · `enforce` 마커 추출(맵 제외, RULE 블록만) 재현 · 이벤트/파일 부재 시 무음 확인.

## docs(commons): c18 신설 — 우회경로는 지시 전 작성 금지 (escape-hatch only on request)

- 계기: G-RAW-GPU-CLOUD 차단을 만들 때 AI 가 임의로 `# cloud-ok` 탈출구를 끼워 넣어 "전면 금지" 가 안 됐던 사례 → 거버넌스 규칙으로 박제.
- 신설(`config/commons.md` c18): 유저가 **명시적으로** 요청하기 전에는 구현 시 우회경로(exception/bypass 마커 · opt-out 플래그 · skip 조건 · fallback 분기 · 가드 무력화 탈출구)를 만들지 않는다. 금지·차단 요청은 글자 그대로 전면 차단으로 구현. c1(shadow 가드 금지)·c3(anti-punt)·c9(정직)의 연장선.
- 기존 마커 탈출구(force-push `# force-ok` 등)는 유지, **새로** 만드는 차단·가드·정책에만 적용.

## fix(enforcement): G-RAW-GPU-CLOUD 를 warn→block(전면차단) 승격 — runpod/vast 직접 사용 금지, hexa cloud 강제

- 요구: runpod·vast 의 CLI·API 직접 사용을 **전면 금지**(예외 없음)하고 GPU 클라우드 작업을 `hexa cloud` 로 강제 (commons c12 의 mechanical teeth).
- 변경(`config/enforcement.json` G-RAW-GPU-CLOUD): `action` warn→**block** 승격(이전엔 경고만 하고 통과) · `match` 패턴에 `pip install runpod|vastai` SDK 설치 경로 추가 · `exceptions` 를 **빈 배열로** 비워 `# cloud-ok` 탈출구 제거(마커가 있어도 차단) · `reason` 에 "전면 금지·예외 없음" 명시.
- 커버: `runpodctl`·`runpod`·`vastai` CLI · `pip install runpod|vastai` · `curl|wget` 로 `runpod.io|vast.ai` API 엔드포인트 호출. 정책 변경은 이 규칙을 직접 수정해야만 가능(인라인 우회 불가).
- 검증(c2): JSON valid · `pre bash` 로 runpodctl·vastai·`pip install runpod`·`curl api.runpod.io`·`runpodctl # cloud-ok` 5종 모두 `{"decision":"block"}` 재현 · `hexa cloud run …` 만 통과 확인.

## fix(pool): `status` 에 🔓 제한-해제 마커 추가 — 해제된 제한 호스트를 공용과 구분

- 증상: anima 컨텍스트(cwd 에 `anima` 세그먼트)에서 `pool status` 를 돌리면 akida 가 진짜 공용 호스트(aiden·summer)와 똑같은 🟢 로 떠, "잠금인지 아닌지" 구분이 안 됨. `list` 는 이미 `🔓 허용(via)` 으로 구분하는데 `status` 만 누락.
- 근본 원인(c1): 게이트는 설계대로 동작(akida `shared:false`+`allow:["anima"]` → anima 경로면 in-context 해제) — 버그가 아니라 **status 출력 레이어의 정보 결손**. 해제된 제한 호스트를 bare 🟢 로 뭉갬.
- 수정: `modules/pool.ts` status 출력부 — guard 통과한 제한 호스트(`isRestricted`)는 🔓 마커 + `— 제한 호스트 · 현재 해제(via)` 주석으로 표기. 도달 불가 시 ` · 도달 불가` 부기. roster·gate 로직 무변경(표시 레이어만).
- 검증(c2): `help` 로드 OK · harness cwd → akida 🔒 차단 · anima cwd → `🔓 akida … 현재 해제(in-context)` 양쪽 재현.

## feat(architecture): SessionStart 에 ARCHITECTURE.json 자동 주입 (CLAUDE.md 처럼)

- 신규 `modules/architecture.ts` + `harness architecture {inject|show}` — SessionStart 에서 repo-root `ARCHITECTURE.json`(우선)/`.md` 를 additionalContext 로 주입. CLAUDE.md 처럼 첫 턴부터 설계 SSOT(c4·c14)가 컨텍스트에 상주해, 매번 파일을 열지 않아도 최종 아키텍처를 참조·lockstep 갱신할 수 있음.
- JSON 우선(c4 — AI·툴 파싱 타깃). 80KB 초과 시 head+포인터로 절단해 컨텍스트 폭주 방지. 파일 부재·이벤트 없음 시 무음(다른 inject 와 동일 가드).
- hook 배선: `cli/index.ts` 등록 + help 라인 · `modules/setup.ts` hookSpec SessionStart · `plugin/hooks/hooks.json` SessionStart 에 `harness architecture inject` 추가 (commons·recommend 다음, worktree gc 앞).
- 검증(c2): `architecture inject` SessionStart 모사 → 유효 envelope JSON, additionalContext 8904자(미절단) · 이벤트 없음 시 무음 · `help` 로드 OK · hooks.json valid.

## docs(commons): c16 도입부 정정 — "한 번 시도"가 아니라 MULTI-LENS(≥2–3 렌즈) 이상

- c16 도입부가 "다른 렌즈로 돌파를 **한 번은** 시도하고서야 terminal" 로 약하게 쓰여 있던 것을 정정: terminal 로 받으려면 **MULTI-LENS(≥2–3 원리적 렌즈) 이상** 돌파를 시도하고 각각 통제(shuffle/ablation/negative-control)로 기각된 뒤에야 받아들인다 — **한 번 시도로 끝내지 않는다** (단일 렌즈 한 번 막힘은 미완). (d)천장 항목과 도입부의 강도를 일치시킴.

## docs(commons): c16 — 벽 분류(taxonomy) 5종 + MULTI-LENS·ablation 천장확정 + 법칙도 벽

- anima `a_break_the_wall` 거버넌스를 project-agnostic 으로 일반화해 commons c16 을 강화. 기존 "다른 렌즈로 한 번은 돌파 시도" 골격 위에 벽 **분류 우선** 체계를 추가:
  - (a) 틀린 측정/metric-artifact · (b) 틀린 방향/변수 혼재 · (c) substrate/인프라 벽 · (d) 진짜 천장/중복 · (e) 투자 부족 — 종류마다 돌파법·난이도가 다름.
  - (c) **인프라/측정 벽을 과학·성능 천장으로 박제 금지** — 근본수정(c1) 대상, substrate 가 돈 뒤에야 verdict.
  - (d) **CONFIDENT-terminal 은 MULTI-LENS** — 다른 원리적 렌즈 ≥2–3개를 각각 통제(shuffle/ablation/negative-control)로 기각한 뒤에야 천장 확정. ablation 동일 → 메커니즘 INERT.
  - (e) 투자 부족 → c17 대로 pool/`hexa cloud` 분산.
  - **LAW(법칙)도 벽** — 사후맞춤 descriptive 법칙은 새 케이스 frozen 예측 + 실측 falsify 후에만 확정.
- tune-to-green 금지(c9·p7) · frozen-first + 대조 원칙은 유지.

## feat(pool): `specs` — 호스트별 코어·메모리·GPU 프로브 + 인라인 표기

- 신규 `harness pool specs [name]` — 각 공용 호스트를 ssh 로 프로브해 **코어 수·총 메모리(GiB)·GPU 모델**을 수집하고 로스터(`~/.harness/pool.json`)의 `Host.specs` 에 캐시. 한 호스트만 지정(`specs <name>`)도 지원.
- 프로브는 POSIX-sh 단일 라인(`CORES=…|MEM=…|GPU=…`) — Linux(`nproc`·`/proc/meminfo`·`nvidia-smi`)와 macOS(`sysctl`·`system_profiler`) 양쪽 대응. 단일따옴표 awk/sed 로 원격 필드변수(`$2`) 보호, `${...}` 미사용으로 ssh verbatim 전달 안전.
- `list`·`status` 가 캐시된 스펙을 `〈12c · 30G · GPU:RTX 5070〉` 형태로 인라인 표기. `list` 는 미수집 시 `pool specs` 안내 1줄 출력. GPU 없으면 `GPU:없음`.
- `shared:false` **제한 호스트(akida·ghost)는 프로브하지 않음** — on/status 차단과 동일하게 공용 자원만 건드림.
- 검증(c2): `harness pool specs` 실동작 — aiden·summer 각 `12c · 30G · GPU:NVIDIA GeForce RTX 5070` 수집, akida·ghost 차단(프로브 안 함) 확인. `list`·`status` 인라인 반영 + `npx tsx cli/index.ts help` 로드 OK.

## docs(commons): c17 — 무거운 작업은 pool(공유 컴퓨트)에서 분산 실행

- 신규 always-on 규칙 **c17** 추가: 빌드·테스트·대규모 스윕·장시간 연산 등 무거운 작업은 로컬 단일 머신에 몰지 말고 `harness pool` 로 등록된 공유 컴퓨트 호스트에서 돌린다(`pool on`/`bg`/`route`/`status`). `shared:false` 제한 호스트는 공유 풀로 쓰지 않음(가드 차단). GPU·학습은 c12 대로 `hexa cloud`/`hexa dojo` 우선.
- CLAUDE.md SSOT 참조 `c1–c16` → `c1–c17` 갱신.

## chore(governance): GPU/학습/deck 강제를 hexa 빌트인으로 전환 · demi 폐기

- **cloud**: GPU 클라우드 권장 도구를 `harness pod` → **`hexa cloud`** 로 전환. keywords `gpu-cloud-pod`→`gpu-cloud-hexa` (tool=`hexa cloud`, hint 갱신), enforcement `G-RAW-GPU-CLOUD` reason/exception(`# pod-ok`→`# cloud-ok`)도 hexa cloud 로. runpod/vast raw 차단 룰 자체는 유지.
- **deck**: 신규 keywords `input-deck` 트리거 추가 (deck·빵틀·input deck → **`hexa deck <domain> <slug> '<spec>'`**). `hexa deck` 이 hexa-lang upstream 에서 1급 서브커맨드로 승격됨(PR #3453)에 따라 강제 가능해짐.
- **dojo**: 학습잡 권장 도구를 `harness dojo` → **`hexa dojo <domain> <slug> '<spec>'`** 로 전환 (keywords `training-job` hint 갱신).
- **demi 폐기**: 실수로 구성됐던 `design-architecture` keywords 트리거(→`harness demi`) 제거. demi 는 harness 엔진 모듈로 존재하지 않았고(트리거로만 강제) 설계 작업을 특정 도구로 강제할 근거 없음 → 트리거 삭제로 폐기.
- commons c12 전면 갱신: GPU·학습·deck = hexa 빌트인 명시, demi 제거, "폐기된 hexa cloud" 표현 삭제(이제 권장), `hexa` 글로벌 PATH 사용 추가.
- 검증(c2): keywords/enforcement JSON valid · demi 0건 · `harness prompt` 로 deck/cloud/dojo 트리거가 hexa 힌트 발화 + 설계 키워드 무발화(demi 폐기) 출력 확인 · `hexa deck` 머지된 toolchain 에서 실동작(rc=0, 6 domains).

## fix(ing): `done <id>` no longer mass-scrubs the board (substring → exact-id match)

- **데이터 유실 버그**: `modules/ing.ts` 의 `done` 이 `r.id === m || text.includes(m)` 로 매칭 — `done 1` 시 `text.includes("1")` 가 텍스트에 숫자 1이 든 **모든 항목**(H_1382·303M·id=12…)을 매칭해 보드 전체를 scrub. 텍스트에 숫자가 흔한 ING 에선 단일 id done 이 OPEN 항목까지 통째로 날림(anima 세션 2회 재현 + main merge 로 빈 ING 전파).
- **근본 수정**: id 정확매칭(`r.id === m`)을 **우선**. id 매칭이 없을 때만 text substring fallback 을 쓰되 **정확히 1건일 때만** 삭제 — 여러 건 매칭이면 거부(`모호 — 정확한 id 로 지정`)해 느슨한 term 의 대량 scrub 을 차단. pod 은 종전대로 제외.
- 검증(c2): 텍스트에 "1"이 든 3건 보드에서 `done 1` → id=1만 삭제(1건), #2·#3 유지 · `done 99` → 거부 · `done korean`(1건 매칭) → 삭제. 출력으로 확인.
- ARCHITECTURE.json L4 modules 에 `ing` 노드 추가(종전 누락).

## fix(doc-gate): pr-cycle gates ARCHITECTURE.json (not just .md) + adds ING.jsonl 현행화

- `modules/pr-cycle.ts` doc-gate 가 `ARCHITECTURE.md` 만 하드코딩하던 걸 **`ARCHITECTURE.json` 우선**(없으면 `.md`)으로 일반화 — lint.ts 와 동일 패턴. 의미있는 변경에 ARCHITECTURE(존재 형식) 미동반이면 거부.
- **신규 ING gate**: `ING.jsonl` 이 tracked 인 repo 는 사이클 변경 시 `ING.jsonl` 현행화(완료분 `harness ing done` / 다음 단계)도 함께 staged 안 됐으면 pr-cycle 거부. 진행상황이 매 사이클 따라오게 강제.
- commons c14: 사이클 문서 목록에 `ING.jsonl` 추가, doc-gate 거부 조건에 ING 포함. ARCHITECTURE.json `lint` 노드 상세도 현행화.
- 검증: `python3 json.load` PASS · `harness lint fast` = ok (pr-cycle.ts 컴파일 PASS).

## feat(architecture): serve.py — 로컬/LAN 뷰어 서버 (ghost 등 다른 기계에서도 접속)

- **신규 `serve.py`** — `python3 serve.py [port] [--no-open]`. `ARCHITECTURE.html`이 있는 디렉토리에서 정적 서버를 띄우고(`file://` fetch 차단 우회) 브라우저를 자동으로 연다. 포트 기본 8000, 사용 중이면 다음 포트 안내.
- **LAN 노출**: `0.0.0.0` 바인딩이라 같은 네트워크의 다른 기계(예: ghost `192.168.50.150`)도 접속 가능. 시작 시 이 기계의 LAN IP를 자동 탐지해 `http://<IP>:<port>/ARCHITECTURE.html` 안내를 출력(`--no-open`은 헤드리스용).
- `ARCHITECTURE.json`에 `viewer` 그룹(ARCHITECTURE.html · serve.py) + `serve` 메타 추가. README·commons c4에 로컬 보기(`python3 serve.py`) / 원격 보기(raw.githack.com · GitHub Pages) 명시.
- 검증: 헤드리스 기동 후 `localhost`·실제 LAN IP(192.168.50.39) 양쪽에서 `ARCHITECTURE.html`(text/html)·`ARCHITECTURE.json`(application/json) 200 + IP 안내 출력 PASS.

## docs(architecture): ARCHITECTURE.md → ARCHITECTURE.json (tree SSOT) + ARCHITECTURE.html (viewer)

- **신규 SSOT `ARCHITECTURE.json`** — 아키텍처를 산문(.md) 대신 **컬럼형 재귀 트리**로 표현. 노드마다 명시적 컬럼 키(`이름`·`역할`·`구분`·`상세`) + `children`. 상단 `columns[]`가 표시 열 순서를 정의(`tree:true` 컬럼이 가지 렌더). JSON이 단일 진실원 — AI/툴은 파싱, 사람은 뷰어로 본다.
- **신규 뷰어 `ARCHITECTURE.html`** — 의존성 0 자립형. `ARCHITECTURE.json`을 fetch해 컬럼 그리드 트리로 렌더(접기/펼치기·전체 검색·다크모드). `file://` fetch 차단 시 드래그&드롭 fallback + `python3 -m http.server` 안내. 데이터는 일절 안 들고 있음(SSOT는 json).
- **`ARCHITECTURE.md` 삭제** — 내용은 전량 json으로 이전(+ git history 보존).
- **lint doc-gate 일반화** (`modules/lint.ts`): 하드코딩 `ARCHITECTURE.md` → `ARCHITECTURE.json`이 있으면 그걸, 없으면 `.md`를 게이트. 둘 중 존재하는 형식만 현행화 강제. rule 이름(`ARCHITECTURE-MISSING`)은 유지.
- **commons 갱신** (`config/commons.md` c4·c14): ARCHITECTURE SSOT가 `.md` 산문 또는 `.json` 트리[+`.html` 뷰어] 중 택1임을 명시. README의 ARCHITECTURE 참조도 json/html로 갱신.
- 검증: `python3 json.load` PASS · flatten 시뮬 60행/4컬럼·트리 가지(`├─└─│`) 정렬 PASS.

## fix(pool): remote ssh command no longer expands locally — argv exec, not shell string

- `pool on <host> <cmd>` 가 `execShell` 으로 `ssh ... "remotecmd"` 전체 문자열을 **로컬 mac 셸(`bash -lc`)** 에 통과시키던 버그. ssh 가 보내기 *전에* 로컬 셸이 `$VAR`/`$(...)`/백틱을 먼저 전개 → `harness pool on aiden 'echo $(hostname)'` 가 원격 호스트가 아니라 **mac 의 hostname** 을 출력하고, 셸 변수는 로컬에서 빈 값으로 사라짐.
- 수정: `modules/pool.ts` 의 `SSH` 상수(공백조인 문자열)를 `SSH_ARGS` argv 배열로 바꾸고, `on`/`status` 의 ssh 호출을 `execArgs("ssh", [...SSH_ARGS, h.target, cmd], opts)` 로 전환 — ssh 바이너리를 직접 spawn(로컬 셸 없음). `cmd` 를 단일 argv 원소로 넘기므로 로컬 전개가 일어나지 않고, ssh 가 원격 로그인 셸로 그대로 전달해 거기서 전개(파이프 `| sudo tee`·리다이렉트 `>> file` 도 원격에서 정상 동작).
- 가드(제한 호스트 차단)·list/status 출력·pool.json 은 무변경. 검증(aiden): `echo REMOTE_$(hostname)` → `REMOTE_aiden-B650M-K` (mac 아님) · `echo hi | tr a-z A-Z` → `HI` · `echo OK` → `OK` · 비-anima cwd 에서 `on akida` → 차단(exit 1, 차단됨) PASS.

## feat(pool): enforce restricted hosts — private/research machines blocked from shared pool use

- `pool.json` 의 `shared:false` 플래그가 그동안 **로스터에 적혀만 있고 강제되지 않았음** (`Host` 인터페이스가 `name`/`target` 만 읽음) → 어느 repo 에서든 `harness pool on akida` 가 통과돼 anima 연구 전용 머신이 공용 컴퓨트로 사용됨.
- `modules/pool.ts` 에 가드 추가: `shared:false` = **제한 호스트**. `allow:[...]` 프로젝트 마커(cwd 경로 세그먼트, 대소문자 무시·정확한 세그먼트 매칭이라 `anima` 가 `animation` 에 안 걸림)와 현재 위치가 일치할 때만 허용. 불일치 시 `on` 차단(ssh 전 `loudFail`+exit 1) · `status` 는 ping 안 하고 🔒 표시 · `list` 는 🔓허용/🔒차단 + 허용 프로젝트 표기.
- 의도적 일회성 override 는 env `HARNESS_POOL_ALLOW="<name> ..."` (loud · 우연한 공용사용 아님). `allow` 없는 제한 호스트(ghost=개인 시스템)는 어느 프로젝트에서도 차단.
- `~/.harness/pool.json` 의 akida 에 `allow:["anima"]` 부여. 검증: dancinlab/harness 에서 `on akida`/`on ghost` → 차단(exit 1) · `on aiden` → 통과 · `/tmp/anima/sub` 에서 `on akida` → 통과 · env override → list 🔓 모두 출력 PASS.

## feat(verify): tier-rubric claim verification (sidecar parity) · old verify → `ci`

- **rename**: 기존 `harness verify`(설정된 빌드/테스트 검증명령 병렬 실행) → **`harness ci`**. config 키는 호환 위해 `verify.checks` 그대로. 로그 kind `verify`→`ci`. 문서/keywords/commons/enforcement 의 `harness verify` 참조 일괄 `harness ci` 로 치환.
- **신규 `harness verify`** = sidecar verify 이식 — 6단계 티어 루브릭(🔵 SUPPORTED-FORMAL · 🟢 NUMERICAL · 🟡 BY-CITATION · 🟠 INSUFFICIENT · 🔴 FALSIFIED · ⚪ SPECULATION-FENCED) + 규율(LLM 자가판정 금지·배지 verbatim·자동승격 금지·honesty-triad). `verify rubric`(루브릭 출력) · `verify fence "<claim>"`(⚪ 박제 → `.verdicts/claims.jsonl`) · `templates/verify.md` 런북. hexa 의존 form(`<id>`·`--expr`)은 범용 harness 에서 제외.
- commons c12 에 `harness ci`(검증명령)·`harness verify`(주장검증) 추가. 검증: `ci list`·`verify rubric`·`verify fence` 동작 + 엔진 로드 PASS.

## feat(lint): doc-gate at commit time too — ARCHITECTURE·README·CHANGELOG enforced every task

- pre-commit `harness lint` 에 doc-gate 추가: 의미있는 코드 변경이 staged 인데 `CHANGELOG.md` / (존재 시) `ARCHITECTURE.md`·`README.md` 가 같이 staged 안 됐으면 **commit 차단**. 기존엔 `pr-cycle` 시점에만 강제됐으나, 이제 pr-cycle 을 거치지 않는 모든 작업/커밋에도 동일 강제. 신규 룰 `ARCHITECTURE-MISSING`·`README-MISSING` = block (severity-map). 우회: `git commit --no-verify`.
- commons c14 에 "매 커밋 lint 에서도 발화" 명시. README·ARCHITECTURE 의 lint/doc-gate 설명 현행화.

## feat(domain): long-horizon goal/milestone tracker (sidecar parity)

- `harness domain` 추가 — 장기 목표·마일스톤 추적. `<NAME>.md`(snapshot: `@title:`·`@goal:`·`- [ ]`/`- [x]` 마일스톤) + `<NAME>.tape`(append 로그) + `DOMAINS.tape`(roster `@domain NAME := "./path"`) + `.harness/domain-active`(repo-local active 포인터). verbs: init·set|`<NAME>`·list|ls[--sync]·goal·ms|milestone·title·done `<match>`·absorb `<file>`[--state]·todo|new·bare(show). NAME = UPPERCASE/digit 시작 [A-Z0-9+-]+ (`_` reject, `+` 메타도메인 e.g. `RTSC+HTS`).
- 구현: `modules/domain.ts` + cli 등록. sidecar `skills/domain/_domain.hexa`(1565 LOC hexa) → harness ts 이식, active store 는 세션별 tsv 대신 repo-local 단일 파일로 단순화. ing(작업)·trail(곁가지)와 층위 구분: domain=장기 목표/마일스톤.
- 검증: 임시 repo 에서 init→goal→ms×3→done(▓░░░░ 25%)→list(★active)→bare-name 전환→absorb(포인터 교체)→`_` reject 전부 PASS.

## feat(setup): install-hooks enables SendMessage (agent-teams) by default

- `harness install-hooks [--global|--repo]` 가 hook 배선과 함께 `settings.json` 의 `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 을 세팅 — 백그라운드 subagent 에 `SendMessage`(Claude Code 실험 agent-teams)를 기본 활성화. 키가 이미 있으면 사용자 값 보존(덮어쓰지 않음). 검증: 신규 settings → flag=1, 기존 `"0"` → 재실행해도 보존.
- 배경: 실행 중 백그라운드 에이전트에 메시지를 못 붙이는 문제(SendMessage 미가용)를 신규 설치 시점에 자동 해소. ghost·mini 는 수동 적용 완료.

## feat(gap): multi-axis gap exploration runbook (sidecar parity)

- `harness gap [full|list|<scope>]` 추가 — 현재 작업을 40개 돌파전략 렌즈(8 family: Math-Structural·Adversarial-Stress·Economic-Resource·Epistemic-Evidence·Convergence-Closure·Simplicity-Canonical·Temporal-Dynamics·Coverage-Consistency)로 훑어 gap 을 표면화. 3모드: bare=mode C(40렌즈 인라인 트리아지 → hot family 만 subagent deep-dive) · `full`=mode A(family당 subagent fan-out, 트리아지 생략) · `list`=카탈로그 출력. surface·prioritise 만 하고 fix 안 함.
- 구현: `templates/gap.md`(런북 본문, sidecar `commands/gap` 이식) + `modules/runbooks.ts` runGap + cli 등록. DESIGN.log→ARCHITECTURE/CHANGELOG, subagent=Agent tool(Explore/general-purpose)로 harness 맥락 조정. 검증: 8 family·42 bullet(occams-razor F4·F6 중복) 출력 + args 힌트 확인.

## feat(pr-cycle): doc-gate also requires README.md current-info each cycle

- pr-cycle doc-gate 에 README.md 추가: 의미있는 변경 시 README.md(repo 에 존재하면) 미갱신이면 ARCHITECTURE 와 동일하게 **거부**. 매 사이클 README 최신정보 유지 강제. commons c14 문구도 README 포함으로 갱신.
- 검증: 이 PR 자체가 새 게이트를 통과(CHANGELOG+ARCHITECTURE 불필요·README 갱신 동반). `--no-doc` 우회 보존.

## docs(commons): c16 — break through walls (closed-negative ≠ terminal)

- mini 세션에서 작성된 c16 을 repo SoT 로 반영: 벽(closed-negative·블로커)에 부딪히면 다른 메커니즘·각도·렌즈로 돌파를 한 번은 시도한 뒤에야 terminal 로 인정. 단 tune-to-green 금지(c9·p7) — 돌파는 사전등록(frozen-first)+대조(shuffle/dissociation/negative-control)로 검증된 진짜 새 각도라야 하고, 진짜 시도 뒤의 정직한 terminal 도 유효한 결과. CLAUDE.md SSOT 참조 c1–c16 로 갱신.

## feat(enforce): warn on raw runpod/vast CLI·API → steer to `harness pod`

- `pre bash` 규칙 G-RAW-GPU-CLOUD 추가: `runpodctl`/`runpod`/`vastai` CLI 또는 `runpod.io`/`vast.ai` 로의 curl/wget/http 직접 호출 감지 시 **warn(유도)** — GPU 클라우드는 `harness pod` 런북으로 가도록 안내. block 아님(되돌리기·유도 성격). 의도적이면 `# pod-ok <이유>` 마커로 예외.
- 검증: runpodctl·vastai·curl runpod API 모두 warn 발화, `# pod-ok` 예외 침묵, "vast number" 류 오탐 없음(vastai 만 매칭, vast 단독 제외).

## feat(enforce): pod/demi/dojo to sidecar level (keyword triggers + c12)

- GPU 클라우드(`harness pod`)·설계(`harness demi`)·학습잡(`harness dojo`) 사용을 hint 가 아닌 **keywords 트리거**로 강제 — sidecar 수준. `config/keywords.json` 에 gpu-cloud-pod(gpu/runpod/vast/파인튜닝/hexa cloud…→pod), design-architecture(아키텍처 설계…→demi), training-job(학습잡/dojo…→dojo) 3룰 추가. UserPromptSubmit hook 매칭 시 자동 발화.
- commons c12 목록에 pod/demi/dojo 추가 + "수동 runpod·vast·train 스크립트" 안티패턴 명시. 검증: 세 트리거 모두 `harness prompt` 에서 발화 확인.

## fix(pr-cycle): strip own flags before `gh pr create`

- `pr-cycle --no-doc` 가 `--no-doc` 를 `gh pr create` passthrough 에 그대로 넘겨 `unknown flag` 로 실패하던 버그. pr-cycle 자기 플래그(OWN_FLAGS)는 passthrough 에서 제외. push 단계는 영향 없었음.

## docs(commons): c15 — no proactive papers before explicit ask

- commons 에 c15 추가: 유저가 명시적으로 논문/arXiv/레퍼런스/선행연구를 요청하기 전에는 논문을 먼저 언급·제시·추천·인용하지 않는다. 일반 응답에 곁다리 논문 나열 금지, `harness research` 도 유저 지시 시에만. CLAUDE.md SSOT 참조도 c1–c15 로 갱신.

## feat(lockdown): L0 is opt-in — none until designated + `harness lockdown` 관리 명령

- **DEFAULT 변경**: `lib/config.ts` DEFAULTS 에서 `lockdown.fromMarkdown: "CLAUDE.md"` 제거 → config 없는 repo 는 **L0 0개**(별도 지정 전엔 없음). 기존엔 CLAUDE.md 의 🔴 L0 블록을 자동 스캔해 L0 가 암묵적으로 생겼음(CLAUDE.md 자체 포함 가능) — 이제 OFF. markdown 스캔은 `lockdown.fromMarkdown` 을 명시한 repo 만 opt-in.
- **`harness lockdown` 신규 명령** (`modules/lockdown-cmd.ts`): `status`/`list` 조회 · `add <path...>` 지정 · `rm <path...>` 해제 · `check <path>` 판정. add/rm 은 `harness.config.json` 의 `lockdown.files` 를 다른 키 보존하며 갱신.
- 검증: 임시 repo 에서 🔴 CLAUDE.md 블록이 있어도 기본 NONE · add→config 기록→check L0→rm→NONE 라운드트립 PASS. harness-build 자체(명시 5파일)는 그대로 유지, CLAUDE.md 는 `not L0` 확인.

## docs(commons): c12 — prefer global `harness`, avoid stale `.harness-engine`

- 버그: repo `.harness-engine`(서브모듈) 핀이 stale 하면 global recommend default(완성도)를 못 읽어 `resolve-mode auto` 가 4축 balanced 로 떨어짐(글로벌 harness 는 정상). mini hexa-lang `.harness-engine` 49866ad → 최신 bump 으로 즉시 해소.
- c12 강화: 항상 PATH 글로벌 `harness` 사용, stale 가능한 `.harness-engine/bin/harness` 직접 호출 지양. 최신화 `harness self-update`.

## docs: root CLAUDE.md for the harness repo (self-dogfood c4)

- harness repo 자체에 루트 `CLAUDE.md`(프로젝트 설명 + 트리구조·노드별 설명 + SSOT 링크) 추가 → 자기 규칙(c4 메인 CLAUDE.md) 준수, lint `CLAUDE-MD-MISSING` 경고 해소.

## fix: single architecture SSOT at root — consolidate + enforce (둘 다 금지, 루트에만)

- harness-build 자체를 단일 SSOT 로 정리: `docs/architecture.md` → 루트 **`ARCHITECTURE.md`** 이동, guides·README 참조 갱신.
- **DOC-ARCH-NONROOT 가드**: `pre write` 에서 루트 외 architecture 문서(`docs/architecture.md`·`sub/ARCHITECTURE.md` 등) 생성 차단 → 루트 `ARCHITECTURE.md` 단일 SSOT 로 통합 유도. (아키텍처를 두 곳에 두는 것 금지.)

## feat: pr-cycle doc-gate — ARCHITECTURE.md도 매 사이클 필수 (존재 시)

- doc-gate 를 "권장"에서 **차단**으로 승격: repo 에 `ARCHITECTURE.md`(최종 아키텍처 SSOT)가 있으면 매 의미있는 사이클마다 갱신 없으면 CHANGELOG 와 함께 **거부**. 누락 문서 목록을 한 줄로 표시. (`--no-doc` 우회.)
- commons c14 문구도 ARCHITECTURE 필수로 갱신. (gate 는 루트 `ARCHITECTURE.md` 존재 여부로 판단 — 없는 repo 는 CHANGELOG 만.)

## feat: pr-cycle doc-gate + commons c14 — every cycle = docs + verified merge

- pr-cycle 에 **doc-update 게이트** 추가: 이번 사이클(origin/<base>...HEAD) 에 의미있는 변경이 있는데 `CHANGELOG.md` 갱신이 없으면 push 전 **거부**(`--no-doc` 로만 우회). `ARCHITECTURE.md`(SSOT) 존재 시 미갱신이면 권장 안내.
- commons **c14** 추가: 매 작업 사이클 = ① 문서(CHANGELOG append + 설계변경 시 ARCHITECTURE) ② `harness pr-cycle` 로 검증된 main 머지. 커밋만 쌓기/문서 없이 머지 금지.

## feat: pr-cycle — relay-verbatim Korean merge report block

- 최종 출력을 "✅ <base> 머지 완료 — 검증됨 / 상태 / 머지 커밋 → origin/<base> 포함 확인 / 최신 / PR #" 블록으로 (새 세션 에이전트가 그대로 복사해 보고하도록). 미검증 시 "⚠ <base> 머지 미검증 — 수동 확인 필요".

## feat: pr-cycle — verified merge confirmation + CI-retry + method fallback

- 머지 후 **실제 origin/<base> 에 올라갔는지 검증**: `gh pr view` 로 state·mergeCommit·base·PR# 조회 → `git fetch` + `git merge-base --is-ancestor <sha> origin/<base>` 로 확인 → `✅ MERGED → <base> @ <sha> (PR #N) · ✔ verified` 명확 블록 출력 ("PR #N 머지" 만 떠서 main 반영 여부 불명확하던 문제 해결).
- CI 대기(required status/pending/UNSTABLE) 시 20s 간격 12회 폴링-재시도.
- 머지방식 disallowed 시 `--squash → --merge → --rebase` 자동 fallback (레포별 룰셋 차이 대응).
- 검증 실패 시 `⚠ could NOT verify … check manually` 경고 + exit 비정상.

## docs(commons): add c13 (trail — main-flow return stack)

- commons.md 에 c13 추가 — 곁가지로 샐 때 `harness trail push`, 복귀 시 `pop` (repo-root TRAIL.md, git-tracked). 곁가지 타다 원래 작업 잊는 것 방지, 스택 깊어지면 복귀 우선.

## docs(commons): add c11 (ING in-progress tracking) + c12 (use the harness CLI)

- commons.md 에 c11 추가 — 다단계/장기 작업은 `ING.jsonl`(`harness ing add/next/pod`, done=scrub)에 추적, SessionStart 표면화.
- c12 추가 — 같은 일은 harness 명령으로(imagine·research·watch·pool·lsp·secret·sbs·micro-exp·verdict), raw/우회·폐기된 sidecar/hexa-cloud 습관 대신 harness 우선. (에이전트가 harness 기능을 안 쓰고 우회하던 문제 대응.)

## feat: Claude Code plugin package (marketplace) — reload via /plugin

- harness 를 **Claude Code 플러그인**으로 패키징: `.claude-plugin/marketplace.json`(마켓 "harness") + `plugin/.claude-plugin/plugin.json` + `plugin/hooks/hooks.json`(전역 `harness` CLI 를 guard 와 함께 호출). sidecar 처럼 `/plugin` 으로 reload·enable/disable 관리 가능.
- 설치: `claude plugin marketplace add ~/.harness/cli` → `claude plugin install harness@harness`. settings.json 직접 주입(install-hooks)과 **택일** — 플러그인 쓰면 `harness install-hooks --uninstall` 로 settings 훅 제거(중복발동 방지).
- `harness install-hooks --uninstall` 추가 (settings.json 에서 harness 훅 제거).

## feat: install-hooks (global) + self-update — harness fires everywhere (plugin-equivalent)

- 문제: harness 훅이 repo별 `.claude/settings.json` 에만 있어 (gitignore/미클론/미-init 시) **무시됨**. 이전 sidecar 는 전역 플러그인이라 항상 발동했는데 제거됨 → mini 전역 훅 0개 → 아무것도 안 걸림.
- **`harness install-hooks [--global|--repo]`** — `~/.claude/settings.json`(전역, 기본)에 harness 훅 블록(PreToolUse pre bash/write/askq · PostToolUse post edit · UserPromptSubmit prompt+commons+recommend+prefs+easy inject · SessionStart commons/recommend/worktree gc/handoff/ing inject)을 merge → **모든 세션/repo 에서 발동**(전역 플러그인 등가). 기존 비-harness 훅 보존, 재실행 시 harness 항목 dedup. 전역 `harness` 가 PATH 에 있어야 함.
- **`harness self-update`** — 이 바이너리가 실행되는 CLI clone(예: `~/.harness/cli`)을 최신 main 으로 git-pull. (repo 의 submodule 은 `harness update`.)
- 적용: mini·ghost 전역 훅 설치 + `~/.harness/cli` 최신화 완료.

## feat: commons — always-on cross-project governance SSOT

- **`harness commons {inject|show}`** — 프로젝트-무관 거버넌스 규칙(c1~c10: root-cause·verify·anti-punt·single-doc·preserve·handoff·git-safety·4축추천·honesty·surgical)을 번들 `config/commons.md` 에서 매 턴 inject(UserPromptSubmit) → 컨텍스트에서 안 사라짐. repo override: `.harness/commons.md`.
- 규칙들은 harness 훅(pre write root-cause·docs·tmp-guard·handoff-guard·git-guard·verify·recommend·askq)이 기계적으로도 강제 — commons 는 그 단일 살라이언스 SSOT.

## feat: ing — jsonl board + SessionStart inject (잘 안 쓰이던 ING 개선)

- ING.md → **repo-root `ING.jsonl`** (한 줄 1항목, 기계가독·append/scrub). kinds: work·next·pod.
- `done <id|match>` = **scrub**(완료분 제거 → CHANGELOG 로 졸업, ING 은 active 만 보유). 비면 파일 삭제.
- **`ing inject`**(SessionStart): 진행중 작업 + running pod 를 매 세션 표면화 → 패시브 .md 라 안 쓰이던 문제 해결. 비었으면 무음. init SessionStart 와이어.
- verbs: show·add·next·done·pod{add|rm|list}·inject.

## feat: askq-text — deny AskUserQuestion option-box, ask in plain chat (sidecar askq-text parity)

- **`harness pre askq`** (PreToolUse(AskUserQuestion), `config.askqText` 기본 on) — 화살표 옵션-트리 박스(문의선택지) 호출을 deny + 에이전트에게 "질문을 평문 채팅으로 다시 하라(옵션은 인라인 bullet + 추천 표시, 자유 답변 허용)" 지시. FORM 리다이렉트(질문 자체는 허용) — bypass(안 물어봐도 될 걸 안 묻기)와는 구분. ExitPlanMode 는 영향 없음.
- init: PreToolUse 에 `AskUserQuestion` matcher → `pre askq` 와이어링.

## feat: handoff rework — repo-root handoff.jsonl queue + anti-scatter guard (sidecar handoff parity)

- handoff 를 **per-project repo-root `handoff.jsonl`** open-work 큐로 재설계 (단일 글로벌 레지스트리 아님 · 커밋 → GitHub 보존 · repo 와 함께 이동).
- verbs: `add <text> [--to <repo>]` · `ls`(기본) · `done <id>` · `inject` · `snapshot`.
  - **`done` = scrub**: done 마커가 아니라 파일에서 항목 **제거**(rewrite) → handoff.jsonl 은 항상 *열린 항목만* 보유. 비면 파일 삭제.
  - **`inject`**(SessionStart): 이 repo 의 열린 handoff 를 additionalContext 로 표면화 → 잊힘 방지. 비었으면 무음.
  - `snapshot [reason]`: 기존 세션-상태 dossier(.harness/handoff/*.md) 보존.
- **handoff-guard** (`config.handoffGuard` 기본 on): Write/Edit 에서 흩어진 핸드오프 마크다운 **차단** — basename `HANDOFF.md`/`INBOX.md`, 또는 `(^|/)inbox/*.md` (임의 깊이) → handoff.jsonl 로 유도. `inbox/queue.json` 같은 비-md 는 통과(false-positive 가드).
- SessionStart 훅에 `handoff inject` 추가(init). inbox 폴더 패턴 폐기, handoff 일원화.

## fix: export runBypass/runGo/runBrainstorm from runbooks (engine load broken since 8675cbd)

- `cli/index.ts` 가 이 3개를 import 했지만 직전 커밋(8675cbd)이 `modules/runbooks.ts` 를 stage 안 해서, 커밋된 엔진이 로드 실패(`SyntaxError: no export named runBrainstorm`) → CLI 전체 비동작이었음. 로컬 working tree 엔 있어 테스트는 통과해 묻혀 있었고, engine-bump agent 들의 sanity gate(`harness help`)가 전파 직전 적발.
- 누락 export 3개를 커밋. (재발 방지 후속: 엔진 로드 스모크를 lint/CI 에 추가 검토.)

## fix: recommend — global default fallback (공용 완성도 auto-pick 미작동 수정)

- 증상: mini 에 "공용 완성도" default 를 걸어도 ★표시·auto-pick 둘 다 안 뜨고 4축 박스만 떠서 punt("어느 쪽으로?").
- 원인: harness 가 default 를 **per-repo `.harness/recommend-default`** 만 읽음 → repo 에 파일 없으면 `readDefault()`=present → `defaultDirective()` 빈값 → FIXED-axis(★+auto-proceed) directive 자체가 주입 안 됨.
- 수정: **global fallback** 추가 — 우선순위 `repo .harness/recommend-default` > `global ~/.harness/recommend-default` > `present`. `set-default <mode> [--global]` / `clear-default [--global]` / `get-default [source: repo|global|none]`. sbs 는 `resolveMode→readDefault` 경유라 자동 상속.
- 검증: clean repo 에서 global complete 상속, `resolve-mode ""`→`auto axis=complete inherited`, sbs bare→auto-pick.

## feat: tmp-guard + bypass · trail · go · brainstorm

- **tmp-guard** (`modules/tmp-guard.ts`, config `tmpGuard` 기본 on) — 진행/작업 데이터를 휘발 tmp(`/tmp`·`/private/tmp`·`/var/folders`·`$TMPDIR`)에 쓰면 `pre bash`(리다이렉트/tee/-o/--output 탐지)·`pre write`(파일경로)에서 경고 → git-추적 `docs.scratchDir`(scripts/scratch)에 쓰고 커밋해 **GitHub 보관** 유도. read-only `/tmp` 참조는 무시. warn-only.
- **`harness trail {push <note>|pop|show|drop <n>|clear}`** — main-flow 복귀 스택(sidecar trail parity). 곁가지로 샐 때 위치 push, 복귀 시 pop. repo-root **`TRAIL.md`(git-tracked·커밋)** 에 저장 → 세션/리부트 넘어 보존. docs.allow 에 TRAIL.md 추가.
- **`harness bypass`** — anti-punt self-check 런북: local+reversible 이면 묻지 말고 진행, outward/되돌리기어려움/유저결정 때만 질문.
- **`harness go`** — 직전 제안 액션 재확인 없이 계속.
- **`harness brainstorm`** — 고갈까지 라운드별 아이디어 발산(breadth) 런북.

## feat: micro-exp — context-driven micro-experiment sweep (sidecar micro-exp parity)

- **`harness micro-exp [<scope>]`** — N개의 작고 검증가능한 실험을 병렬로 돌리는 sweep 런북(런북 프린터 + 배치 산출물). domain-agnostic, `kind` 추상(`<runnable>`+`<parser>` 계약).
  - 흐름: context 에서 후보 self-enumerate(매니페스트 없음) → **Stage 1.5 인프라 존재 게이트**(미비 시 build 우선 HALT) → 예산 선언 → 디스패치(rented `harness pod` / local `harness pool on <host>`) → **Monitor** closed-loop → harvest → parse Agent → 흡수(closed-form=`harness atlas`/`verdict`, observation=verbatim verdict) → `exports/sweep/<batch_id>/ledger.json` 집계.
  - 정직성: FALSIFIED 는 CLOSED-negative 로 보존(skip 금지) · 예산 캡 · pod-cap≠agent-cap · parse Agent verbatim.
  - `<scope>` 주면 `exports/sweep/<batch_id>/{ledger,state}.json` 스캐폴드. `templates/micro-exp.md` 런북.

## feat: research + watch (sidecar research-skill / watch parity)

- **`harness research {arxiv|yt}`** — 외부 연구자료 fetch, **API 키 불필요**.
  - `arxiv <query|id> [--n N]` — arXiv 공식 API 검색/조회 → 제목·저자·날짜·카테고리·PDF·초록 (id 자동 판별, 기본 submittedDate desc).
  - `yt <url|id> [lang]` — YouTube 자막 트랜스크립트. InnerTube `player` API(ANDROID client 20.10.38) → caption track → `fmt=json3` 큐별 1줄(XML fallback) + 연속중복 dedup.
  - 검증: arXiv 1706.03762(Attention Is All You Need) · yt dQw4w9WgXcQ(60줄) 실동작.
- **`harness watch <url|path> [question] [flags]`** — 에이전트가 영상을 실제로 "보게" 함.
  - `yt-dlp` 다운로드(yt-dlp 지원 플랫폼 + 로컬파일) → `ffmpeg` 프레임(길이별 예산, 2fps/100 캡, `--start/--end` 윈도우 기준) + 타임스탬프 트랜스크립트(네이티브 자막 우선 → Whisper Groq/OpenAI 옵션) → 프레임 경로 + 트랜스크립트 출력(에이전트가 Read).
  - 자막은 best-effort(`--ignore-errors`, 429 시에도 영상 진행), Whisper 키 없으면 frames-only 로 graceful degrade(절대 hard-fail 안 함). 키는 env/`secret` CLI.
  - flags: `--start --end --max-frames --fps --resolution --whisper groq|openai --no-whisper --out-dir`.
  - 검증: dQw4w9WgXcQ 8초 윈도우 → 4프레임 + 89줄 트랜스크립트.

## feat: docs — write-time single-doc enforcement (안 지켜지던 규율을 쓰는 순간 강제)

- 문제: 단일문서 규율(ARCHITECTURE SSOT 통합 · 분리 시 quickref 연결)이 **lint/commit 시점에만** 검사돼 사후 → 에이전트가 이미 흩뿌린 뒤라 안 지켜짐.
- 해결: **`pre write`(PreToolUse Write/Edit)에 write-time 검사 추가** — `.md` 를 쓰는 순간 판정.
  - `DOC-SCATTER`: scatter 패턴(`*-report/summary/notes/audit…`, 날짜접두 등) + allow 외 + scope 내 → "ARCHITECTURE(갱신)/CHANGELOG(append)/scratch 로 통합" 안내.
  - `DOC-NO-QUICKREF`: 분리 문서 상단 12줄에 SSOT 링크/포인터 없으면 → quickref 추가 안내.
- `docs.enforce` 노브: `warn`(기본, 즉시 경고) · `block`(쓰기 veto) · `off`. ARCHITECTURE.md 존재 시에만 활성(opt-in), `docs.scopeDirs`/`docs.allow` 그대로 적용.
- 검증: scatter→warn, no-quickref→warn, quickref 있음/allow 파일→무음, block 모드→`{"decision":"block"}`.

## feat: imagine history — past-prompt history (fal provider API + local ledger)

- **`harness imagine history [-b fal|openai] [-m endpoint_id,…] [--start <iso>] [--limit N] [--status success|error] [--local] [--json]`**.
  - **fal**: 공급자 요청 히스토리를 직접 조회 — `GET https://api.fal.ai/v1/models/requests/by-endpoint?expand=payloads` (프롬프트=`json_input.prompt`, request_id, ended_at, status_code). `endpoint_id` 는 fal 필수값이라 기본=imagine fal 기본 모델(`openai/gpt-image-2`), `-m a,b` 로 다중 지정. 기본 윈도우 24h, `--start` 로 확장. auth 는 curl `-K` 로 키를 argv 밖에.
  - **openai / `--local`**: openai 는 list 엔드포인트가 없어 로컬 ledger 로 폴백.
- 생성 시 **로컬 provenance ledger**(`.harness/logs/imagine.jsonl`) 기록 — ts·backend·model·size·out·request_id·status + 프롬프트(280자 truncate). API 없이도 request_id↔출력파일 매핑 확보. 키는 절대 기록 안 함.

## feat: imagine — AI image generator (sidecar /imagine parity)

- **`harness imagine <prompt-file> <out.png> [-s size] [-b backend] [-m model]`** + `list` · `help`.
  - 백엔드: **fal**(기본, fal.ai queue+poll, 기본 모델 `openai/gpt-image-2` — user-pinned, `-m` 로만 변경) · **openai**(`/v1/images/generations` 동기, 기본 `gpt-image-1`, b64_json/url 모두 처리).
  - API 키는 `secret get fal.api_key` / `secret get openai.api_key` (방금 추가한 secret 모듈의 `secretGet` 재사용) — **인라인 금지·로그 금지**. 프롬프트는 **파일**에서 읽음(provenance·argv 유출 방지), payload 는 mktemp JSON.
  - canonical 사이즈: `square_hd · square · landscape_16_9 · portrait_16_9` (openai 는 1024²/1536×1024/1024×1536 으로 변환).
  - 보안 강화(sidecar 대비): auth 헤더를 curl `-K` config 파일로 전달 → **API 키가 process argv 에 남지 않음**. 임시파일은 finally 에서 삭제.
- secret 모듈에 `secretBin()` / `secretGet()` export 추가(DRY 재사용).

## feat: worktree — no-pileup/no-stranded enforcement (sidecar worktree-gc/worktree-guard parity)

원칙: PR/branch/worktree 누적 금지 · 워크트리에 작업 방치 금지 · 방치 작업 있으면 새 작업 시작 금지.

- **`harness worktree scan`** — linked worktree 전수 분류(clean/dirty/unpushed/merged[gone]/locked) + **방치(stranded=dirty 또는 unpushed) 적발**. stranded 존재 시 exit 1 → 새 작업 게이트로 사용 가능.
- **`harness worktree gc`** — merged([gone] upstream, squash-safe)·dangling **agent** worktree/branch 자동 sweep(`git worktree remove --force` + `git branch -D` + prune). UNCONDITIONAL live-work 가드: dirty·HEAD commit <1h·locked 는 SKIP → 진행 중 작업 절대 안 지움. 항상 exit 0.
- **`harness worktree guard <cmd>`** — `git worktree add` advisory: 방치 작업 선존재 시 "먼저 완료(pr-cycle)/정리 후 새 작업" + 기존 브랜치 재사용 stale-base(anima #1105) 경고.
- 자동 연동: ① SessionStart 훅에 `worktree gc` 추가(init) → 세션 시작마다 merged 자동 청소. ② `prompt`(UserPromptSubmit) 가 stranded worktree 있으면 새 작업 전 advisory 선출력. ③ `pre bash` 가 `git worktree add` 에 hygiene advisory.
- 14-case 라이프사이클 검증(stranded SKIP / merged old-commit sweep). pr-cycle 은 이미 push→PR→**main merge(squash·admin)**→delete-branch→worktree sweep 까지 자동 — 본 모듈이 누적/방치 방지를 보강.

## feat: git-guard — force-push deny in pre bash (sidecar git-guard parity)

- **`pre bash` built-in 가드** (`modules/git-guard.ts`): force-type push 를 config 규칙보다 먼저 차단(deny). 탐지 대상: `git push --force` / `-f`, `--force-with-lease[=…]`, `git push <remote> +<refspec>`(refspec-level force). 따옴표 strip 후 토크나이즈 → `'--force'` / `+"main"` 같은 인용형도 잡음. `cd … && git push --force` 도 토큰 인접성으로 탐지.
- `--no-verify` 는 force 가 아니므로 **차단하지 않음**(sidecar 와 동일, 하네스 자체 커밋도 사용). config `git.guardForcePush=false` 로 비활성(기본 on).
- 차단 메시지: 오버라이드 없음 — 정말 필요하면 에이전트 밖에서 실행하라 안내. 14 케이스 단위검증 통과.

## fix: pr-cycle — full post-merge worktree sweep (sidecar 0.5.0 parity)

- 기존엔 merge 후 `git worktree prune` 만 호출 → 실제 worktree 디렉토리·로컬 브랜치가 누적되는 누수. main merge(squash·admin·delete-branch into base)는 정상이었음.
- 이제 merge 성공 후 `sweepMergedWorktrees()`: MAIN worktree 로 cd(현재 worktree 안에서 실행한 경우 포함) → `git fetch -p` → upstream `[gone]`(squash-safe 머지 신호)인 **linked agent worktree**(`.claude/worktrees/`)만 `git worktree remove --force` + `git branch -D` + `git worktree prune`. main 체크아웃·locked·live/absent upstream(미푸시 작업 보유 가능)은 절대 건드리지 않음.

## feat: lsp (editor LSP wiring + grammar auto-rebuild)

- **`harness lsp {wire|status|rebuild <file>}`** — sidecar hexa-lsp/lsp-rebuild parity.
  - `wire` → repo-root `.lsp.json`(Claude Code 표준 파일명)에 `lsp.servers` 매핑 기록. 기본 서버: **hexa**(`hexa lsp`, `self/lsp.hexa` 보유 첫 후보 dir 로 cd 후 exec · `.hexa`) + **kosmos**(`kosmos-lsp` · `.kosmos`). n6/hxc/tape 는 동일 한 줄 패턴으로 추가 가능.
  - `status` → 서버별 바이너리 PATH 존재(🟢/🔴) + `.lsp.json` 와이어링 상태 + rebuild 플래그.
  - `rebuild <file>` → LSP grammar 소스(`*/lsp/*_lsp.hexa` 또는 hexa-lang `self/lsp.hexa`·`self/lsp/*.hexa`) 편집 시 prebuilt 바이너리를 **백그라운드 재빌드**(log: `~/.harness/lsp-rebuild.log`) + 비차단 advisory. 항상 exit 0(fail-open).
- PostToolUse(Write/Edit) 자동 연동: `post edit <file>` 가 `lspRebuildOnEdit` 호출 → grammar 소스 편집이 바이너리를 자동 lockstep. config `lsp.rebuild=false` 로 비활성.

## feat: secret (credential-store CLI passthrough)

- **`harness secret <verb> [args]`** — `secret` CLI 얇은 패스스루(sidecar /secret parity): get·set·rotate·check·delete·list·service·init·backup·sync·migrate. PATH → `/opt/homebrew/bin` → `~/.local/bin` → `~/.hx/bin` 순으로 바이너리 자동 탐색, 없으면 설치 안내(dancinlab/secret).
- 보안 가드: `secret get` 은 값이 세션 컨텍스트에 노출되므로 경고 출력 + tool 인자엔 인라인 `$(secret get <k>)` 권장. 모듈 자체는 값을 로그/캡처하지 않음. 자격증명 하드코딩 금지(G-SECRET-LITERAL)와 한 쌍.

## feat: end (session-closure safety check)

- **`harness end`** — 읽기전용 종료 점검 대시보드(sidecar /end parity): 미커밋·미푸시·stash·내 열린 PR·병합후미삭제 브랜치·linked worktree 를 ✓/⚠/○ 로 표시 + 최종 ✅/⚠ 판정.

## feat: verdict · atlas · upstream

- **`harness verdict {record <slug>/<id> <cmd>|list|show}`** — verification-evidence ledger (hexa verify/g5 parity): verify 명령 stdout 을 `.verdicts/<slug>/<id>.txt` 에 verbatim 기록 + PASS/FAIL tier + 통과율. LLM 자가판정 금지, 캡처 출력이 증거.
- **`harness atlas {add <id> <claim>|link <id> <vid>|list}`** — claim registry → `ATLAS.md`; atom 은 PASS verdict 링크 시에만 🟢 verified (hexa atlas parity).
- **`harness upstream {list|fix <name|repo>}`** — 다운스트림 작업 중 업스트림(hexa-lang 등) 결함은 inbox 메모 말고 그 세션에서 root-cause 수정→verify→PR+merge (config.upstreams, 기본 hexa-lang).
- docs.allow 에 ATLAS.md/CLAIMS.md 추가.

## feat: ing (in-progress board + POD tracking)

- **`harness ing {show|add <text>|done <match>|next <text>|pod ...}`** — repo-root `ING.md` 단일 진행중 보드: `## 작업(in-progress)` · `## POD(running)` 표 · `## 다음(next)`. 완료분은 CHANGELOG, 최종설계는 ARCHITECTURE 로 졸업.
- `ing pod {add <id> <provider> <gpu> <purpose> [cost]|rm <id>|list}` — 실행중 GPU pod 추적.
- ING.md 는 docs.allow 기본 포함(quickref 내장). keywords `in-progress-board` 트리거(진행중/pod 관리/지금 뭐).

## feat: pool (host roster + remote exec)

- **`harness pool {list|add|rm|on|status}`** — 머신 단위 호스트 roster(`~/.harness/pool.json`, 글로벌) + ssh 원격 실행 (sidecar pool parity). add `<name> [target]` · on `<name> <cmd>` · status(도달성 🟢/🔴).

## feat: pod · dojo · demi

- **`harness pod`** — GPU cloud pod dispatch runbook (preflight→fire→poll→harvest→down · 회수 우선 · wall-time first · 비용 발생은 명시 go) — sidecar pod/cloud parity.
- **`harness dojo [<slug>] [--lang]`** — cloud training-job scaffolder: runbook + `exports/dojo/<slug>/{job,train,run.sh}` 생성 (sidecar dojo parity).
- **`harness demi`** — design-architecture program runbook (7-verb spine 명세→구조→설계→해석⟲→합성→검증→인계; ARCHITECTURE.md=합성 SSOT) — sidecar demiurge parity.

## feat: update · fleet · pr-cycle + lint severity-gate

- **`harness update [--hooks]`** — bump `.harness-engine` submodule to its tracked-branch tip → adopt new engine features (answers "기능 추가 어떻게 반영"). Reports old→new + changelog, then `git add .harness-engine` + commit.
- **`harness fleet [name:goal,…|go|stop|status]`** — perpetual multi-lane orchestrator (sidecar fleet parity): roster `.harness/fleet/active` + fire-on-arrival runbook (`templates/fleet.md`).
- **`harness pr-cycle [gh flags]`** — push branch → `gh pr create --fill` → self-merge (squash·admin·delete-branch); refuses on main/master (sidecar pr-cycle parity).
- **lint severity-gate** — `lint` now exits 1 only on BLOCK-severity violations; warn-severity (e.g. L0-LOCKDOWN) is reported but no longer hard-blocks a deliberate commit.

## feat: docs.scopeDirs

- `docs.scopeDirs` (optional) — scatter/quickref 검사를 지정 top-level dir(""=root)로 한정. 연구 repo(anima: 문서 5963건)의 corpus 폭주 방지. CLAUDE-MD 검사는 영향 없음(항상 동작).

## fix: hook guards (submodule 미초기화 내성)

- `init` 이 생성하는 `.claude/settings.json` hook 들을 `[ -x .harness-engine/bin/harness ] && … || true` 로 guard — submodule 미초기화(`git submodule update --init` 전) clone 에서 `No such file` 에러 대신 조용히 통과.
- git pre-commit/pre-push hook 도 wrapper 부재 시 `exit 0` 으로 skip.
- 적용된 repo 에서 매 프롬프트마다 뜨던 `bash: .harness-engine/bin/harness: No such file or directory` 비차단 에러 제거.

## self-dogfood

- 하네스가 **자기 자신에게** 적용됨 (harness.config.json profile:default · 엔진=repo 루트, submodule 없음). `.claude/settings.json` self hooks(pre/post/prompt + prefs/easy/recommend inject) + git pre-commit(`bin/harness lint`). hardcore 자기모순(protectedBranches·no-verify 차단)은 제외해 자기 개발 흐름 보존. CHANGELOG 강제(.ts 변경 시) + 번들 enforcement(root-cause/secret/force-push) self 적용.

## 0.5.0

- **다국어 1급 지원** — 웹/JS 편향 제거. Python·Rust·C/C++·Go·Swift·hexa 로컬/모바일 앱에서 즉시 동작.
  - `harness init` 스택 자동감지: 마커 파일(Cargo.toml·pyproject·go.mod·Package.swift·CMakeLists·*.hexa…)로 `verify.checks`(cargo/pytest/swift build/…)와 CHANGELOG `triggerPattern` 자동 생성, 혼합 스택 병합.
  - `G-ROOT-CAUSE` 우회패턴 다국어화: `# type: ignore`·`# noqa`·`except: pass`(Py) · `#[allow(...)]`(Rust) · `//nolint`(Go) · `swiftlint:disable`(Swift) · `#pragma ... diagnostic ignored`·`NOLINT`(C/C++) 추가.
  - L0 파서·folderGuides·secret·root-cause 대상 확장자에 c/h/cpp/cc/cxx/hpp/m/mm/rs/go/kt/scala/php/dart/hexa 기본 포함.
  - [docs/languages.md](docs/languages.md) 추가 — 언어별 프리셋 + Node(tsx) 런타임 요구 명시(타깃 빌드와 무관).

## 0.4.0

- **CHANGELOG 갱신 강제** — `lint` 에 `CHANGELOG-MISSING`(block) 체크 추가: 소스 코드가 staged 인데 `CHANGELOG.md` 가 함께 staged 되지 않으면 차단. `lint.changelog`(file/triggerPattern/ignore) config 로 조정, docs/test/엔진 경로는 ignore.
- **`harness init` 이 git pre-commit hook 설치** — 커밋 시 `harness lint` 자동 실행으로 위 규칙이 실제 강제됨. `--no-verify` 로 우회 가능(의도된 탈출구).
- **경로 정규화** — REPO_ROOT/HARNESS_ROOT 를 realpath 로 canonical 화(macOS `/var`↔`/private/var` 심볼릭 대응) → 생성되는 wrapper/hook 경로가 항상 정확.
- `scripts/harness` wrapper 를 repo-root 기준(`$ROOT/<engine>/bin/harness`)으로 견고화.

## 0.3.0

- **`harness folders` 추가** — 서브폴더별 `CLAUDE.md` 작성 유도. `scan`(누락 폴더 목록) · `scaffold <dir>`(5칸 템플릿 생성). `post edit` hook 이 가이드 없는 소스 폴더의 파일 편집 시 그 폴더당 1회 넛지(dedupe). `folderGuides`(roots/depth/minFiles/ignore/ext) config 로 조정, 기본 enabled.
- 번들 `keywords.json` 에 `folder-guides` 트리거(폴더 구조/서브폴더/코드 탐색) 추가.

## 0.2.0

- **`harness init` 추가** (`install` alias) — 한 방 스캐폴딩: `harness.config.json`(프로젝트명 자동감지) + `.harness/{enforcement,keywords,severity-map}.json`(번들 기본 복사) + `.gitignore` 로그 무시 + `scripts/harness` 래퍼 + `.claude/settings.json` hook(`--hooks`). 기존 파일은 보존(`--force` 만 예외), `--dry-run` 으로 미리보기. 멱등(재실행 시 skip).

## 0.1.0

최초 공개 — 프로젝트-무관 AI 코딩 하네스 엔진.

- **코어 12 모듈**: `pre` · `post` · `prompt` · `lint` · `verify` · `errors` · `ledger` · `bitter-gate` · `audit` · `gc` · `handoff` · `convergence` · `sync`
- **config 주도**: 모든 프로젝트 색채를 `harness.config.json` + `.harness/*.json` 로 분리. 엔진 코드는 도메인 하드코딩 0.
- **repo-root 자동탐색**: submodule / vendor / 심볼릭링크 어느 배치든 동작 (`HARNESS_REPO_ROOT` override).
- **번들 기본 규칙**: 도메인-무관 enforcement(force-push · curl|sh · rm -rf · 비밀키 리터럴 · 우회패턴 · 인라인 hook 금지).
- **문서 3종**: 전수 설계(architecture) · 설치(install) · 확장(extending).
- 출처: 운영 중인 두 하네스(애플리케이션 본체 + 매니저)를 전수조사해 일반형으로 추출. 도메인 전용 모듈(배포/DB/SSH 등)은 제외하고 확장 패턴만 문서화.
