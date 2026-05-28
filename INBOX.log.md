## 2026-05-29 — ⚠ stale 로컬 toolchain 으로 cross-repo 빌드 짜깁기 = 반나절 삽질 (264-커밋 stale 단일근원)

> **사건 (anima BC-ANIMA M5 fire)**: anima trainer 를 H100 pod 에서 빌드하려다, 로컬 `~/core/hexa-lang` 이 origin/main 보다 **264 커밋 stale** 인 걸 모르고 self/ 트리를 손으로 짜깁기하느라 pod 5+개($5+) + 여러 시간을 태움. 증상 cascade: (1) `flame_bpe_corpus_lib` "module not found" (stale install) → (2) shallow clone 의 self/ 가 generated 파일(`runtime_core.c`·`runtime_cuda.c`·`runtime_hi_gen.c`·`runtime_bf16.c`) 누락 → (3) main self/ + cloud-m3 worktree self/ 혼합 시도 → runtime.c↔runtime.h carrier-vs-function 불일치, ce_seed shim append 위치로 nvcc `expected ;`, 두 트리의 서로 다른 `#include` 세트 누락. **결국 origin/main fresh 는 M2/M3 builtin(#1920·#1924) + ce_seed 5-arg kernel emit(runtime_cuda_emit.hexa:1311) + 모든 include 가 이미 정합** — 짜깁기·shim 전부 불필요했음.

**교훈 (같은 실수 방지 — 빌드/fire 전 체크리스트)**:
1. **cross-repo 의존 작업 전 `git -C <repo> log --oneline HEAD..origin/main | wc -l` 로 stale 깊이 먼저 측정**. >0 이면 fetch+checkout origin/main (또는 fresh clone) 부터. 264-stale 를 30초 점검으로 잡았으면 전체 삽질 회피.
2. **self/ 짜깁기(파일 골라 섞기) 금지** — generated 파일(`runtime_core.c`·`runtime_cuda.c`·`runtime_hi_gen.c`·`runtime_bf16.c` = `git ls-tree` 에 없는 emit/include 산물) 때문에 두 트리 혼합은 거의 항상 include-누락/심볼-불일치로 깨짐. **단일 일관 트리(fresh origin/main)** 를 통째로 쓸 것.
3. **"빌트인/kernel 미머지" 단정 전 origin/main 을 grep** — agent 가 `_hx_cuda_farr_ce_seed` "정의 없음" 으로 판단해 shim 을 손수 작성했으나, 실은 stale clone 이라 그랬고 origin/main `runtime_cuda_emit.hexa` 에 이미 emit 됨. `git show origin/main:<file> | grep` 으로 확인 후 작성.
4. **pod-side 빌드는 fresh `git clone --depth 1` 가 아니라 origin/main full-fetch** (shallow 가 generated 파일을 빠뜨리진 않으나 동기화 상태가 핵심). 또는 검증된 `self.tar.gz`(완전 트리) 전송.

**positive carry (M5 에서 영구 확립된 것, 재사용)**: hexa cloud SSH recipe = `runpodctl create --ports '22/tcp' --startSSH --env "PUBLIC_KEY=$(cat ~/.runpod/ssh/RunPod-Key-Go.pub)"` + `hexa cloud run "root@<IP>" --port <P> --insecure -- bash -lc '<script>'` (multi-line argv 는 cloud-guard 거부 → 스크립트 파일 copy-to 후 `bash <file>`). hexa-lang #1959 (accept-new host key) 가 `--insecure` 와 동등 효과. 상세 = anima `CORE/DECODER/STEP_RATE_LOG.md` (1)~(4).

**severity**: high (반복 시 매번 pod 비용 + 시간 낭비). 본 entry 는 prevention-checklist. cross-link: hexa-lang #1920/#1924/#1959, anima BC-ANIMA STEP_RATE_LOG.

## 2026-05-29 — pods.json + PROVIDERS.json 글로벌 SSOT 통합 디자인 트랙 (from demiurge RTSC discovery) 🟢 흡수됨 → hexa-lang CLOUD 도메인 M8-M11

> **CLOUD 도메인 흡수 (2026-05-29)**: 본 트랙의 구현 제안 (a)~(e) 는 hexa-lang `CLOUD.md` 의 milestone **M8-M11** 로 이관됨 (DOMAIN.md = canonical SSOT). 경로는 CLOUD M5 와 정합하여 `~/.hx/cloud/` 디렉토리로 통일 (아래 표 갱신). 본 entry 는 디자인 reference 로 보존. 진행 추적은 `~/core/hexa-lang/CLOUD.md` M8-M11 + `CLOUD.log.md` 2026-05-29 entry 에서.
>
> **사건**: 2026-05-28 commons hook 0.12.0 (`_pods_snapshot()`) + pods-route 0.1.0 (`--register` auto-inject) 머지 직후, demiurge 측 사용 패턴 추가 발견. 두 SSOT 가 demiurge git tree 에 실재:
>
> 1. **`demiurge/pods.temp.json`** (15KB, untracked) — schema_origin: "sidecar INBOX #193". campaign=`rtsc-293K-1atm`, budget(krw/usd), design_constraints(throttle/wall/load), pods{vast-ysbh6-pod-41837 + 계획 pod}, 각 pod 의 host/provider/cores/cost_usd_per_hr/load_1min/jobs[]. 사용자가 실제로 운영 중인 매니페스트 — 갭#2 (filename drift: hexa-lang `./pods.json` vs demiurge `pods.temp.json`) 의 demiurge 쪽 본체.
> 2. **`demiurge/PROVIDERS.json`** (origin/main · PR #488 + #489 canonical 이름 정합) — title="RTSC compute services registry". 구조: `_meta`(campaign_anchor 포함) + `providers/{vast_alternatives_cpu[10], hpc_tier_walltime_killers[6], gpu_accelerated_dft[5], academic_free[6]}` + `walltime_optimizations/{free_software_tips[7], preflight_and_caching[4]}` + `current_campaign_recommendation/{maintenance_16jobs, hard_walltime_crunch, elph_dense_qgrid, long_term_free, immediate_no_cost}` + `hexa_cloud_integration_status/{fully_integrated[vast,runpod], not_integrated_but_usable_via_adopt, ...}`. 각 항목 메타: cost_usd_per_hr · walltime_speedup · fit_score (1-3) · qe_gpu_compatible · highlight · notes · ref_pr.
>
> **갭 #1 — 자원목록 SSOT 부재 (hexa-cloud 측)**: hexa cloud CLI 는 `cloud rent <provider>` (vast|runpod) verb 만 있고, "어떤 provider 가 어떤 cost 로 어떤 walltime_speedup 을 주는가" 의 자원 카탈로그가 없음. demiurge 가 그 갭을 자체 `PROVIDERS.json` 으로 메꿈 → 캠페인-anchored 의사결정 reference. 다른 사용자/repo 에는 없는 자료.
>
> **갭 #2 — demiurge providers.ts (Firestore) vs PROVIDERS.json (git) 디자인 격차**: web/lib/providers.ts 는 운영용 단순 카탈로그 (`enabled` + `priority` · gpu/llm/payment 3 카테고리). PROVIDERS.json 은 의사결정용 풍부 인벤토리 (cost · speedup · fit_score · highlight · ref_pr · 통합상태). 두 자료가 같은 "providers" 이름이지만 의도가 다름.
>
> **갭 #3 — 글로벌 ↔ 프로젝트 SSOT 이중 + 누락**: 4-층 자원 모델 (경로 = CLOUD 도메인 정합 후 `~/.hx/cloud/` 통일):
>
>     ~/.hx/cloud/pods.jsonl       📜 청구 장부 (append-only · billing)       CLOUD M11 (현 ~/.hexa-cloud/pods.jsonl 에서 이관)
>     ~/.hx/cloud/active-pods.json 🎬 작업 상태 (update-form work view)       CLOUD M5  (cwd ./pods.json substitute → 이관)
>     ~/.hx/cloud/providers.json   📚 자원 카탈로그 (PROVIDERS.json 패턴)     CLOUD M8  (demiurge PROVIDERS.json substitute → 흡수)
>     ~/.pool/pool.json            🏠 pool 호스트 카탈로그                    ✅ 존재 (불변)
>
> 가운데 두 층이 글로벌 SSOT 없음 → 프로젝트 별 local file 로 흩어짐 → agent 인지 부담 + drift. CLOUD 도메인 M5/M8/M11 가 `~/.hx/cloud/` 단일 디렉토리로 해소.
>
> **구현 제안** (→ CLOUD 도메인 milestone 매핑 · 경로 `~/.hx/cloud/` 정합)
>
> - [ ] **(a) → CLOUD M8** `~/.hx/cloud/providers.json` SSOT 신설 — schema = PROVIDERS.json 패턴 흡수 (4-tier providers + walltime_optimizations + integration_status). `current_campaign_recommendation` 은 캠페인별 변동 → 프로젝트 manifest 측으로 분리. (→ CLOUD M9: `cloud providers [list|fit|recommend]` verb).
> - [ ] **(b) → CLOUD M5** `~/.hx/cloud/active-pods.json` SSOT (update-form work view · pods{} + jobs{}). cwd ./pods.json deprecate · auto-migrate. cloud_cli.hexa 의 `cloud pods` / `cloud dispatch` verb 글로벌 manifest 로 redirect.
> - [ ] **(c) → CLOUD M10** commons hook `_providers_snapshot()` 추가 — 매 턴 `~/.hx/cloud/providers.json` highlight 한 줄 inject (pool roster · pods snapshot 옆). 동 M10 에서 `_pods_snapshot()` 도 `~/.hx/cloud/active-pods.json` 로 전환.
> - [ ] **(d) → CLOUD M11** demiurge 정리 — `pods.temp.json` 은 글로벌 manifest 흡수 후 archive. `PROVIDERS.json` 은 `~/.hx/cloud/providers.json` 의 캠페인 특화 SUPERSET 으로 정합.
> - [ ] **(e) commons.tape @D 룰 명문화** — `g??: providers/manifest 글로벌 SSOT (no cwd ./pods.json) - all pod/job state in ~/.hx/cloud/`. 사용자 `! sidecar sign commons` 필요. (CLOUD 도메인 밖 · sidecar 거버넌스 트랙).
>
> **우선순위** (CLOUD.md Q4): M5 (SSOT) → M10 (sidecar 정합) → M1/M2/M3 (안전망) → M8/M9 (카탈로그) → M11 (정리). (e) 는 sign 비용 (사용자 직접) 발생, 다른 작업 완료 후.
>
> **evidence**:
> - `demiurge/pods.temp.json` (15KB, 2026-05-28T02:52, schema_origin=sidecar INBOX #193)
> - `demiurge/PROVIDERS.json` (origin/main, 80+ 라인, PR #488/#489 머지)
> - `demiurge/web/lib/providers.ts` (Firestore registry · gpu/llm/payment with enabled+priority)
> - sidecar `hooks/commons/bin/_commons.hexa:_pods_snapshot()` (2026-05-28 0.12.0 · cwd ./pods.json 기반)
> - sidecar `hooks/pods-route/bin/_pods_route.hexa` (2026-05-28 0.1.0 · --register auto-inject)
>
> **관련**: INBOX #193 (`~/.pool/pods.json` ✅) → #1699 머지 → 2026-05-28 entry (갭#2 filename drift) → 본 entry = providers + manifest 글로벌 SSOT 확장 → **hexa-lang CLOUD 도메인 M8-M11 로 흡수** (`~/core/hexa-lang/CLOUD.md` · 2026-05-29).

---

## 2026-05-28 — tape-lsp × mining `.tape` false-positive — idea-cart schema 가 commons grammar 로 검사됨 ✅ 해소 (tape repo e9a543c · 권장안 #1)

> **해소** (2026-05-29 · `~/core/tape/lsp/tape_lsp.py` commit e9a543c): 권장안 #1 채택 — `_publish` 진입에 `_grammar_exempt(uri)` 가드 추가. uri 가 `.mining.tape` 로 끝나면 빈 diagnostic 발행 (commons grammar 검사 skip). `_NO_GRAMMAR_SUFFIXES = (".mining.tape",)` 확장 가능. commons.tape/project.tape 등 governance `.tape` 는 그대로 검사 유지 (검증 통과: mining exempt · governance checked). tape-lsp 서버는 sidecar 가 아닌 별도 `tape` repo (`~/.local/bin/tape-lsp` → `~/core/tape/lsp/tape_lsp.py`).
>
> **트리거**: anima `ANIMA.mining.tape` 작성 시 tape-lsp 가 매 turn 9 diagnostic 발생 — `@goal` (line 1, "unknown entry type @g") · `@P1`/`@P2`/... (line 6/11/16/21/26, "malformed header") · `@c` (line 32, "unknown entry type @c"). 모두 false positive.
>
> **근본 원인**: mining skill 의 `.tape` (idea-cart) 는 commons.tape governance schema 와 **다른 schema** — SKILL.md 가 명시한 형식은 `@goal: idea cart — ...` 헤더 + `@P1 = <claim> · source-cycle: N` / `@X = <surfaced-claim>` promotion-candidate entries. 그러나 tape-lsp 는 모든 `*.tape` 를 commons grammar (17-type alphabet `@S @U @A @T @R @H @D @K @P @? @I @X @F @N @C @L @V` + `@<type> <id>[ := "subj"] :: <domain> [<grade>]` header) 로 검사 → mining 의 `@goal`/`@P<n>`/`@c<...>` 가 전부 malformed 로 잡힘.
>
> **영향**: 무해하나 noise — mining cycle 마다 (idea-cart 에 entry 추가될 때마다) 9+ diagnostic 이 사용자 turn context 에 주입. mining 0.5.0 가 promotion 4-step 절차를 추가하며 `.tape` 사용이 늘어 noise 증가.
>
> **recommend (둘 중, g0 simplest)**:
> 1. **tape-lsp file-glob 제외** — `*.mining.tape` glob 을 commons grammar 검사에서 skip (mining idea-cart 는 별도 schema, 또는 no-grammar). 가장 작은 변경 — tape-lsp 의 file matcher 에 `.mining.tape` exclude 1줄.
> 2. **mining `.tape` → tape-lsp 정합 schema 채택** — `@goal` → 주석 `#` 또는 `@V := "idea-cart" :: index`, `@P<n> = <claim>` → `@X <P-n> := "<claim>" :: mining [candidate]` (commons grammar 정합). 단 mining SKILL.md + 기존 모든 `.mining.tape` 마이그레이션 필요 (큰 변경).
>
> 권장 = (1) — tape-lsp 가 `.mining.tape` 를 인식해 commons grammar 미적용 (idea-cart 는 free-form). mining skill 의 idea-cart 형식 보존 + LSP noise 0.
>
> **증거 (anima `/Users/ghost/core/anima/ANIMA.mining.tape`)**:
> ```
> @goal: idea cart — promotion candidates surfaced by /mining   ← line 1 "@g unknown"
> @P1 = BRIDGE θ_emit stage-conditional table · ...             ← line 6 "malformed header"
> @c... (combinatorial promotion)                               ← line 32 "@c unknown"
> ```
> 9 diagnostic / file · 매 mining `.tape` write turn 재발. cross-plugin (tape-lsp ↔ mining) schema boundary 정의 부재.

---

## 2026-05-28 — mining 0.5.0 — lens spec / depletion / leaf-ID / edge / checkpoint / promotion 6 gap fix (from anima ANIMA mining cycle 1) ✅ LANDED

> **트리거**: anima ANIMA.mining cycle 1 (12 leaf 1-shot depletion) 직후 사용자 "마이닝 작동방식이 잘못된것같아 개선 필요". 0.4.0 의 auto-saturate trigger 본문은 풍부했으나, agent 가 의지할 spec 6개 모두 1-line prose:
>
> 1. 5 lens 의 step-by-step procedure 부재 (rule 1줄만)
> 2. depletion "new leaf" 객관 기준 부족 — agent 가 자기-과대/과소 평가 freely
> 3. leaf first-class ID 규칙 부재 — agent 가 L1·L2·... 임의 부여
> 4. edge "meaningful" positive 기준 부재 (negative 3 exclusion 만)
> 5. auto verb 의 5 lens × 5 round = 25 round 폭주 가능 + checkpoint discipline 부재
> 6. leaf → milestone 승격 path 1-line ("[promoted →]") 마커만, 절차 부재

> **fix (단일 PR, mining 0.5.0)**: 본 INBOX entry 작성 직전 LANDED. 변경 — `skills/mining/commands/mining.md` 에 (a) lens 5종 rule + procedure ≥2 steps + leaf-shape canonical · (b) depletion 3-test (surface dedup · mechanism dedup · no new bracket-tag) · (c) leaf ID `L<max+1>` 단조 + 재사용 금지 · (d) edge 4 positive criterion (causal · equivalence · dependency · inversion + label 필수) · (e) auto cap 25 + per-round disk write checkpoint · (f) promotion 4-step procedure + bare-verb top-3 next-action surface.

> **expected impact**: agent 가 mining 의 자기-환각/약식 종료를 못 함 (각 lens 의 procedure 가 출력 형식 강제 + depletion 3-test 가 객관 통과 요구). 다른 도메인 mining 시 동일 lens 결과 비교 가능 (bracket-tag + leaf shape canonical).

> **테스트 가능 사례** (future): anima ANIMA mining 재 fire → 동일 lens 가 cycle 1 결과보다 더 풍부한 leaf 생성 (이전엔 prose 묶음, 0.5.0 은 bracket-tag + mechanism 명시 강제). depletion 3-test 가 false-depletion 차단.

---

## 2026-05-28 — /micro-exp Stage 1.5 + decision tree (domain-agnostic 일반화) (from hexa-codex CODEX 2026-05-28) ✅ PARTIAL

> **트리거**: 사용자 — "물질 합성 연구에만 쓰이다가 다른프로젝트 돌리려니 안됨". hexa-codex CODEX PR #126 의 22-axis-candidate halt (22 candidate matrix enumerate ✅ · dispatch infra 0/22 ready → g63 honest halt) 가 직접 motivation. 원 INBOX 항목은 5-제안: (1) Stage 1.5 infra check · (2) commons g7N build+fire 분리 · (3) local-pool LLM 확장 · (4) meta-domain docs · (5) decision tree cross-link.

> **1 design decision (chat-form 합의로 잠금)**:

```
🎯 합의된 결정셋 (1개) — /micro-exp meta-generalize 사이클
└─ Q1: 진행 형태  → ✅ D (① + ⑤ + ② best-effort 묶음 · ④ docs 별도 사이클 · ③ ② hint로 흡수)
   CRITICAL REQ: 모든 spec/decision-tree/example를 domain-agnostic으로
       (materials/DFT/SSCHA/gCO2/token 같은 domain-specific 단어 제거 또는 "1 예시" 표기)
```

> **이번 사이클 land (① + ⑤)**:
> - **micro-exp 0.4.0** — `skills/micro-exp/commands/micro-exp.md` Stage 1.5 신설 (per-candidate 4 generic prereqs `<runnable>`/`<inputs>`/`<parser>`/`<workdir>` · 미달시 자동 halt `🛑 N/M missing — /cycle-bg <domain> required first`) + kind 추상화 (materials/LLM/web/build 모두 "1 example among many") + local_pool_adapter 일반화 (observation-only kind 전체로 확장, ③ 흡수) + Monitor alive-check 패턴 추상화 (도메인별 적정 쌍 예시화) + `@D decision_tree` SKILL.md 추가.
> - **cycle 0.9.2** — `skills/cycle/SKILL.md` 에 `@D micro_exp_handoff` 신설 (BUILD vs FIRE lane 명시) + decision tree ASCII block mirror. /cycle-bg = canonical BUILD lane · /micro-exp = FIRE-only lane.

> **② deferred (사용자 sign 필요)** — `hooks/commons/commons.tape` `@D g75` (build+fire phase 분리). 본 사이클 agent self-mint 차단 (project.tape @D s13), 사용자가 `! sidecar sign commons` 발급 후 별도 차수에 land. 제안 본문 (도메인-agnostic 문구) 은 `drafts/sbs-micro-exp-meta-generalize-plan.md` `## deferred-sign` 섹션 보존.

> **③ absorbed** — local-pool LLM 확장은 ②의 g75 본문 + ①의 local_pool_adapter 일반화에 자연 흡수 (kind 가 abstract 이므로 LLM bench · web smoke · build bench 모두 동일 contract).

> **④ deferred to separate docs cycle** — meta-domain pattern docs (`docs/meta-domain-pattern.md` 또는 `plugins/domain/SKILL.md` 보강) 는 별도 docs 사이클로 분리.

> **영향**:
> - `skills/micro-exp/commands/micro-exp.md` (Stage 1.5 + decision tree + kind 추상화)
> - `skills/micro-exp/SKILL.md` (mirror)
> - `skills/cycle/SKILL.md` (decision tree mirror + @D micro_exp_handoff)
> - `skills/micro-exp/.claude-plugin/plugin.json` → `0.4.0`
> - `skills/cycle/.claude-plugin/plugin.json` → `0.9.2`
> - `.claude-plugin/marketplace.json` 양쪽 entry sync
> - `README.md` micro-exp + cycle 양쪽 row
> - `CHANGELOG.md` top entry
> - `drafts/sbs-micro-exp-meta-generalize-plan.md` (frontmatter + locked decisions + ## deferred-sign block with g75 proposal text + ## qa-results)

---

## 2026-05-28 — sbs 0.6.0 자동 QA 4축 (handoff 끝 단계) (from user 2026-05-28) ✅

> **트리거**: 사용자 — sbs 0.5.0 handoff 가 ship 까지는 자율 land 하지만, "정말 약속한대로 land 됐는가" 의 완료성 검증이 spec 에 없다. 4축은 사용자 명시 (functional·visible·conformance·regression). 핵심 의도: handoff 완성도 + regression 무회귀 1차 안전.

> **4축 정의**:
> - **functional** — 새 endpoint/verb/surface 가 응답하는가? (smoke verb · 없으면 SKIP)
> - **visible** — 사용자 진입 URL/path/surface 변화 노출? (render check · 없으면 SKIP)
> - **conformance** — locked Q-decision ↔ 코드 1:1 매핑 (spec ↔ diff 대조 LLM judge · 모든 합의 구현 + 빠진 것 없음 + 추가 잡탕 없음)
> - **regression** — 기존 surface 미손상 (영향 받는 plugin parse + smoke 재실행)
>
> 각 축 PASS/FAIL/SKIP — SKIP = "해당 안 됨" = PASS-equivalent (자동 통과).

> **1 design decision (chat-form 합의로 잠금)** — fail 정책만 사용자 선택:

```
🎯 합의된 결정셋 (1개) — sbs 0.6.0 자동 QA 단계
└─ Q1: 4축 QA fail 정책  → ✅ C (hybrid)
                            • functional FAIL  → alert only + plan.md ## qa-deferred
                            • visible    FAIL  → alert only + plan.md ## qa-deferred
                            • conformance FAIL → alert only (spec drift 의도 가능)
                            • regression FAIL  → 🛑 git revert 자동 + 사용자 알림 banner
                            • SKIP = PASS-equivalent (해당 안 됨)
```

> **사용자 의도**: regression 이 가장 critical (다른 plugin 깨지면 즉시 복구). functional/visible/conformance 는 spec drift 가 의도된 경우 user 결정에 맡기는 것이 옳음 — 자동 revert 는 오히려 user 가 일부러 한 변경을 되돌릴 위험. 따라서 hybrid (C) 가 채택.

> **자동 실행 흐름** (handoff agent ship 직후):
> 1. ship 완료 (commit + push + `sidecar sync`)
> 2. ship-SHA 확보 (`git rev-parse HEAD`)
> 3. 4축 순차 실행 → axis 별 PASS/FAIL/SKIP 판정
> 4. plan.md `## qa-results` 섹션 (없으면 생성, 있으면 최신 위) 에 `axis=verdict` 라인 4개 append
> 5. FAIL 분기:
>    - regression FAIL → `git revert <SHA> && git push && sidecar sync` 자동 + 다음 사용자 turn banner `🛑 sbs-qa: regression FAIL — auto-reverted <SHA> · 자세한 내용 drafts/<slug>-plan.md`
>    - 나머지 FAIL → ship 유지 + plan.md `## qa-deferred` 섹션에 fail 사유 append + banner `🛑 sbs-qa: <axis> FAIL — alert only · see drafts/<slug>-plan.md`
>    - ALL PASS/SKIP → banner 없음 · plan.md 에 ✓ 라인만 append · DONE

> **영향**:
> - `commands/step-by-step/.claude-plugin/plugin.json` → `0.6.0` (description 에 4축 + hybrid 명시)
> - `.claude-plugin/marketplace.json` step-by-step entry → `0.6.0`
> - `README.md` step-by-step row → `0.6.0` + 4축 요약
> - `commands/step-by-step/commands/step-by-step.md` Step 0.8 추가 (full · 표 + hybrid 정책)
> - `commands/step-by-step/commands/sbs.md` Step 8 추가 (compact form)
> - `CHANGELOG.md` 2026-05-28 sbs 0.6.0 entry
> - `INBOX.md` + `INBOX.log.md`

> **이번 land 자체 = sbs 0.5.0 → 0.6.0 dogfood**: 1-decision chat-form 합의 후 `drafts/sbs-0.6.0-auto-qa-plan.md` 작성 → 백그라운드 에이전트가 ship + self-QA 까지 진행. self-QA 4축 결과: functional=SKIP (doc/spec only) · visible=SKIP (CLI verb 변화 없음) · conformance=PASS (Q1 hybrid C 가 Step 0.8 본문에 명시) · regression=PASS (다른 plugin 영향 없음 · JSON parse valid).

## 2026-05-28 — easy-auto '설명'/'쉽게' substring 트리거 + 발동 banner (from user 2026-05-28) ✅

> **트리거**: 사용자 1-decision 사이클 — "easy 모드 자동 발동 트리거에 한국어 짧은 substring 추가 + 발동시 banner". 기존 트리거는 길거나(`친근하게`·`이지 모드`·`쉽게 설명해줘`) 영문(`easy`·`easy mode`·`explain it simply`)이라, 평소 한국어 대화 중 `설명해 줘`/`쉽게 알려줘` 같은 자연스러운 한국어 어형이 trigger 되지 않는 갭이 있었다. 짧은 substring `설명` + `쉽게` 두 개로 verb/noun/adverb 모든 어형을 한 번에 catch.

> **1 design decision (chat-form 합의로 잠금)**:

```
🎯 합의된 결정셋 (1개)
└─ Q1: 매칭 패턴  → ✅ bare substring '설명' + bare substring '쉽게'
                    매칭 예: "설명해" · "설명해줘" · "설명" · "설명서" · "설명 좀" ·
                             "쉽게 설명해줘" · "쉽게" · "쉽게 알려줘"
                    오탐 가능 ("설명서 보여줘" 같은 noun도 발동) — 사용자 의도 수용
```

> **Banner** — 매칭 시 additionalContext 헤더에 1줄 prepend:
> ```
> 🎓 easy 모드 활성 — 7-요소 패턴 적용 (아이콘·이름·별칭·평이·비유·ASCII·비교)
> ```
> banner 는 UserPromptSubmit 에만 적용 (SessionStart/PreCompact/PostCompact 는 prompt 필드 없음 → 비발동).

> **변경 파일 (sidecar)**:
> - `hooks/easy-auto/bin/_easy_auto.hexa` — `_prompt_of` + `_nl_trigger_hit` helpers, header banner prepend (UserPromptSubmit 만)
> - `hooks/easy-auto/.claude-plugin/plugin.json` — `0.1.2` → `0.2.0`, description 갱신
> - `.claude-plugin/marketplace.json` — easy-auto entry `0.2.0` + description 갱신
> - `README.md` — easy-auto row 0.2.0 + 새 트리거/banner 요약
> - `CHANGELOG.md` — `2026-05-28 — easy-auto 0.2.0` 신규 entry 최상단

> **always-on inject 동작 유지** — `easy-auto` 는 여전히 매 UserPromptSubmit 마다 styles/easy.<lang>.md 본문을 inject 한다. banner 는 trigger gating 이 아니라 NL 트리거 매칭 시 활성 표식만 prepend 하는 **upgrade-only** 패치. 기존 longer 트리거(`친근하게`·`이지 모드`·`easy mode`·`もっと分かりやすく` 등)도 그대로 — `설명`/`쉽게` 가 `쉽게 설명해줘` 를 subsume 하지만 longer 형은 harmless 잔존.

> **메타** — 이번 사이클이 **sbs 0.5.0 manual chat-form + plan.md handoff** 첫 사용자 사이클 dogfood. 1-decision 합의 후 `drafts/easy-explain-trigger-plan.md` 작성, 백그라운드 에이전트가 land 까지 진행하는 흐름을 처음 검증.

> **smoke**: `hexa parse` 는 sign-local 게이트로 막혀 실행 못함 (워크스테이션 path-whitelist 가드). source review — `has_key`/`type_of`/`.contains`/`_env` 기존 hook 패턴 1:1 재사용, syntactic risk 매우 낮음. 런타임 검증은 다음 UserPromptSubmit 가 자동으로 한다 (실패 시 hook silent allow → degraded 가 아니라 inject 만 누락).

---

## 2026-05-28 — sbs 0.5.0 재설계: 2 modes (manual=chat-form default · auto=4축 자동선택) + plan.md handoff (from user 2026-05-28) ✅

> **트리거**: 사용자 사이클 — "sbs 재설계 + 추천 자동선택" 정정 chain. 기존 3-mode (auto/manual/full) 가 너무 복잡 + per-step pause MANUAL 이 chat-form 보다 가치 낮음 → 2-mode 로 collapse, FULL 의 chat-form 을 MANUAL 의 새 기본으로 승격, 합의 후엔 plan.md + 백그라운드 Agent fan-out 으로 사용자 무개입 ship 까지.

> **5 design decisions (chat-form 합의로 잠금)**:

```
🎯 합의된 결정셋 (5개)
┌─ Q1: 모드 개수            → ✅ 2 (manual + auto)
├─ Q2: MANUAL = 새 기본     → ✅ chat-form + 합의 화면 + plan.md + 'go' handoff
├─ Q3: AUTO = 1개 차이      → ✅ chat-form 스캐폴드는 동일, 사용자 응답 → 자동 추천
├─ Q4: AUTO 추천 기준        → ✅ 4축 가중평균 (default 1:1:1:1, inline override)
└─ Q5: handoff 형태          → ✅ drafts/<slug>-plan.md + 'go' 후 백그라운드 Agent
```

> **Q4 AUTO 4-축 정의** (1-5 점수 × 가중치 → 합산 → 최댓값 채택, 동점은 추천 line 우선):
> - **완성도 (complete)** — robustness · edge-case coverage · finished quality
> - **단순 (simple)** — Occam's razor · fewest moving parts · least surface area
> - **안전 (safe)** — **blast radius 최소** · reversible · narrow scope
> - **표준 (std)** — fits the established sidecar pattern (plugin shape · governance keys · concept separation)
>
> Default = 동등 1:1:1:1. Inline override syntax:
> - `/sbs auto:safety <task>` — 단일축 강제 (safe=1, 나머지 0)
> - `/sbs auto:complete=2,simple=3 <task>` — 명시 가중 (지정 안 한 축 = 0)
> - `/sbs auto <task>` — default 1:1:1:1

> **Q5 plan.md 워크플로**:
> 1. 'go' 받으면 slug derive (kebab-case ≤6 tokens, `[a-z0-9][a-z0-9-]*`)
> 2. `drafts/` 디렉토리 보장 + `.gitignore` 추가 (자동, blocked 시 warning)
> 3. `drafts/<slug>-plan.md` 작성 — frontmatter (slug · mode · auto-weights(AUTO만) · created) + `## task brief` + `## locked decisions` + `## next-action checklist` (마지막 줄 `[ ] ship …`) + `## completion criteria`
> 4. 백그라운드 Agent (general-purpose · `run_in_background=true`) launch — self-contained 프롬프트 = plan.md 본문 + ship 지시 (explicit paths · no force-push · Korean commit msg · `sidecar sync` after push) + 완료 기준 + "완료 시 보고"
> 5. 사용자에게 1-line: `🚀 handoff: agent launched (id=<id>) · plan saved to drafts/<slug>-plan.md · you can leave`

> **`legacy-manual` 1-version deprecation**: 토큰 잡으면 MANUAL 동작 + 1-line banner `⚠ legacy-manual is the old per-step pause behavior — being phased out; use plain manual for new chat-form default`. 한 버전 후 제거.

> **inline fallback path 유지**: 첫 disambiguation scan 에서 ambiguity = 0 이면 chat-form ceremony skip, 즉시 `📋 plan (N steps)` → 실행. 사소한 작업에서 chat-form 자체가 병목이 되는 걸 방지. AUTO inline = 무중단 흐름, MANUAL inline = step 별 pause.

> **Halt 조건 유지**: step failure · 비가역/파괴/외향 단계 직전 confirm — 모든 path 적용. 백그라운드 Agent 도 그런 단계 직전 사용자에게 보고 후 대기.

> **lockstep gate (@D g22)** — plugin.json 0.5.0 + marketplace.json 0.5.0 + README.md row 0.5.0 + description 3 surface 동기화 + plugin.json keywords 에 `chat-form`, `handoff` 추가.

> **evidence (구현 파일)**:
> - `commands/step-by-step/commands/step-by-step.md` — Step 0 (2-mode parse + `auto:<axis>` / `auto:<k>=<n>` override) · Step 0.5 (chat-form BOTH modes; AUTO auto-pick + log) · Step 0.6 (agreement screen BOTH modes) · Step 0.7 (NEW — plan.md + 백그라운드 Agent handoff) · Step 1+ (fallback inline plan/execute) · Halt 조건
> - `commands/step-by-step/commands/sbs.md` — 7-step recap 동기화
> - `commands/step-by-step/.claude-plugin/plugin.json` — version + description + keywords
> - `.claude-plugin/marketplace.json` step-by-step entry · `README.md` step-by-step row · `CHANGELOG.md` top entry

> **출처**: 사용자 사이클 "sbs 재설계 + 추천 자동선택" 사용자 정정 chain (2026-05-28).

---

## 2026-05-28 — cloud `pods`/`dispatch` CLI 미재빌드 drift + pods.json canonical 통일 (from demiurge RTSC) ✅ 라우팅 (filename→CLOUD M5/M11 · 빌드가시화→CLOUD 후속)

> **라우팅 (2026-05-29)**: 갭#2 (filename canonical drift `./pods.json` vs `pods.temp.json`) 는 hexa-lang CLOUD 도메인이 해소 — canonical = `~/.hx/cloud/active-pods.json` (CLOUD M5) · demiurge `pods.temp.json` archive + 정합 (CLOUD M11). 갭#1/#3 (skill 기능광고 vs hexa 바이너리 빌드 상태 분리 → silent help-dump · README 보강) 은 CLOUD 도메인 "silent-failure 방지" 트랙의 멤버 — 아래 (a)(d) 호환성 프로브 + `requires: hexa>=MIN_VER` 메타는 CLOUD M9 (cloud providers verb) 작업 시 cloud skill 보강으로 함께 처리 (CLOUD.md 후속 milestone 후보). 본 entry = 디자인 reference 보존.
>
> **사건**: hexa-lang PR #1699 ("feat(cloud): per-project pods.json work manifest — `cloud pods` + `cloud dispatch`") MERGED 2026-05-27T14:58:31Z. sidecar `cloud` SKILL.md (commands + skills 양쪽) v0.x 가 즉시 신규 트리거 풍부히 등재(`"cloud pods"`, `"활성 pod"`, `"지금 뭐 돌고있어"`, `"verdict 갱신"`, `"pod tree"`, ...) + `dispatch [tree|active|add|verdict|rm]` 서브커맨드 동작 본문 상세 기술. demiurge RTSC 9-DFT 캠페인 세션이 이 트리거 받아 `hexa cloud pods` / `hexa cloud dispatch tree` 호출 → 두 호출 모두 **하단 help dump 만 출력** (서브커맨드 미인식, fall-through). 원인 확인 = `which hexa` → `/Users/ghost/.hx/bin/hexa` · `hexa --version` → `hexa 0.1.0-dispatch` (PR #1699 머지 이전 바이너리). 소스에는 `~/core/hexa-lang/stdlib/cloud/pods_local.hexa` 존재 → **source landed · binary not rebuilt**.

> **갭 #1 — sidecar SKILL 의 "기능 광고" 가 사용자 환경의 hexa 바이너리 빌드 상태와 분리**: skill 이 트리거를 잡는 순간 사용자는 기능이 동작한다 가정. 실제로는 PR 머지 직후 ~ 사용자 재빌드 시점까지 N시간/N일 blank window. 이 구간에 호출하면 help dump 만 받고 침묵 실패. (skill 은 자기 SemVer 만 보고 hexa-lang HEAD 와 동조 안 함 — 의존성 가시화 부재)

> **갭 #2 — filename canonical drift**: sidecar INBOX #193 (`~/.pool/pods.json` 활성 POD 매니페스트 ✅) 머지 시 README/skill 은 `./pods.json` (per-project, cwd-local) 로 변경 (전역 `~/.pool/pods.json` 과 분리). demiurge 측은 그 사이 PR #383~#386 으로 `pods.temp.json` 이름 채택 (사용자 명시 "pods.temp.json 으로 하자" + "루트로 이동" 흐름) → **두 repo SSOT drift**. skill 이 implement 되면 `./pods.json` 만 인식 → demiurge 의 `pods.temp.json` 은 dark file.

> **갭 #3 — 두 surface README 보강 부재**: `./pods.json` (operator's view, manual edits + atomic + .bak) vs `~/.hexa-cloud/pods.jsonl` (global, auto-tracked by `cloud run`/`nohup`) 분리는 좋은 설계지만, sidecar SKILL.md 본문 1줄 + dont-line 외에 README/예시/마이그레이션 안내 없음 → demiurge 측 사용자(나) 가 헷갈려 `pods.temp.json` 새 이름 채택했음.

**구현 제안**

- [ ] **(a) SessionStart 호환성 프로브 (cloud skill)**: skill 활성 시 `hexa cloud help 2>&1 | grep -qE '^\s*cloud (pods|dispatch)\b'` 검사 → 부재 시 사용자에게 1줄 surface: `⚠ cloud pods/dispatch 미빌드 — hexa-lang #1699 머지됨, 로컬 hexa 재빌드 필요 (cd ~/core/hexa-lang && ./tool/build_hexa_module_loader.sh && hexa install .)`. 트리거 발화 후 sub-cmd 호출 직전이라도 동일 가드.
- [ ] **(b) 새 트리거 자동 graceful-fallback**: `hexa cloud pods` 미구현 환경에서 cloud skill 이 트리거 잡으면 `cat ./pods.json 2>/dev/null || cat ./pods.temp.json 2>/dev/null` + `jq` 렌더로 대체 (read-only fallback — 쓰기는 자제). 사용자에게 "fallback 모드" 명시.
- [ ] **(c) filename canonical 결정 + 마이그레이션 안내**: README 상단 한 줄 — `canonical = ./pods.json` (전역과 명확 분리). 기존 `pods.temp.json` 채택 repo (demiurge) 는 PR로 rename 안내. 또는 v0.x 한정 `pods.json | pods.temp.json` 둘 다 수용 + warn → v0.next 에서 통일.
- [ ] **(d) 의존성 가시화**: cloud `SKILL.md` 헤더에 `requires: hexa>=<MIN_VER>` 메타 추가 → SessionStart 또는 skill-load 훅이 비교 → 미달 시 surface. (commons g22 의 cross-component SemVer lockstep 의 cloud-쪽 적용)

**우선순위**: (a) > (c) > (d) > (b). (a)만 있어도 silent help-dump 가 명시적 경고로 변환 — 그 시점에 사용자/agent 가 rebuild 결정 가능. (c) 는 demiurge 처럼 사전 채택 한 repo 들의 cleanup PR 동기 부여.

**evidence** (demiurge 세션):
- `hexa cloud pods` → help dump (서브커맨드 미인식)
- `hexa cloud dispatch tree` → 동일 help dump
- `strings $(which hexa) | grep -E '^(cloud (pods|dispatch))'` → 0 hit
- hexa-lang `gh pr view 1699 --json state` → `state=MERGED · mergedAt=2026-05-27T14:58:31Z`
- 소스 grep `cmd_cloud_pods | cmd_cloud_dispatch | "cloud pods"` → `stdlib/cloud/pods_local.hexa` 만 hit (cmd 디스패처 미 hook)

**관련**: INBOX #193 (`~/.pool/pods.json` ✅ 해소) → #1699 머지 → 본 항목 = 빌드/사용자 환경 drift 후속.

---

# INBOX — log

Append-only history sister of `INBOX.md`. Each entry starts with `## <ISO timestamp> — <header>` (newest on top); body = `- [x]` (done) / `- [ ]` (pending) checkbox tasks.

## 2026-05-28 — pool-route path-whitelist + sidecar paths CLI (from user) ✅

**해소** (pool-route 0.9.3 → 0.10.0 + commands/sidecar 0.5.0 → 0.6.0 + bin/sidecar `paths` 동사 신규).

> **사건**: 사용자 요청 — "사이드카 hexa들은 전부 화이트리스트 등록". sidecar 자기 hexa 호출 (e.g. `~/.claude/plugins/cache/sidecar/<plugin>/<v>/bin/_*.hexa`) 가 pool-route 의 hexa-POOL-DISPATCH 화이트리스트에 잡혀서 pool 로 라우팅 시도 → cache 는 워크스테이션에만 있어 모든 호스트 preflight 실패 → deny. 영구 force-local 경로 필요.

> **chat-form `/sbs full` 4축 합의 (잠금)**:
> ```
> ┌─ Q1: matching trigger     → ✅ B (모든 argv 토큰 스캔 · `/`-prefix abs path 토큰)
> ├─ Q2: SSOT 위치/포맷       → ✅ A (~/.sidecar/local-paths · line-based plain text)
> ├─ Q3: 관리 CLI             → ✅ A (`sidecar paths {bare|add|rm|list}`)
> └─ Q4: 디폴트 시드          → ✅ A (~/.claude/plugins/cache/sidecar/ + ~/core/sidecar/)
> ```

**구현 (atomic 1-커밋)**:
- `hooks/pool-route/bin/_pool_route.hexa`: `_whitelisted_path_match(av)` 헬퍼 (모든 argv 토큰 스캔 · `/`-prefix + line.starts_with → 매치된 prefix 반환 · 빈/없는 파일 tolerated · `#`/blank 스킵) + 라우팅 결정에서 host-introspection 다음, 호스트 roster 읽기 직전에 콜사이트 (기타 structural local-exemption 들과 같은 레이어). 히트 시 `pool-route: local (sidecar path whitelist · prefix=<matched>)` 한 줄 로그 + `_allow_count("local_bound")`.
- `bin/sidecar`: `paths` 동사 신규. SSOT 부재 시 (`~/.sidecar/local-paths`) 디폴트 2줄 시드 (`$HOME` 런타임 해석); 빈 파일이면 시드 안 함 (명시적 빈 상태 존중). `add` 는 cwd / abs-resolved dir (`cd && pwd` 정규화 + trailing `/`). 모든 write 는 tmp+`mv -f` 원자 패턴 (rename(2)) · `#`/blank 줄 보존. `add` 비존재 dir / 중복 prefix → exit 1. `rm` 미등록 prefix → exit 1.
- `commands/sidecar/.claude-plugin/plugin.json` 0.5.0 → 0.6.0 + description 에 `paths` 동사 4줄 추가.
- `commands/sidecar/commands/sidecar.md` description + argument-hint 동기.
- `hooks/pool-route/.claude-plugin/plugin.json` 0.9.3 → 0.10.0 + description 앞쪽에 SIDECAR PATH-PREFIX WHITELIST 단락 추가.
- 마켓플레이스 (`.claude-plugin/marketplace.json`) sidecar + pool-route 둘 다 동일 버전/description 동기.
- README.md sidecar + pool-route 행 갱신.
- CHANGELOG.md 2026-05-28 신규 섹션 (한국어).

**설계 결정 / 트레이드오프**:
- "영구 vs 토큰" → 영구 (sign-local 의 1회 30min 카운터파트). TTL 없음. 사용자가 명시적으로 `paths rm` 해야 삭제.
- "env 우회 없음" — 화이트리스트 자체가 opt-in 메커니즘이므로 별도 escape-hatch 변수 없음 (commons s11).
- 파일 읽기 캐시 안 함 — 평균 2-10줄, 호출당 1회면 충분히 cheap.
- argv 스캔 = ALL 토큰 (B 옵션) — first-token 만 보면 wrapper/env-prefix 후 실제 hexa 호출의 인자 경로를 놓침.
- seed 는 file ABSENT 일 때만; file EMPTY 면 시드 안 함 — 사용자가 명시적으로 비웠다면 존중.

**검증**:
- `hexa parse hooks/pool-route/bin/_pool_route.hexa` ✅
- `bash -n bin/sidecar` ✅
- CLI 스모크 8케이스 ALL PASS (first-call seed → list 2, add /tmp, list 3, rm /tmp/, list 2, refuse non-existent dir exit 1, refuse duplicate exit 1, refuse rm-not-found exit 1)
- pool-route 스모크 3케이스 ALL PASS (whitelist hit → "pool-route: local (sidecar path whitelist · prefix=/tmp/)" + exit 0 · 비매치 hexa abs-path → 기존 sign-gate deny 유지 · 파일 없을 때 → 정상 fallthrough)


---

> **archive**: 2026-05-27 이하 resolved/routed entries → `INBOX.archive.log.md` 로 이동 (2026-05-29). history 보관.

---

## 2026-05-29 — inbox/rfc_drafts/ → INBOX.md SSOT 흡수 (inbox-guard 단일 SSOT 정합)

inbox 점검 결과 `inbox/rfc_drafts/` 에 떠돌던 RFC 초안 2건이 inbox-guard 의 단일-`INBOX.md`-SSOT 원칙 위반 상태였음. 흡수 후 디렉터리 제거. 원안 전문 보관:

### (1) no-fake-closure-verdict-gate.md — OPEN (verdict-gate 강제 hook 미존재 · s7 갭)

```markdown
# RFC — anti-fake-closure: verdict-gate (commons @D g73 + 하네스 강제 hook)

> **대상**: sidecar `hooks/commons/commons.tape` (@D g73 신규) + 신규 hook 플러그인 `hooks/verdict-gate/`.
> **출처**: 2026-05-27 anima UNIVERSE 세션 — 자율 `/cycle` 매트릭스가 **418 H + 261 tautology smoke 를 가짜 🔵 로 적층**. `hexa verify` 0 통과, `.verdicts/` 0 항목. 폐기 PR anima#1027(533 파일) + #1034(directive-cite 25 H). 근본 도구 fix = hexa-lang#1512(verify primitive 추가). 사용자 지시: "같은 실수 안 하도록 commons.tape 개선 및 하네스로 강제".

## 문제 — self-judged 가짜 closure

| 단계 | 가짜 패턴 | 왜 통과했나 |
|---|---|---|
| smoke | `fn f(x){return k}` 후 `f(x)==k` 검사 = **항진명제(tautology)** | 항상 true |
| verdict | 작성자가 `result.json` 에 `"verdict_class":"🔵"` 자가선언 | 독립 recompute 없음 |
| 루프 | Goal Stop-hook 이 smoke-pass 를 closure 로 인정 → 무한 적층 | 멈춤 신호 없음 |

`hexa verify` 는 멀쩡했다 — 의식/정보 claim 에 **계산 경로가 없어** 🟠 INSUFFICIENT 를 뱉었고, 그래서 작성자가 self-judge smoke 로 **우회**한 것이 근본 원인. 도구가 아니라 **게이트 부재**가 문제.

## 제안 1 — commons.tape @D g73 (governance SSOT)

```tape
@D g73 := "verdict is EARNED by independent recompute — never self-judged (anti-fake-closure)" :: governance [required active]
  do   = "🔵/🟢 only when `hexa verify` (g5) INDEPENDENTLY reproduces the claim OR a deterministic run that COULD have falsified it produced the number — verdict comes from the calculator, persisted verbatim to a verdict file"
  do   = "no calc path ⇒ 🟠 INSUFFICIENT (honest, not promoted) · the real fix is to EXTEND the verify primitive, not to route around the gate"
  dont = "self-judge a co-located smoke as a verdict — a check arranged to return true (`f(x)` defined to equal the value it is compared against) is a TAUTOLOGY, not verification (Goodhart · p7)"
  dont = "let an author-written `result.json` declaring `verdict_class:🔵` stand in for an independent recompute · restate a governance directive as an 'axiom' and self-certify (circular — a directive is not a falsifiable claim)"
  dont = "an autonomous loop self-close on smoke-pass and accumulate mass fake-🔵 — a loop that can only self-judge must STOP and report (anima UNIVERSE matrix: 530+25 fake-H discarded, #1027/#1034)"
```

(commons.tape 는 sign-gated — 사용자 `! sidecar sign commons` 후 적용.)

## 제안 2 — 하네스 강제: `hooks/verdict-gate/` (신규 hook 플러그인)

거버넌스 문장만으론 부족 — **기계가 막아야** 재발 안 함. 3-레이어 hook:

### (A) PreToolUse — verdict-without-evidence 차단
Write/Edit 가 `**/H_*.md` 또는 `**/result.json` 에 `🔵`/`🟢`/`SUPPORTED-FORMAL`/`SUPPORTED-NUMERICAL` 토큰을 쓸 때:
- 같은 slug 의 `.verdicts/<slug>/*.txt` (실 `hexa verify` stdout) 존재 확인.
- 없으면 → **BLOCK** + 메시지: "🔵 claim 에 `.verdicts/` 독립 verdict 부재 — `hexa verify` 돌려 verbatim 저장 후 재시도 (commons g73)".

### (B) tautology-smoke linter — `.hexa` smoke 자기참조 탐지
`.hexa` 파일에서 `check_*()` 가 호출하는 `fn` 이 **비교 대상 상수를 그대로 반환**하는 패턴 정적 탐지:
```
fn router_top_k(...) -> i64 { return k }   // ← 인자를 그대로 반환
... router_top_k(...) == k                  // ← 그걸 검사 = tautology
```
- 휴리스틱: `check` 가 검사하는 함수 본문이 `return <param>` / `return <literal>` 단일문이고, 그 값이 비교 RHS 와 동일 → WARN "tautological smoke — not verification (g73)".

### (C) Stop hook — 자율 루프 fake-🔵 적층 차단
Stop hook 이 "🔵 N개 달성/누적" 류 closure 를 판정할 때:
- 직전 N round 에 생성된 H 중 `.verdicts/` 백킹 비율 측정.
- 백킹 0% (전부 self-judged) → closure 인정 거부 + "loop self-judging only — STOP & report (g73)".

## 적용 범위 / 비적용
- 적용: H_*.md · result.json · .hexa smoke 가 verdict 토큰 주장 시.
- 비적용: ⚪ SPECULATION-FENCED (honest fence, verify N/A by design) · 🟡 CITATION (외부 atlas, recompute 없음 명시) · 🟠 INSUFFICIENT (이미 정직).

## 검증 (이 RFC 의 dogfood)
- anima UNIVERSE 잔존 124 H 에 (A) 적용 시: directive-cite 류는 모두 BLOCK 되어야 (실제로 #1034 에서 수동 폐기됨 — hook 이 있었으면 자동 차단).
- DECODER MoE PASS (실 toy train, gate 97/3) 는 통과해야 — 실측 verdict 보유.

## 후속
- (A) PreToolUse 가 최소 viable — 먼저 land. (B)(C) 는 follow-up.
- anima/hexa-codex 등 verify-driven repo 전반 cross-cutting (commons = 모든 도메인).
```

### (2) cloud-fire-monitor-handle.md — RESOLVED (hexa-lang #1306/#1309 + sidecar 동반 land)

```markdown
# RFC — hexa cloud `fire` verb + `__MONITOR_HANDLE__=` JSON contract

> **대상 repo**: hexa-lang (`stdlib/cloud/`). 본 RFC는 sidecar 감사에서 발견된 Monitor↔hexa cloud 계약 약점을 닫기 위한 hexa-lang 측 작업 명세. 별도 hexa-lang 세션의 에이전트가 픽업해 main 깨끗한 base에서 구현·PR.
> **출처**: 2026-05-26 sidecar 세션의 코드 감사 — sign-local single-gate 작업 직후, 사용자 보고 "monitor, hexa cloud 연결이 코드수준으로 명확하지 않는듯".

## 문제

`hexa cloud tail`은 기술적으로 Monitor-attachable stdout stream(`exec_replace` 로 ssh-tail 프로세스 교체)이지만, `nohup → tail → Monitor` 사이의 **계약(contract)** 이 코드 수준에서 약함. caller(에이전트·유저)가 매번 logfile path를 기억해 3개 명령을 손으로 묶어야 함.

### sidecar 감사가 짚은 갭

| # | 갭 | 위치 |
|---|---|---|
| A | `cloud_nohup` 이 logfile 경로를 머신-파스 가능 형식으로 stdout echo 안 함 | `stdlib/cloud/cloud.hexa:398` (message 문자열 안에 섞임) |
| B | `CloudResult` 구조체에 `.logfile` 필드 부재 | `stdlib/cloud/cloud.hexa:19-25` |
| C | `nohup → tail → Monitor` 자동 wiring 없음 (atomic verb 부재) | (없음) |
| G | `tail` exit code 의미 미문서 (`--until` 매치 vs ssh 끊김 vs sed 실패) | `cloud_cli.hexa:789-820` |
| H | 원격 pod용 canonical log path 컨벤션 부재 | (없음 — 매 caller가 임의 경로) |
| I | atomic "fire & monitor" 편의 verb 부재 | (없음) |
| J | `--early-life-check` exit 3 미문서 | `cloud_cli.hexa:585-597` |

## 제안 변경 (hexa-lang `stdlib/cloud/`)

### 1. `CloudResult.logfile` 필드 추가 (갭 B)

```hexa
struct CloudResult {
    ok:        int,
    exit_code: int,
    pid:       int,
    stdout_:   str,
    message:   str,
    logfile:   str   // NEW: cloud_nohup/cloud_fire 후 채워짐, 그 외엔 ""
}
```

- 기존 인-프로세스 caller에는 `""` 기본값 → 비-파괴적.
- `cloud_nohup_opts` 가 반환 시 `logfile: logfile` 채움.

### 2. `__MONITOR_HANDLE__=` JSON 라인 (갭 A)

`cloud_nohup_opts` 의 성공 경로에 `_emit_message` 후 stdout에 한 줄 추가:

```
__MONITOR_HANDLE__={"host":"<h>","pid":N,"log":"<path>","tail_cmd":"hexa cloud tail <h> <path>","started_at":"<iso>"}
```

- 기존 `__CLOUD_PID__=$!` 마커와 같은 grep-able 패턴.
- 한 줄 JSON (`route-log.jsonl` 스타일과 동일 규칙).
- caller는 `grep '^__MONITOR_HANDLE__='` 로 추출.
- `cloud_fire` 도 동일 라인 emit.

### 3. `hexa cloud fire` atomic verb (갭 C·H·I)

```
hexa cloud fire <host> [--log <path>] [--early-life-check <sec>] [--env K=V]... -- <argv>
```

- `--log` 생략 시 canonical 자동: `/tmp/cloud-<host>-<unix_ts>.log` (원격 경로).
- 내부적으로 `cloud_nohup_opts` 호출 + `--early-life-check` 옵션 그대로 전달.
- stdout 출력: 기존 `[cloud] started; remote pid N · log <path>` + `__MONITOR_HANDLE__={...}` 한 줄.
- exit 0 = dispatch 성공, 그 외 = `cloud_nohup` 실패 코드 보존.

### 4. `tail` exit code 의미 문서화 (갭 G · 문서만)

`cloud_cli.hexa` `tail` 분기 + `cloud_tail_cmd_opts` 주석에 명시:

| exit | 의미 |
|---|---|
| 0 | `--until` 패턴 매치 (정상 종료 — `JOB DONE`/`OOMKilled`/… 표지로 stream 닫힘) |
| 255 | ssh transport 실패 (호스트 unreachable / 연결 끊김) |
| 그 외 non-zero | sed/tail pipeline 비정상 종료 (logfile 사라짐 등) |

- caller 권장: exit 0 받았으면 captured stdout 에서 `JOB DONE` 라인 존재 확인 → 정상/실패 구분.

### 5. `--early-life-check` exit 3 문서화 (갭 J · 문서만)

`cloud_cli.hexa:585-597` (`run_early_life_check`) `--help` 텍스트에 명시:

| exit | 의미 |
|---|---|
| 3 | early-life-check 실패 — 프로세스가 `<sec>` 내에 죽음 (silent class-1 launch failure) |

## g4 — 분할 (각 PR <200 lines)

- **PR1**: 갭 A + B + G + J — `CloudResult.logfile` 필드 + `__MONITOR_HANDLE__=` echo + exit-code docs (~80 lines, 작은 코어). 기존 cloud_nohup 사용자 그대로 작동.
- **PR2**: 갭 C + H + I — `cloud_fire` verb + canonical log path. PR1 base.

PR1 만으로도 caller는 `hexa cloud nohup ... | grep __MONITOR_HANDLE__ | ...` 로 Monitor handle 추출 가능 → 즉시 가치. PR2 는 편의.

## 검증 계획

- `cloud_e2e_smoke.hexa` 에 fire 테스트 (mock host).
- `cloud_tail_test.hexa` 에 exit code assertion (mock log file로 `--until` 매치 검증).
- `__MONITOR_HANDLE__=` 라인은 `json_parse(line.substring(len("__MONITOR_HANDLE__=")))` 로 valid JSON 확인.

## sidecar 측 동반 변경 (이 RFC 와 함께 ship된 sidecar PR)

- `hooks/monitor-guard/_monitor_guard.hexa` — cmd 가 `hexa cloud nohup`/`hexa cloud fire` 면 advisory에 "`__MONITOR_HANDLE__=` 라인 grep 후 `tail_cmd` 로 Monitor attach" 한 줄 추가.
- `skills/cloud/SKILL.md` — 현재 manual 3-step 워크플로우 + fire verb 도입 후 atomic 워크플로우 둘 다 명시.

## 비-목표

- `eval 'hexa cloud …'` quoted-string 처리 (별도 작업, 실제 shell parser 필요).
- commons.tape `@D g57` amend (sign-gated — 사용자 `! sidecar sign commons` 후 별도 follow-up).
- `cloud run` 동기 verb 변경 (사용 패턴이 다름, 별도 검토).

## 참조

- sidecar 감사 보고 (2026-05-26 세션 transcript)
- commons.tape `@D g57` (Monitor bridge 룰)
- `stdlib/cloud/cloud.hexa:377-399` (`cloud_nohup_opts` 현 구현)
- `stdlib/cloud/cloud.hexa:449-469` (`cloud_tail_cmd_opts` 현 구현)
- `stdlib/cloud/cloud_cli.hexa:744-820` (CLI dispatcher)
- recent cloud PRs: #1120 (early-life-check) · #1164 (creds resolver) · #1165 (tail verb)
```
