# commons — cross-project governance (MUST FOLLOW · hard rules, not hints)

Always-on, project-agnostic rules — the sidecar governance SSOT. Project-specific rules live in
`.harness/enforcement.json` / `.harness/keywords.json`; a repo may override this file at
`.harness/commons.md`. Most rules are mechanically enforced by sidecar hooks — this block keeps
them salient. Rules are keyed by **stable slug** (order may change · never reference by number).
Each rule = one `do:` / `dont:` pair; mechanism detail & precedents live in code + CHANGELOG + git.

> 🏛️ 프로젝트 설계는 먼저 repo-root `ARCHITECTURE.json`(설계 SSOT · `single-doc`)을 읽어라 —
> `sidecar architecture inject` 가 SessionStart 에 주입한다. 구조·모듈·데이터흐름을 추측 말고 그
> 트리를 단일 출처로 읽고 코드/설계 변경 시 lockstep 갱신(`cycle-docs-pr`). 사람은 `python3 serve.py`.

## root-cause — 원인을 고친다, workaround 아님
- do: 증상 아닌 원인을 고친다 · 같은 결함이 재발하면 그 학습을 repo-root `ARCHITECTURE.json` 의 `convergence.records[]`(id·state·value·threshold·source · update-in-place) 단일 SSOT 에 기록 — `sidecar lint` 가 well-formed(id+유효 state) 강제, 그 `source` 파일을 터치(Read/Write/Edit)할 때마다 사이드카가 그 학습을 자동 표면화(같은 결함 재도입 차단)
- dont: `@ts-ignore`·`eslint-disable`·빈 catch·`if(false)`·TODO-만·shadow 가드 (정당하면 `@root-cause-ok <이유>`) · 재발 학습을 코드 인라인 주석(구 `@convergence` 마커 폐기)이나 별도 incident 트래커로 흩기 (ARCHITECTURE SSOT 한곳으로)

## verify-done — "됐다" 전에 실제 검증
- do: `sidecar ci`/build/test 를 돌려 **출력으로** 확인 · 기능구현/버그픽스 후 전 서브커맨드·엣지케이스 전수 QA(PASS/FAIL 집계 → 발견 버그 fix 후 닫기) · 증거는 `sidecar verdict record`
- dont: LLM 자가판정 · 실패 은폐(실패는 실패라고) · 미검증 "완료"

## anti-punt — 막히면 묻지 말고 진행 (bypass)
- do: local + 가역 + 비파괴 + 유저전용입력 아님 → 그냥 실행 · 질문은 평문 채팅으로
- dont: 되돌리기 어려움/외부노출/유저결정이 아닌데 되묻기 · 선택지 박스로 punt

## single-doc — 산출 문서는 둘로 통합
- do: AI 산출물은 **ARCHITECTURE**(갱신형 SSOT · `.md` 또는 `.json`+`.html` 뷰어 · 제자리 교체 update-in-place) + **CHANGELOG.md**(append) 둘로 · README 도 현재상태 SSOT 로 update-in-place · ARCHITECTURE.json 은 위계를 `children` 트리로 분해
- dont: 흩어진 `*-report/summary/notes` · 트리/README 에 변경이력·버전·날짜·`이전엔`/`deprecated` 누적 · 한 셀(특히 `상세`)에 여러 사실 욱여넣기(= 자식 노드로 분해 신호)

## preserve-state — 산출물은 `state/` 하나로
- do: 실험·벤치·검증(verdict/claim)·스크래치 등 모든 작업 산출물을 git-tracked repo-root `state/` 한 폴더에 평면 보관·커밋(GitHub 보존)
- dont: 휘발 `/tmp` 에만 두기 · `scripts/scratch`·`.verdicts`·`bench`·`experiments` 등 별도 디렉토리 신설 · 임시물 버리기 (재생성 가능한 `build/` 만 gitignore · 머신 로그는 `.harness/`)

## folder-docs — 작업 폴더엔 로컬 CLAUDE.md
- do: 자격 폴더(설정 `folderGuides` roots/depth/minFiles)에서 커밋하면 그 폴더에 로컬 `CLAUDE.md`(목적·핵심파일·규칙·gotcha) 를 두고 코드 변경 시 lockstep 현행화 — staged 폴더 누락은 `sidecar lint` 가 `FOLDER-GUIDE-MISSING` 으로 게이트(`sidecar folders scaffold <dir>`). 내용은 자유양식(do/dont 강제 아님)
- dont: 가이드 없이 폴더에 코드만 쌓기 · 옛 가이드 stale 방치 · 루트 CLAUDE.md 하나로 깊은 폴더 맥락 대체

## ing-board — 진행추적·인계는 한 보드
- do: 다단계/장기작업 진행추적과 세션 인계를 repo-root `ING.jsonl`(전용 `ing` git ref) 한 보드로 — `sidecar ing add/next/done`(완료=scrub→CHANGELOG) · 상태변동마다 현행화 · 보드는 **내 현재 repo 전용**(cross-repo 전달 폐기)
- dont: `HANDOFF.md`·`INBOX.md`·`inbox/*.md` 흩뿌리기 · 구 `handoff`/`trail` 사용 · 작업을 타 repo/세션 보드로 떠넘기기(직접 고쳐라 · `upstream-fix`)

## git-safety — 파괴적 git 금지
- do: 자격증명은 `secret` CLI 경유(인라인·로그 금지)
- dont: force-push(`--force`/`-f`/`--force-with-lease`/refspec `+`) · 비밀키·시드 실값 커밋 · 공유 main 직접 파괴

## four-axes — 추천은 4축 병렬
- do: 유저 추천 시 4축(완성도·단순·안전·표준) 병렬 제시 · 고정축 default 면 ★표시 + auto-pick(결정하고 진행)
- dont: 단일 가중합 승자 하나로 뭉개기 · 축 누락/병합

## honesty — 정직
- do: FALSIFIED/negative 도 결과로 보고 · 모르면 모른다고
- dont: 결과 skip·은폐 · 없는 근거 날조

## surgical — 최소 변경
- do: 요청에 직접 추적되는 변경만 · 본인이 만든 고아만 정리
- dont: 인접 코드 임의 리팩터 · 무관 데드코드 삭제

## canonical-cli — 정해진 명령을 써라
- do: 같은 일은 정해진 명령으로 — 이미지 `sidecar imagine`·리서치 `sidecar research`·영상 `sidecar watch`·호스트 `sidecar pool`·LSP `sidecar lsp`·자격 `sidecar secret`·단계 `sidecar sbs`·실험 `sidecar micro-exp`·검증 `sidecar ci`·주장 `sidecar verify`·기록 `sidecar verdict` · GPU `hexa cloud`·학습 `hexa dojo`·deck `hexa deck` · 항상 PATH 글로벌 바이너리(최신화 `sidecar self-update`) · 실행중 클라우드잡은 `sidecar ing pod add`
- dont: raw curl/수동 runpod·vast·train 스크립트 습관 · repo 서브모듈의 stale 바이너리 사용

## cycle-docs-pr — 매 사이클 문서 + 머지
- do: 매 사이클 ① 문서(CHANGELOG append + ARCHITECTURE·README·ING 현행화) ② `sidecar pr-cycle` 로 검증된 main 머지 · 매 턴 파일 변동은 그 턴에 닫기(미완은 `wip:` 커밋) · 갱신 시 `🏛️ ARCHITECTURE`/`🔵 ING` 한 줄 보고 · 새 작업은 최신 base 에서 분기
- dont: 커밋만 쌓고 머지 안 하기 · 문서 없이 머지(`--no-doc` 는 진짜 불필요시만) · 변동 staged 인데 커밋 없이 턴 종료 · 안 했는데 했다고 보고 · 로컬 main 방치

## no-unsolicited-paper — 논문은 지시 전 언급 금지
- do: 유저가 명시 요청할 때만 논문/arXiv/선행연구·`sidecar research` 제시
- dont: 지시 전 논문 선제 언급·추천·곁다리 인용

## break-walls — 벽은 돌파한다 (closed-negative ≠ 종착)
- do: 벽은 먼저 분류(측정artifact·틀린방향·substrate인프라·진짜천장·투자부족) → MULTI-LENS(≥2–3 원리적 렌즈)+각 통제(shuffle/ablation/negative-control) → 그 뒤에만 terminal 🧱 · LAW 도 frozen-first 예측+falsify · dry 선언 전 직교 mechanism-family enumerate
- dont: 1회 시도로 종착 · 게으른 천장(HW/성능 캡 1-pass 박제) · 같은 family 만 소진하고 dry 선언 · substrate/측정 벽을 과학 천장으로 박제 · tune-to-green

## verdict-integrity — terminal 박기 전 측정경로부터 (negative 도 positive 와 동일 바)
- do: terminal/천장 verdict 전에 **측정경로 무결성부터** — reference/mirror/다른엔진과 **발산하는 결과는 측정 의심 신호**(sampler·RNG·decode·serialize·OOM-미완·미배선), 정답지 대조(`reference-match`)로 artifact 배제한 뒤에만 terminal
- dont: negative/FAIL 을 측정확인 없이 terminal 박기(GREEN 만 검증하고 RED 는 rubber-stamp) · 정답지와 발산을 모델/대상 결함으로 단정(측정 먼저 의심) · 박았다 철회 반복

## heavy-on-pool — 무거운 작업은 공유 pool
- do: 빌드·테스트·대규모 스윕·장시간 연산은 `sidecar pool` 공유 호스트에 분산(`pool on/bg/route/status`) · GPU·학습은 `hexa cloud`/`hexa dojo`
- dont: 로컬 단일 머신에 부하 몰기 · `shared:false` 제한 호스트를 공유 풀 컴퓨트로 사용

## no-escape-hatch — 우회경로는 지시 전 작성 금지
- do: 차단/가드/정책은 요청받은 그대로 전면 차단으로 구현 · 탈출구는 유저가 따로 요청할 때만 추가
- dont: 지시 전 우회경로(`# *-ok` 류 마커·opt-out 플래그·skip 조건·fallback 분기·가드 무력화) 끼워넣기 (기존 마커 탈출구는 유지, 새 가드엔 구멍 X)

## upstream-fix — upstream 막힘은 그 세션에서 내 손으로 끝까지 고친다 (cross-repo 인계 금지)
- do: 의존 upstream(`hexa`/`hexa-lang`/`demiurge` 등 **전부 dancinlab repo = 너의 쓰기권한 안**) 결함은 **막힌 바로 그 세션에서 직접** — clone/worktree 받아 원인 고치고 그 repo 의 빌드·CI 로 검증한 뒤 **그 repo 에서 `sidecar pr-cycle` 머지까지 완료** → 그 후 원작업 복귀. ING 은 오직 **내 현재 repo** 의 `↩resume …` 복원 메모로만(작업 끊김 방지). 고위험 substrate(codegen·runtime·toolchain)는 격리 worktree, 동시세션 활동(브랜치변동) 감지 시 STOP
- dont: **upstream repo(hexa-lang 등)로 그 수정을 떠넘기기 — 절대 금지** · 다른 세션/사람에게 cross-repo 인계 · "upstream 이라 여기선 못 고친다" 핑계 · 로컬 wrapper/shadow/fork/monkey-patch 로 덮기 · 고쳤다며 머지 안 하고 둠. (ING 의 cross-repo 전달(`--to`) 기능은 폐기됨 — 보드는 내 repo 전용)

## release-tag-ci — 릴리즈는 태그 → CI 배포
- do: 배포 산출물 있는 repo 는 검증된 main 에 semver 태그(`vX.Y.Z`) → `release.yml`(CI)가 타깃별 빌드·GitHub release 업로드 · (선택) main push 마다 edge prerelease
- dont: 손으로 버전 bump/태그 중구난방 · 미검증 커밋에 태그 · 로컬 수동 빌드→수동 업로드 · 머지만 하고 릴리즈 안 하기


## poll-min-30m — 외부 장기건 폴링은 ≥30분
- do: 외부 long-run(GPU pod·원격 measure/bench) 을 메인세션이 직접 폴링하면 ≥30분(1800s) 간격·상태만 · 가능하면 서브에이전트(worktree)에 위임 · 의심되면 호스트 직접 실측(ground-truth)
- dont: 분 단위로 깨우기(프롬프트 캐시 파괴) · live agent 재-ping/resume(진행 리셋 루프) · idle/빈 출력을 결과로 받기 · stale 통지 무검증 행동

## pi5-akida-anima — Pi5-Akida 는 anima 전용
- do: Raspberry Pi 5 + Akida 뉴로모픽 칩(`pi5-akida`)은 anima 뉴로모픽 실험 컨텍스트에서만 사용
- dont: 공유 `pool` 로스터 등록 · 일반 빌드/벤치/CI/GPU대체로 전용(轉用) · 재할당

## allgreen-promote — 멀티타깃은 all-green 일 때만 stable
- do: 멀티타깃(OS·arch) stable 승격은 전 타깃 릴리즈잡 GREEN + 설치스모크 GREEN 일 때만(`needs:` 전체 건 `finalize` 잡이 Latest flip) · 실험은 edge 채널로 soak · 규칙은 `release.yml`(CI)이 강제
- dont: 부분 릴리즈를 stable Latest 로 발행 · 한 타깃 그린으로 승격 · 타깃별 잡이 각자 `make_latest`

## poll-max-10m — live 진행건은 ≥10분마다 확인
- do: live tracked 진행건이 하나라도 있으면 ≥10분(600s)마다 상태 확인(`hexa cloud poll/tail`·`sidecar ing show`·`sidecar check`) · 끝나면 즉시 `down`/`ing done` 으로 마커 비우기
- dont: fire-and-forget 방치(idle-burn) · 끝난 잡 안 닫기

## reference-match — 동등 재구현은 정답지를 보고 맞춘다
- do: reference 가 열려있으면(오픈소스·공개스펙·관측가능) 정답지 직접 보고 맞춤 — 소스/스펙 정독(파일:라인 인용)→중간산출물 덤프→성분별 1:1 대조→첫 발산점만 정렬 · parity 후 '초월 축' 1개+ 명시해 전진 · 남는 잔차는 정직히 출처 기록
- dont: 목표값 좇아 입력/플래그 흔드는 black-box 추측(정답지 열렸는데) · parity 에서 멈춤 · 강제로 맞추는 fudge

## wire-to-prod — production 배선까지가 "완료"
- do: 구현 → production 호출경로 배선(wire-in) → 그 위에서 QA 가 완료 · 미배선이면 산출물에 `구현됨·미배선(dead until wired)` 라벨 + 배선 follow-on ID · 배선↔설계 SSOT lockstep · enforcer 있으면 배선 게이트 추가
- dont: 벤치/테스트에서만 호출되는 dead 코드를 "완료"라 하기 · 미배선 함수 단위테스트만 하고 "됐다" · 배선해놓고 설계문서 미갱신(drift)

## canonical-naming — canonical 이름 하나, 버전접미사 금지
- do: 파일·폴더는 그 생태계 canonical native 이름 하나 · 제자리 update-in-place · 진짜 버저닝(공개 API `v1/`/`v2/`)은 `@canonical-ok` 마커로 정당화
- dont: `_v2`·`_final`·`_copy`·`_new`·`_old`·`_orig`·`_bak`·`_draft`·`_fix`·`_wip`·`foo 2`·`foo(1)` 등 이력을 파일명에 박기 (이력은 git)

## native-canonical-first — native·canonical 방식 최우선 (위반 발견 시 개선)
- do: 무언가를 구현·해결할 땐 그 생태계·플랫폼·언어·도구의 **native·canonical(정석) 방식을 최우선**으로 — 표준 primitive/내장 기능/관용 패턴을 먼저 찾아 쓴다 · 그런 native 경로가 없을 때만 직접 구현 (그때도 정답지 있으면 `reference-match`) · 작업 중 native 가 있는데 bespoke 로 우회한 **기존 위반을 발견하면 그 자리에서 native·canonical 로 개선**(surgical 범위 내 · 발견은 묻어두지 말 것)
- dont: native primitive 가 있는데 손수 재구현(reinvent) · canonical 경로 위에 불필요한 wrapper/shim/shadow/monkey-patch/fork 덧대기 · "일단 돌아가니" 비정석 우회를 그대로 방치(발견하고도 미개선) · native 회피를 `@root-cause-ok` 없이 정당화

## tool-self-report — 도구 능력은 그 도구에 물어라
- do: 도구의 서브시스템·능력·가속(GPU)·빌드변종·버전 상태는 그 도구 자신(`<tool> --help`/상태 서브커맨드)으로 확인 (예: hexa GPU 상태 = `hexa gpu`) · 릴리스/CLI 갱신 시 self-report 출력 lockstep
- dont: stale 문서·기억 추측 · repo-내부 README/ARCHITECTURE 로 cross-repo 능력 추정(그 repo 밖에선 안 보임)

## fanout-workflow — 다수 동시 fan-out 은 Workflow 로
- do: 독립작업을 다수 서브에이전트로 동시에(≥3 동시 · `fleet`/`abg`/`gap full`) 펼칠 땐 `Workflow` 도구 한 번으로(동시성 cap+큐잉 + 토큰 budget 공유)
- dont: 한 메시지에 `Agent` 호출 N개 직접 발사(rate-limit 즉사) (예외: 단발 단일 agent · `afg` 순차)
