# commons — cross-project governance (MUST FOLLOW · hard rules, not hints)

These are the always-on, project-agnostic rules — the harness governance SSOT. Project-specific
rules live in `.harness/enforcement.json` / `.harness/keywords.json`; a repo may override this
file at `.harness/commons.md`. Most rules are also mechanically enforced by harness hooks — this
block keeps them salient in context.

> 🏛️ **프로젝트 설계는 먼저 `ARCHITECTURE.json` 을 참고하라** — repo-root 의 설계 SSOT(c4).
> `harness architecture inject` 가 SessionStart 에 컨텍스트로 주입하니, 구조·모듈·데이터흐름을 추측하지
> 말고 그 트리를 단일 출처로 읽고, 코드/설계 변경 시 lockstep 으로 갱신한다(c12). 사람이 볼 땐
> `python3 serve.py`(HTML 뷰어). 부재 시에만 코드에서 직접 파악.

## c1 — root cause, not workaround
원인을 고친다 (증상 아님). 금지: `@ts-ignore`·`eslint-disable`·빈 catch·`if(false)`·TODO-만-남기기·
shadow 가드. 정당하면 `@root-cause-ok <이유>` 마커 + 코멘트로 justify.
**수렴진화(재발방지 · hexa `@convergence` attr 양식)**: 같은 결함·실수가 **재발**하면 그 학습을 별도
incident 트래커로 흩지 말고 **결함난 그 코드 파일의 인라인 주석**에 hexa-lang `@convergence` 양식으로 남긴다
(SSOT: hexa-lang `self/convergence_scan.hexa` · `hexa convergence dump <file>` 로 스캔·집계). 단일행 형식:
`// @convergence state=<state> id=<ID> value="<핵심>" threshold="<재발조건/해결>"` — 필수 키 `state`·`id`,
선택 `value`·`threshold`·`rationale`·`ref_commit`·`date` 등. **state**(허용값): `ossified`(굳음·재발방지 확정)·
`stable`·`in_flight`·`pending`(진행)·`completed`·`completed_gap`·`failed`·`blocked`(시도→실패/막힘으로 검증).
`.hexa` 소스는 attr 형식 `@convergence(state="...", id="...", ...)`. 흩어진 `*-incident.md`/별도 레지스트리 금지.
**기계 강제(권고 아님)**: 재발 신호(재발·stale·regression·again·"또 같은"…)가 보이면 keyword 트리거가 마커 작성을
환기하고, `harness convergence scan` 이 모든 인라인 마커의 필수키(state·id)·state enum 을 검증해 불량을
`harness lint` 커밋 게이트가 **CONVERGENCE-MALFORMED(block)** 로 막는다 — 마커는 반드시 well-formed 여야 통과한다.
**캡처-토큰 루프(환기→캡처→강제)**: 재발 트리거가 단순 텍스트 힌트로 그치지 않고 고유 캡처 토큰
`⟦CONVERGENCE-DUE id=… matched="…"⟧` 을 출력하면서 부채(debt)를 기록한다 → 그 세션에서 well-formed
`@convergence` 마커를 코드에 추가하면 post-edit 이 부채를 자동 해소하고, 미해소면 세션 Stop 에서
`harness convergence due-check` 가 1회 환기(warn-only · 거짓양성 가능성 때문에 차단 아님)한다. 즉 "재발을
감지만 하고 마커는 안 쓰는" 누락을 토큰으로 캡처해 닫는다.

## c2 — verify before "done"
"됐다" 전에 실제 검증을 돌리고 **출력으로** 확인한다 (`harness ci`/build/test). 실패는 실패라고
말한다. LLM 자가판정 금지 — 캡처된 명령 출력이 증거. (`harness verdict record` 로 박제 가능.)
**기능 구현/버그픽스 후 전체 QA(필수)**: 그 기능의 **전 서브커맨드·엣지케이스**를 임시 환경에서 전수
실행해 **PASS/FAIL 집계**하고, 발견 버그를 fix 한 뒤 닫는다. 대규모는 명령군별 **병렬 agent** 로 분담.
테스트 하네스 아티팩트(zsh `$var` word-split 미적용 등)로 보이는 실패는 **직접 인자로 교차확인**해
코드/테스트 책임을 가른다(agent 가 준 라인번호 등 추정은 직접 grep 으로 재확인).

## c3 — anti-punt (bypass)
local + reversible + 비파괴 + 유저-전용-입력 아님 → **그냥 실행**한다. 되돌리기 어려움/외부노출/유저
결정일 때만 묻는다. 선택지 박스로 punt 금지 (질문은 평문 채팅으로 — askq-text).

## c4 — single-doc discipline
AI 산출물은 두 문서로 통합: **ARCHITECTURE**(갱신형 SSOT — `.md` 산문 또는 `.json` 트리[+`.html`
뷰어] 중 택1) + **CHANGELOG.md**(append). 흩어진 `*-report/summary/notes` 금지. 부득이 분리 시 상단에
SSOT quickref 1줄. 메인 CLAUDE.md = 프로젝트 설명 + 트리구조(노드별 한 줄).
**ARCHITECTURE = 현재상태 스냅샷, 이력 로그 아님**: "갱신"은 **해당 노드를 제자리 교체**(update-in-place)
하라는 뜻이지 *항목 추가*가 아니다. 트리에 변경이력·버전·날짜·`previous`/`기존엔`/`이전엔…`·`deprecated`
노드를 **남기지 마라** — 트리는 *지금 이 순간의 최종 구조*만 보여야 한다(미래 독자가 "이게 현재다"로 읽음).
이력은 **CHANGELOG.md(append) + git** 이 SSOT. 노드를 바꾸면 옛 서술은 **지우고** 새 서술로 덮어쓴다.
**README 도 같은 규율(현재상태 SSOT · 이력 아님)**: README 는 *지금의* 기능·사용법·구조만 담는 갱신형
문서다 — ARCHITECTURE 처럼 **update-in-place** 하고, 바뀐 서술은 제자리 교체한다. README 에 변경이력·
버전 로그·날짜·`이전엔…`/`deprecated`/"v0.x 에서 추가" 식 누적을 **남기지 마라**(그건 CHANGELOG+git 몫).
즉 doc-gate 가 README 현행화를 요구할 때 "이력 한 줄 덧붙이기"가 아니라 **해당 절을 최종 상태로 덮어쓰기**다.
`.json` 트리 채택 시: JSON 이 SSOT(AI·툴 파싱), 사람은 `.html` 뷰어로 본다 — 로컬은 `python3 serve.py`
(정적 서버 + 브라우저 자동 오픈, `file://` fetch 차단 우회), 원격은 raw.githack.com / GitHub Pages.
**트리로 실제 체계화(한 셀 덤프 금지)**: ARCHITECTURE.json 은 **위계를 `children` 트리로** 표현한다 — 한
노드의 한 컬럼(특히 `상세`/`detail`)에 여러 사실을 ` · `/줄바꿈으로 **이어붙여 욱여넣지 말 것**. 한 셀에
여러 항목이 쌓이면 그건 자식 노드들로 **분해**하는 신호다(예: 모듈의 서브커맨드·필드·실패모드는 각각
child). 컬럼 값은 **그 노드 자체의 짧은 속성**(역할 한 줄·구분 태그)만 담고, 더 깊은 내용은 한 단계 아래
`children` 으로 내린다. 목표: 트리만 훑어도 구조가 드러나고, 깊이 들어갈수록 디테일이 펼쳐지는 **실제 위계**
(평평한 표에 긴 산문을 채운 가짜 트리 금지). 노드가 자식 없이 비대해지면 리팩터 대상.

## c5 — preserve, don't discard · 산출물은 `state/` 하나로
진행/작업 데이터는 휘발 `/tmp` 가 아니라 **git-tracked `state/`** 에 쓰고 커밋한다(GitHub 보존).
실험·벤치마킹·검증기록(verdict/claim)·스크래치 등 **모든 작업 산출물은 repo-root `state/` 폴더 하나로
통일**한다 — 하위 디렉토리로 쪼개지 말고 `state/<id>` 평면 보관(verdict 는 `state/<slug>/<id>.txt`).
흩어진 산출물 디렉토리(`scripts/scratch/`·`.verdicts/`·`bench/`·`experiments/` 등) 신설 금지. 임시물도
버리지 말 것. (재생성 가능한 빌드 결과 `build/` 만 `.gitignore` · 머신 자동로그는 `.harness/`.)

## c6 — ING 단일 보드 (진행추적 · 인계 · 흩뿌리지 말 것)
다단계/장기 작업의 **진행추적**과 세션/크로스레포 **인계**를 repo-root **`ING.jsonl`** 한 보드로 통일한다.
- **진행추적**: `harness ing add <text>`(작업) · `next`(다음) · `pod add`(실행중 GPU pod) · 완료분은
  `harness ing done <id>` = **scrub**(제거 → 완료는 CHANGELOG 로). SessionStart 에 자동 표면화되니 "지금
  뭐 하던 중" 을 남겨라. **상태변동 트리거(파일 변동과 무관)**: 파일이 하나도 안 바뀌어도 작업 **상태**가
  바뀌면(시작·진행단계 전환·블로커·완료·다음 한 수 결정) 그 턴에 보드를 현행화한다(add/next/done).
  **진행보드는 전용 `ing` git ref 에 저장**(`refs/heads/ing` · worktree 파일 아님) — `harness ing` 이
  plumbing 으로 read/write 하고 best-effort `push origin ing` 으로 **공유**한다. worktree 에 없으니 브랜치
  전환·`reset`/`checkout` 에 안 덮이고(전 함정 해소), protected main 도 우회한다. 완료·인계는 CHANGELOG/
  대상 repo 의 `ing` ref 로 보존된다.
- **인계**: 같은 repo 는 `harness ing add <text>`, **타 프로젝트로는 `harness ing add <text> --to <repo>`**
  — 대상 repo 의 `ING.jsonl` 에 `from` 태그를 달아 직접 남기고, 그 repo SessionStart 에 `📥<from>` 으로
  표면화된다. `HANDOFF.md`·`INBOX.md`·`inbox/*.md` 흩뿌리기 금지(handoff-guard 차단).
- 구 `harness handoff`/`handoff.jsonl`, 구 `harness trail`/`TRAIL.md` 는 **폐기** — 모두 ING 로 흡수됨.

## c7 — git safety
force-push 금지(`--force`/`-f`/`--force-with-lease`/refspec `+`). 비밀키/시드 실값 커밋 금지 —
자격증명은 `secret` CLI(인라인·로그 금지). 공유 main 직접 파괴 금지.

## c8 — recommendations = 4 axes
유저에게 추천할 땐 4축(① 완성도 ② 단순 ③ 안전 ④ 표준) 병렬 제시. 고정축 default 면 ★표시 +
auto-pick(결정하고 진행, 대기 금지). 단일 가중합 승자 하나로 뭉개지 말 것.

## c9 — honesty
FALSIFIED/negative 는 **결과**다 — skip·은폐 금지. 없는 근거 지어내기 금지. 모르면 모른다고.

## c10 — surgical changes
요청에 직접 추적되는 변경만. 인접 코드 임의 리팩터·무관 데드코드 삭제 금지. 본인이 만든 고아만 정리.

## c11 — use the canonical CLI (not raw / 우회 habits)
같은 일은 정해진 명령으로: 이미지 `harness imagine` · 리서치(arXiv·yt) `harness research` ·
영상 `harness watch` · 호스트 `harness pool` · LSP `harness lsp` · 자격증명 `harness secret` ·
단계실행 `harness sbs` · 실험 스윕 `harness micro-exp` · 검증명령(빌드/테스트) `harness ci` ·
주장검증(티어 루브릭 🔵🟢🟡🟠🔴⚪) `harness verify` · 검증기록 `harness verdict`.
GPU·학습·deck 은 **hexa** 빌트인으로: **GPU 클라우드 `hexa cloud`** (`hexa cloud run <host> -- <argv...>`,
structured-argv remote dispatch · 31 sub-verbs) · **클라우드 학습잡 `hexa dojo <domain> <slug> '<spec>'`**
(exports/<d>/dojo/<slug>/{.hexa,.py,run.sh}) · **도메인 input deck `hexa deck <domain> <slug> '<spec>'`**
(exports/<d>/decks/<slug>/ · domains: rtsc·nuclear·material·chem·chip·bio). raw curl/우회나 수동
runpod·vast·train 스크립트 습관 대신 위 명령 우선 (없으면 그때 fallback). 실행중 클라우드 작업은
`harness ing pod add` 로 보드 등록.
이 강제는 hint 수준이 아니라 keywords 트리거(gpu/runpod/vast/파인튜닝→`hexa cloud`, 학습잡→`hexa dojo`,
deck/빵틀→`hexa deck`)로도 발화한다.
**항상 PATH 의 글로벌 `harness`·`hexa` 를 써라** — repo 의 `.harness-engine/bin/harness`(서브모듈)는 그
브랜치 핀에 따라 stale 일 수 있어 recommend default·신기능을 못 읽는다. 최신화는 `harness self-update`.

## c12 — every cycle = docs + pr-cycle (필수)
한 작업 사이클을 끝낼 때마다 **반드시**: ① 문서 업데이트 — `CHANGELOG.md`(append) **+** **ARCHITECTURE**
(`.md` 또는 `.json` — 최종 아키텍처 = 갱신형 SSOT, repo 에 있으면 매 사이클 현행화) **+** `README.md`(최신
정보 유지 — repo 에 있으면 매 사이클 현행화) **+** `ING.jsonl`(진행상황 현행화 — repo 에 있으면 완료분
`harness ing done`/다음 단계 갱신) ② **`harness pr-cycle`** 로 push→PR→**검증된 main 머지**(✅ <base> 머지
완료 — 검증됨 블록을 유저에게 그대로 보고). pr-cycle 의 doc-gate 가 CHANGELOG 또는 (존재 시)
ARCHITECTURE·README·ING 미갱신이면 **거부**한다(`--no-doc` 는 진짜 문서 불필요할 때만).
커밋만 쌓고 머지 안 하기·문서 없이 머지하기 금지.
**이 강제는 pr-cycle 뿐 아니라 매 커밋(`harness lint` pre-commit)에서도 동일하게 발화한다** — 의미있는 코드
변경이 staged 인데 CHANGELOG / (존재 시) ARCHITECTURE·README 가 같이 staged 안 됐으면 **commit 차단(block)**.
즉 pr-cycle 을 거치지 않는 모든 작업에도 문서 현행화가 강제된다. 진짜 문서 불필요한 변경만 `git commit --no-verify`.
**매 턴 마감(turn-close) 강제**: 한 턴에 파일이 staged/working tree 로 바뀌었으면 그 변동을 **다음 턴으로
미루지 말고 그 턴에 닫는다**(docs 동반 → commit → push, 사이클 완료면 pr-cycle 까지). "완성될 때까지
묵혀두기" 금지 — **미완성·WIP 여도 무방**: `wip:` 커밋으로라도 그 턴에 push 해 작업 유실·문서 drift 를
막는다(미완성 코드 매턴 강제 OK — 이 repo 정책. c2 검증은 완성 시점에 닫되, 미완을 핑계로 push 를
미루지 않는다). 파일 변동이 staged 인데 그 턴을 커밋 없이 끝내지 말 것.
**갱신 시 보고(필수)**: ARCHITECTURE·ING 은 매 턴 주입되는 턴-마감 게이트 — 코드/설계 변경이 있었으면
그 턴에 해당 노드를 제자리 갱신(ARCHITECTURE)하고 진행상황을 현행화(`harness ing done/add/next`)한 뒤,
응답에 `🏛️ ARCHITECTURE 갱신: …` / `🔵 ING 갱신: …` 한 줄로 **무엇을 바꿨는지 보고**한다. 시켜야만 갱신하지
말고 게이트가 발화하면 자동 수행한다. 단, 변경이 없으면 갱신·보고를 **생략**한다(안 했으면서 했다고 말하지 말 것).
**항상 최신 base 유지(로컬 main 뒤처짐 금지)**: pr-cycle 은 머지 검증 직후 **로컬 base(main) 를
origin/base 로 ff-sync** 한다 — feature 브랜치에서 `git fetch origin <base>:<base>` 로 checkout 전환 없이
로컬 base ref 만 갱신(non-ff 면 거부=안전, working tree 무변). origin 만 갱신하고 로컬 main 을 방치해
"로컬이 한참 뒤처지는" 사태를 만들지 말 것. 새 작업 브랜치는 **항상 최신 base 에서 분기**한다(작업 전
`git fetch origin <base>:<base>` 권장).

## c13 — 논문은 지시 전 선제 언급 금지
유저가 **명시적으로** 논문/arXiv/레퍼런스/선행연구를 요청하기 전에는 논문을 먼저 **언급·제시·추천·
인용하지 않는다**. 일반 작업 응답에 "관련 논문은…" 류 곁다리·근거용 논문 나열 금지. `harness research`
(arXiv 등) 도 유저 지시 시에만 호출. 유저가 요청하면 그때 제시.

## c14 — 벽을 만나면 돌파하라 (closed-negative ≠ 종착) · 벽 분류 먼저
벽(closed-negative · 🧱 · 막힌 블로커)에 부딪히면 거기서 멈추지 말고, 먼저 **어느 종류의 벽인지
분류(taxonomy)**한 뒤 **다른 메커니즘·각도·렌즈로 MULTI-LENS(≥2–3 원리적 렌즈) 이상** 돌파를
시도하고 각각 **통제(shuffle/ablation/negative-control)**로 기각된 뒤에야 terminal 로 받아들인다 —
**한 번 시도로 끝내지 않는다** (단일 렌즈 한 번 막힘은 미완 = 다음 렌즈를 시도). 종류마다 돌파법과
난이도가 다르다:
- **(a) 틀린 측정 / metric-artifact** — 막힌 게 현상이 아니라 지표일 수 있다. 측정 방식·대조부터 의심.
- **(b) 틀린 방향 / 변수 혼재** — 변수가 섞였거나 방향이 틀림. 분리·재설계로 푼다.
- **(c) substrate / 인프라 벽** (OOM · 빌드실패 · 툴링 한계) — **근본 수정(c1) 대상이지 천장이 아니다**.
  인프라/측정 벽을 과학·성능 ceiling 으로 **박제 금지** — substrate 가 돈 뒤에야 verdict 를 읽는다.
- **(d) 진짜 천장 / 중복(subsumption)** — 가정 말고 **측정**한다(예: oracle-ceiling vs richer-signal 대조).
  CONFIDENT-terminal 로 받으려면 **MULTI-LENS** — 진짜 다른 원리적 렌즈를 ≥2–3개 시도하고 각각
  **통제(shuffle/ablation/negative-control)**로 기각된 뒤에야 천장 확정. 단일 렌즈 한 번 막힘은 미완
  (다음 렌즈를 시도). **ABLATION** 이 천장-확정의 결정적 도구 — 그 메커니즘만 OFF 했을 때 결과가
  동일하면 그 메커니즘은 INERT(기여 없음) = 천장의 강한 증거.
  **★ 게으른 천장(lazy ceiling) 금지 — 특히 성능/하드웨어 천장**: "하드웨어 한계라 끝"은 ⓐ deep
  research(arxiv/문헌 census)로 미시도 **알고리즘** 레버를 cite 로 census(파라미터 sweep 아님) → ⓑ
  그 레버를 **측정(c2)으로 검증** → ⓒ 인용된 레버를 전부 시도/falsify 한 뒤에만 terminal 🧱. 1-pass
  직관 "하드웨어 천장" 박제 = 게으른 천장(c2 자가판정 금지의 한 형태). 흔한 함정 = **잘못된 축
  (wrong-axis)** — 캡이 가정한 축이 아닐 수 있어 research 가 우회 후보를 드러낸다. **단, research 가
  찾은 우회로도 측정이 최종 심판이다(연구 가설 ≠ 확정 · c2)**: 실증(forge sm_120 TF32 "0.87×
  FP32-accum 천장") — research 가 FP16-accum 분할보상[Ozaki/3xTF32, arxiv 2203.03341] 우회를 제시
  → GPU 측정이 정밀화: **정확도 ~400× 향상**(FP32-equiv·deterministic moat)이나 **속도 1.5–1.8×
  더 느림** = 그 카드 FP16:TF32 비가 ~1.8× 뿐(datacenter 2–4× 가정이 consumer 미적용) → 속도-우회는
  **hardware-dependent, 5070 에선 closed**(measured root-cause). 즉 research 는 게으른 프레임을 깨고
  미시도 레버를 드러내되, terminal 은 측정-falsify 후에만(남은 레버 = Ozaki-INT8 n≥8K). 진짜 천장도
  흔히 **양쪽이 같은 캡 공유** → "parity 도달, 너머는 구조 레버(fusion·결정성)" 가 정직한 종착이지
  "미달"이 아니다. **★ mechanism-family census (dry 의 정의)**: "N 레버 falsify → 🧱" 인데 그 N 개가
  **같은 family** 면 dry 아님 — 직교 family 를 안 본 것이다(실증: TF32 "하드웨어 천장" 은 precision-emulation
  family[FP16-split·INT8-split·scheduling]만 소진한 착각이었고, megakernel·Stream-K·sparsity·sub-cubic
  family 가 미탐색 → reopen 후 두 벽이 parity/추월로 닫혔다). 그러니 dry 선언 전 **직교 매커니즘 family
  를 enumerate(cite)** 하고 각 family 를 falsify 한다 — 한 family 소진은 reopen 대상이지 종착 아님.
- **(e) 투자 부족** — 스케일업(compute/data). 무거운 작업은 c15 대로 pool/`hexa cloud` 로 분산.

벽은 흔히 (1) 틀린 방법 (2) 틀린 방향 (3) 부족한 투자이지 진짜 천장이 아니다 — 표면 처방을 바꾸기
전에 "이 막힘의 진짜 원인은 무엇이고, 다른 substrate/도메인 렌즈에선 어떻게 푸나"를 먼저 묻는다.
**LAW(법칙)도 벽이다** — 여러 결과에서 사후로 맞춘 descriptive 법칙을 '확정'이라 부르기 전에, *새
케이스*로 그 법칙의 예측을 측정 전 **사전등록(frozen)**하고 실측 대조로 falsify 시도한다. 미달이면
법칙 FALSIFIED 가 유효 결과다(MISS 가 진짜 결정자를 드러냄). 사후맞춤 법칙을 예측-검증 없이 박제 금지.
**단, tune-to-green 금지 (c9·p7)**: 돌파는 사전등록(frozen-first) + 대조(shuffle/dissociation/
negative-control)로 검증된 진짜 새 각도라야 하며, 그런 진짜 시도 뒤의 정직한 🧱(terminal)도 유효한
결과다. 한 번 막혔다고 포기·우회·축소하지 말 것.

## c15 — 무거운 작업은 pool(공유자원)에서
빌드·테스트·대규모 스윕·장시간 연산 등 **무거운 작업**은 로컬 단일 머신에서 묶어 돌리지 말고
`harness pool` 로 등록된 **공유 컴퓨트 호스트**에서 돌린다 (`harness pool on <host> <cmd…>` ·
백그라운드는 `pool bg` · 최적 호스트 선택은 `pool route` · 가용성은 `pool status`/`health`). 한 호스트에
부하를 몰지 말고 pool 에 분산해 공유자원을 활용한다. `shared:false` 로 표시된 제한 호스트는 공유 풀
컴퓨트로 쓰지 않는다(가드가 차단). GPU·학습은 c11 대로 `hexa cloud`/`hexa dojo` 우선.

## c16 — 우회경로는 지시 전 작성 금지 (escape-hatch only on request)
유저가 **명시적으로** 요청하기 전에는 구현 시 **우회경로**를 만들지 않는다. 우회경로 =
exception/bypass 마커(`# *-ok` 류) · opt-out 플래그 · skip 조건 · fallback 분기 · 가드를 무력화하는
탈출구 — 금지·차단을 요청받으면 **글자 그대로 전면 차단**으로 구현하고, "정당한 예외를 위해" 빠져나갈
구멍을 임의로 끼워 넣지 않는다. 우회가 실제로 필요해 보여도 먼저 정공법(예외 없는 차단/직접 구현)으로
짓고, 탈출구는 유저가 따로 요청할 때만 추가한다. c1(근본수정·shadow 가드 금지)·c3(anti-punt)·c9(정직)의
연장선 — "혹시 몰라서" 남기는 뒷문이 곧 우회습관. 이미 있는 마커 탈출구(force-push `# force-ok` 등)는
기존 규칙이라 유지하되, **새로** 만드는 차단·가드·정책에는 기본적으로 우회구멍을 두지 않는다.

## c17 — upstream 막힘: 그 세션에서 직접 fix (현재작업은 ING 박제 → 복원)
작업이 의존하는 **upstream**(특히 `hexa`/`hexa-lang`, 그 외 dancinlab 소유 repo)의 버그·한계·미지원에
막히면 — **인계로 미루지 말고 그 세션에서 직접 고친다**(코어든 응용이든). 로컬 wrapper·shadow·fork·
monkey-patch 로 **덮지 말고** 그 upstream repo 를 **직접 고쳐 `harness pr-cycle` 로 정식 머지**한다 (c1·c16
우회금지의 연장 · "남의 코드"라 미루지 말 것 · 진짜 원인이 upstream 이면 거기서 고치는 게 근본 수정).
컴파일러·런타임 substrate(codegen · runtime.a · byteeq · toolchain 등) 같은 **다세션 고위험 지대는 격리
worktree**(`git worktree add`)에서 작업하고 동시 세션 활동 감지 시 STOP(c7·c9) — 충돌은 **인계가 아니라 격리**로 피한다.
**fix 가 길어질 수 있으니 중단되는 현재 작업을 먼저 ING 에 박제한다**: `harness ing add "↩resume <작업>:
<어디까지·왜 멈췄나·다음 한 수>"`. ING 은 전용 `ing` ref(c6)라 fix 중 브랜치 전환·세션 경계를 넘어도
보존되고, `↩` 로 시작하는 resume 항목은 `ing show`/SessionStart inject 에서 **맨 앞에 표면화**된다. upstream
fix 머지 후 그 resume 항목을 보고 원래 작업을 재개하고 `harness ing done <id>` 로 닫는다(완료는 CHANGELOG).
cross-repo 인계(`ing add --to <repo>`)는 **다른 세션/사람에게 진짜 넘길 때**만 — 내가 막힌 건 내가 고친다.

## c18 — 릴리즈는 semver 태그 → CI 자산 배포 (수동 빌드·업로드 금지)
사용자에게 **배포되는 산출물**(컴파일러·바이너리·패키지·CLI·모델 등)이 있는 repo 는 릴리즈를 다음으로 통일한다:
- **semver 태그**(`vMAJOR.MINOR.PATCH`)를 검증된 main 에 끊는 것이 릴리즈의 **단일 진입점**(태그 = SSOT).
  버전 bump·태그를 손으로 중구난방 만들지 말고, 머지된 main 에서만 태그를 끊는다(미검증 커밋에 태그 금지).
- 태그 push 를 **`.github/workflows/release.yml`(CI)** 가 받아 타깃별 빌드 자산을 만들고 **GitHub release 로
  업로드**한다 — `install.sh`/패키지매니저가 그 자산을 verbatim 으로 받는다. 로컬 수동 빌드→수동 업로드 금지.
  릴리즈 게이트(예: hexa-lang `release-runtime-compile-gate.yml` 의 byteeq/compile 검증)를 통과해야 배포된다.
- (선택) main push 마다 **롤링 `edge` prerelease** 로 최신 빌드를 흘려보낼 수 있다(예: `HEXA_VERSION=edge` 설치).
- 릴리즈는 c12(매 사이클 머지)와 **별개 단계** — 코드 머지가 끝난 뒤 버전을 끊는다(커밋만 쌓고 릴리즈 안 하기 금지).
**표준 예시**: `hexa-lang`(`v0.240.x` · release.yml + compile-gate + edge) · `anima`(`v3.54.x` 잦은 patch 태그).
버전·배포는 사람 손이 아니라 **태그 + CI** 로 — 재현 가능성·자산 일관성·설치 경로(install.sh) 안정성을 위해서다.
(학술 아카이브/DOI·논문 릴리즈 류는 이 규칙 밖 — 여기서 말하는 릴리즈는 **실제 배포 산출물**만 가리킨다.)

## c19 — 외부 장기 진행건 폴링은 ≥30분 (서브에이전트 위임 아닐 때)
외부에서 오래 도는 진행건 — GPU **pod**(학습·빌드) · 원격 **r2/measure** 류 long-run 실험·벤치 · 클라우드
잡 등 — 의 상태를, **서브에이전트(Agent)에 위임하지 않고** 메인 세션이 직접 폴링(`ScheduleWakeup` 등)
한다면 폴링 주기는 **최소 30분(1800s)** 으로 둔다. 분 단위로 깨우지 말 것 — 이런 작업은 분 단위로 안 바뀌고,
짧은 간격 반복은 프롬프트 캐시(5분 TTL)를 매번 깨 비용·지연만 키운다. 진행건은 `harness ing pod`/ING(c6)에
등록해두고, 폴링은 ≥30분 간격으로 **상태만** 확인한다. (CI·배포 큐처럼 분 단위로 빠르게 끝나는 건 예외 — 그건
짧게.) 가능하면 폴링 자체를 **서브에이전트**(worktree 격리)에 맡겨 메인 세션을 비운다.

**위임한 장수 agent 의 상태를 읽는 법 (재-ping 이 진행을 죽인다 · 실전 박제)**: 측정/빌드를 도는
background Agent 는 **느린 게 멈춘 게 아니다** — 무거운 측정(large-n GEMM·전수 sweep·원격 빌드)은 수십 분이
정상이고, Monitor-wait 재-arm 통지를 "stall/zombie" 로 오판해 죽이지 말 것. ⓐ **재-ping/resume/SendMessage
금지**: live agent 를 건드리면 매번 resume = **진행 리셋 + "아직 warming up" 재보고** 의 무한루프 — 조급한
ping 이 stall 의 *원인* 이 된다. 자연 완료를 기다린다. ⓑ **의심되면 ping 대신 ground-truth**: 막혔는지
확인하려면 추정 말고 호스트에 직접 들어가 실측(`pool on <host> 'pgrep -af <job>; nvidia-smi; tail <log>'`) —
"막힌 agent" 추정 대신 ps 한 번이 원인을 규명한다(실전: "8회 stall" 이 사실 CPU 99.9%/GPU 0% 의 bench
설계결함이었다). ⓒ **"came to rest" ≠ 결과**: 빈/idle 출력으로 쉰 통지는 terminal 아님 — 산출(브랜치
커밋·로그 수치)을 직접 회수하고, 수치 없는 landing 은 **미완**(c2, 다음 단계 전진 금지). ⓓ **stale 중복
통지 검증**: 늦게 온 "came to rest" 는 이미 머지/superseded 일 수 있다 — **현재 main/SSOT 와 대조 후에만**
행동(구 방향 브랜치 무검증 머지 = 방금 고친 걸 되돌림). ⓔ **체크포인트 = 재개 전제**: agent 산출은 죽기 전
브랜치 push 로 보존돼야 "재시작" 아닌 "재개" 가 된다 — 재개는 좁은 범위(증명+수치 회수)로 재발사해
throttle 회피.

## c20 — Pi5-Akida 는 anima 뉴로모픽 실험 전용 (공유자원 활용 금지)
**Raspberry Pi 5 + Akida 뉴로모픽 칩**(`pi5-akida`) 하드웨어는 **anima 의 뉴로모픽 실험 전용**이다 — 그
외 어떤 용도로도 **공유·재할당 금지**. 공용 `pool` 자원·일반 빌드/벤치/CI 러너·GPU 대체 등으로 쓰지 말고,
`harness pool` 로스터 등 **공유 풀에 등록하지 말 것**. anima 뉴로모픽 실험 컨텍스트가 아니면 이 장치를
건드리지 않는다(뉴로모픽 워크로드의 전용 실험 환경 보존 — 공용화하면 그 실험 재현성이 깨진다).

## c21 — 멀티타깃 릴리즈 = all-green 승격 게이트 (부분 릴리즈 = stable 금지)
여러 타깃(OS·arch)으로 배포하는 repo 의 **stable 승격**은 **전 타깃이 GREEN 일 때만** 한다(c18 의 다음 단계).
- **채널 분리**: 실험(self-host·byteeq·measure·리팩터)은 `main` push → **edge prerelease**(`HEXA_VERSION=edge`
  류)로 상시 흘린다. 소비자 기본 경로(`install.sh` → 최신 **stable** `vX.Y.Z`)는 **전 타깃 릴리즈 잡 GREEN +
  설치 스모크 GREEN** 일 때만 새 stable 로 승격한다. "실험은 edge 에서 soak, stable 은 전타깃 green 승격."
- **"한 타깃 green = 승격 불가"**: 타깃별 잡이 **각자 독립적으로** `make_latest`/publish 하면, 한 타깃이 깨져도
  먼저 끝난 잡이 부분 릴리즈를 Latest 로 마킹한다. **기계적 강제**: 플랫폼 잡은 asset 을 **prerelease 로만**
  올리고, `needs:` 전 타깃을 건 **`finalize` 잡이 전부 성공 시에만** stable Latest 로 flip 한다(한 타깃 실패 →
  finalize skip → 릴리즈가 prerelease 로 남아 `install.sh` stable 해석이 부분 릴리즈를 건너뜀).
- 규칙을 문서로만 두지 말고 **CI(release.yml)가 강제**하게 한다(doc↔mechanism lockstep).
**왜**: hexa-lang v0.241.0/.1 에서 arm64 가 SIGSEGV 로 깨졌는데 x86+darwin 이 2/3 asset 으로 stable Latest 를
발행 → 소비자(anima)가 OS 별로 부분 릴리즈를 물어 트러블슈팅 무한반복. 한 타깃 그린은 전체 그린이 아니다.

## c22 — live 장기-진행건은 ≥10분마다 확인 (방치 금지 · c19 의 반대)
긴 잡(**GPU pod**·백그라운드 **에이전트/ledger 작업**·기타 long-runner)을 **띄워놓고 안 보는 것**을 막는다 —
fire-and-forget 는 idle-burn(비용) + 결과 미회수로 이어진다. c19 가 폴링을 **너무 자주** 하는 걸 막는다면
(min 간격), c22 는 **아예 안 하는 것**을 막는다(max 침묵). live 한 tracked 진행건이 하나라도 있으면 **최소
10분(`poll.maxSilenceSec`=600s)에 한 번**은 상태를 확인한다 — `hexa cloud poll/tail`·`harness ing show`·
`harness check` 등. 끝났으면 즉시 `hexa cloud down`/`harness ing done` 으로 닫아 마커를 비운다.
**기계적 강제(heartbeat-guard)**: 상태확인 명령을 돌리면 `lastPoll` 하트비트가 찍히고, `post bash`(에이전트
활동)·`ing inject`(세션시작)에서 live 진행건이 있는데 마지막 확인이 `maxSilenceSec` 을 넘었으면 경고한다(warn).
**자동 추적(등록 안 해도)**: `ing pod add`/ledger 등록을 건너뛰고 `&`/`nohup`/`disown`/`setsid` 로 그냥 던진
fire-and-forget long-runner(`claude -p`·`hexa cloud`·`torchrun`·`runpodctl`·training 등)는 `post bash` 가
명령에서 자동 감지해 추적 대상으로 등록한다 — 종료를 관측할 수 없으니 2h TTL 로 자동 만료(끝난 잡이 영원히 잔소리하지 않게).
c19 와 짝: c19=과다폴링 차단(block), c22=미폴링/방치 경고(warn).

## c23 — 동등-재구현은 정답지(reference)를 보고 맞춘다 (white-box 차분 · black-box 추측 금지)
어떤 **기존 구현(reference)과 동등한 동작·출력**을 목표로 무언가를 다시 만들 때 — 라이브러리·도구·알고리즘의
포팅/재구현, 다른 구현의 출력 매칭, 스펙·표준·프로토콜의 준수 구현, 수치·결과 재현 등 — 그 reference 가
**읽을 수 있거나(오픈소스·공개스펙) 중간 상태를 관찰·덤프 가능**하면 **정답지를 직접 보고 맞춘다.** 목표
출력/값을 좇아 입력·파라미터·플래그를 흔드는 **black-box 추측은 금지**(시간·자원 낭비 + tune-to-green 위험).
대신: (1) reference 소스/스펙을 정독해 정확한 로직을 추출(파일:라인·조항 인용) (2) reference 의 **중간 산출물**
(intermediate state — 중간 변수·로그·자료구조·값)을 실행해 덤프 (3) 내 구현의 같은 지점과 **성분별 1:1 대조**해
**첫 발산 지점**을 특정(c1 root-cause) (4) **그 지점만** reference 에 정렬. 정답지를 못 보는 경우
(closed-source·관측불가)에만 black-box 로 내려간다. **정직(c2)**: 정답지를 정확히 복제했는데도 잔차가 남으면
강제로 맞추지 말고 그 잔차의 정직한 출처(환경·버전·정밀도·플랫폼 차 등)를 기록한다 — "정답지 보고 맞춤"은
**정렬이지 fudge 가 아니다.** 추측 sweep 을 N 라운드 돌리기 전에 **"정답지가 열려 있나?"를 먼저 묻는다.**
**그 다음 — 동등(parity)은 발판이지 종착이 아니다**: reference 와 정합(≤허용오차)을 달성하면 거기서 멈추지
말고, 그 **검증된 정합을 토대로** reference 를 **넘어서는 방향**을 탐색한다 — 더 빠르게(perf)·reference 의
근사/한계를 넘는 정밀·reference 가 못 다루는 케이스/도메인으로 확장·reference 에 없는 새 역량. 정답지를
베끼는 것은 **신뢰를 얻는 1회 앵커**일 뿐(이미 알려진 것의 재현 자체는 성과가 아니다) — 진짜 가치는 그 앵커
위에서 만드는 **Δ(개선·확장·초월)**. 즉 "동등 확인 → 멈춤"이 아니라 **"동등 확인 → 넘어설 축을 정해 전진"**.
parity 직후 **다음 한 수로 '초월 축'을 1개 이상 명시**하고(없으면 그게 신호 — 왜 못 넘는지 분석), 그것을
새 verify 대상으로 박제한다 (reference 와의 잔차가 reference 의 근사/정의 때문이면, 그 근사를 **넘어서는** 것이
초월 축이다).

## c24 — 구현은 production 배선까지가 "완료" (unwired/dead 금지 → 배선 후 QA)
어떤 기능·최적화·함수·경로를 **구현**했으면 그 자체로 끝이 아니다 — 실제 **production 호출 경로(진짜 사용처)에
배선(wire-in)** 해서 그 코드가 실행에 타도록 해야 "완료"다. 벤치·테스트·예제에서만 호출되고 production 이 안
쓰면 그것은 **미배선 dead 코드**이지 "구현됨"이 아니다. **순서를 지킨다: 구현 → production 배선 → 그 다음
QA(c2 전수)** — QA 는 배선된 production 경로 위에서 돌려 실제 사용 형태를 검증한다(미배선 함수만 단위테스트하고
"됐다" 금지). 구현 PR 은 둘 중 하나를 만족: (a) 그 코드를 **호출하는 production seam 변경을 동반**(같은/후속 PR),
또는 (b) **아직 미배선인 이유 + 배선 follow-on 추적 ID**를 명시. **정직(c9)**: 미배선이면 산출물에
`구현됨·미배선(dead until wired)` 으로 정확히 라벨 — "기능 추가됨/완료"로 일반화 금지(실패모드 precedent: 함수가
production davidson 에 배선 안 된 채 벤치만 있어 후속 감사가 "dead·미구현"으로 오인 → 구현·측정 자산이 묻힘).
**배선 ↔ 설계 SSOT(ARCHITECTURE.json 등)는 lockstep**(c4·c12) — 배선해놓고 설계문서 미갱신(drift)도 미완.
이미 코드강제가 있는 프로젝트는 그 enforcer 에 배선 게이트를 추가한다(예: anima `a_verified_must_wire` ·
`tool/enforce_anima_gates.py` — GREEN=배선까지 done 의 기계적 차단). d4(generic dispatch 배선)·c2(verify)와 한 묶음.

## c25 — 파일·폴더 이름은 canonical native, 버전접미사 금지 (이력은 git · 단일파일 update-in-place)
파일·디렉터리 이름은 그 언어/생태계의 **canonical native 관례**를 따른다 — 군더더기 없는 의미 이름 하나.
**버전·복사 접미사 금지**: `_v2`·`_v12`·`_final`·`_copy`·`_new`·`_old`·`_orig`·`_bak`·`_backup`·`_draft`·
`_fix`·`_wip`·`foo 2`·`foo(1)` 처럼 **이력을 파일명에 박는** 이름을 새로 만들지 마라. 그건 git 의 일이다 —
옛 버전은 `git log`/`git blame`/`git show` 로 복원되고, 워킹트리에는 **canonical 파일 하나만** 두고
**제자리 업데이트(update-in-place)** 한다(c4 의 문서 규율을 모든 파일로 일반화). 새 버전 파일을 만들면 stale
sibling 더미가 쌓여 무엇이 진짜인지 흐려진다. 진짜로 의도된 이름(예: 공개 API 의 실제 버저닝 `v1/`/`v2/`)은
파일에 `@canonical-ok` 마커로 정당화한다. **기계 강제(naming-guard)**: `pre write` 가 버전/복사 접미사
파일명을 감지하면 **NAMING-VERSION-SUFFIX 경고(warn)** 로 canonical 이름 + 단일파일 업데이트를 환기한다(차단 아님 · `@canonical-ok` 로 면제).

## c26 — 도구의 능력·상태는 그 도구에 물어라 (바이너리 self-report = cross-repo 인지 SSOT)
프로젝트가 CLI 도구를 ship 하면, 그 도구의 **서브시스템·능력·가속(GPU)·빌드변종·버전** 상태는 stale 문서나
기억 추측이 아니라 **그 도구 자신**(`<tool> --help`, 또는 상태 서브커맨드)으로 확인한다 — 바이너리에 실린
출력은 그 **설치본의 현재 진실**이라 **타 repo 에서도 정확히 인지**된다(repo-내부 README/ARCHITECTURE 는
그 repo 밖에선 안 보여 cross-repo 인지가 깨진다 · 바이너리 self-report 는 어디서든 보인다).
**hexa 적용**: flame(native 학습엔진)·forge(GPU 커널 — own-default, cuBLAS=opt-in `HEXA_USE_CUBLAS`)·
hexa-cuda(릴리스 빌드변종 — `cuda_available()=1` 은 `-cuda` 자산에서만) 의 상태·GPU parity 는
**`hexa gpu`**(동적: cuda_available + 켜진 커널 + 플래그)·`hexa --help` 가 SSOT. anima 등 타 repo 에서
"GPU 켜졌나 / own-GEMM parity / 어느 릴리스에 들어갔나" 를 **추측하지 말고 `hexa gpu` 를 실행**해 확인한다.
도구쪽 lockstep(릴리스/CLI 갱신 시 `--help`/`gpu` 출력 동반 갱신 의무)은 그 도구 repo 의 governance 가 강제.

## c27 — 다수 동시 서브에이전트 fan-out 은 Workflow 로 (rate-limit 사망 방지)
독립 작업을 **여러 서브에이전트로 동시에** 펼칠 땐(대략 **≥3 동시**, 또는 `fleet`·`abg`·`gap full`·`cycle-all`
같은 배치 fan-out) 메시지 하나에 `Agent` 호출을 N개 직접 쏘지 말고 **`Workflow` 도구 한 번**으로 라우팅한다.
**이유**: 동시 `Agent` 스트림 N개 = 계정 대상 동시 API 요청 N개 → **rate-limit 으로 즉사**한다. `Workflow` 는
동시성을 **min(16, cores−2) 로 cap + 초과분 큐잉**하고, **토큰 budget 하나를 공유**하며, 배치 완료 시 알림 1회로
끝나므로 — 동시 스트림 폭주를 구조적으로 막는다. **예외(Workflow 불필요)**: ① 단발 단일 agent, ② `afg`
(순차·포그라운드 — 한 번에 하나라 동시성 0). **fleet 의 fire-on-arrival**: 영구 반응 루프는 메인 루프 스파인을
유지하되, **다수 레인 동시 발사 배치만 Workflow 로 묶고**(cap+queue 적용) 단일 레인 재발사는 그대로 `Agent`
1개로 둔다 — 핵심 불변식은 **동시 라이브 서브에이전트 스트림이 cap 을 넘지 않는 것**. (슬래시 fan-out 명령
호출 = Workflow opt-in 충족.)
