# commons — cross-project governance (MUST FOLLOW · hard rules, not hints)

These are the always-on, project-agnostic rules — the harness governance SSOT. Project-specific
rules live in `.harness/enforcement.json` / `.harness/keywords.json`; a repo may override this
file at `.harness/commons.md`. Most rules are also mechanically enforced by harness hooks — this
block keeps them salient in context.

## c1 — root cause, not workaround
원인을 고친다 (증상 아님). 금지: `@ts-ignore`·`eslint-disable`·빈 catch·`if(false)`·TODO-만-남기기·
shadow 가드. 정당하면 `@root-cause-ok <이유>` 마커 + 코멘트로 justify.

## c2 — verify before "done"
"됐다" 전에 실제 검증을 돌리고 **출력으로** 확인한다 (`harness ci`/build/test). 실패는 실패라고
말한다. LLM 자가판정 금지 — 캡처된 명령 출력이 증거. (`harness verdict record` 로 박제 가능.)

## c3 — anti-punt (bypass)
local + reversible + 비파괴 + 유저-전용-입력 아님 → **그냥 실행**한다. 되돌리기 어려움/외부노출/유저
결정일 때만 묻는다. 선택지 박스로 punt 금지 (질문은 평문 채팅으로 — askq-text).

## c4 — single-doc discipline
AI 산출물은 두 문서로 통합: **ARCHITECTURE.md**(갱신형 SSOT) + **CHANGELOG.md**(append). 흩어진
`*-report/summary/notes` 금지. 부득이 분리 시 상단에 SSOT quickref 1줄. 메인 CLAUDE.md = 프로젝트
설명 + 트리구조(노드별 한 줄).

## c5 — preserve, don't discard
진행/작업 데이터는 휘발 `/tmp` 가 아니라 git-tracked 경로(`scripts/scratch/`)에 쓰고 커밋한다
(GitHub 보존). 임시물도 버리지 말 것.

## c6 — handoff via registry, not scatter
세션/크로스레포 인수인계는 repo-root **`handoff.jsonl`**(`harness handoff add`). `HANDOFF.md`·
`INBOX.md`·`inbox/*.md` 흩뿌리기 금지. 완료분은 done = scrub(제거).

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

## c11 — track in-progress (ING)
다단계/장기 작업은 repo-root **`ING.jsonl`** 에 추적: `harness ing add <text>` (작업) · `next` (다음) ·
`pod add` (실행중 GPU pod). 완료분은 `harness ing done <id>` = **scrub**(제거 → 완료는 CHANGELOG 로).
SessionStart 에 자동 표면화되니 "지금 뭐 하던 중" 을 ING 에 남겨라.

## c12 — use the harness CLI (not raw / sidecar habits)
같은 일은 harness 명령으로: 이미지 `harness imagine` · 리서치(arXiv·yt) `harness research` ·
영상 `harness watch` · 호스트 `harness pool` · LSP `harness lsp` · 자격증명 `harness secret` ·
단계실행 `harness sbs` · 실험 스윕 `harness micro-exp` · 검증명령(빌드/테스트) `harness ci` ·
주장검증(티어 루브릭 🔵🟢🟡🟠🔴⚪) `harness verify` · 검증기록 `harness verdict` ·
**GPU 클라우드 `harness pod`** (preflight→fire→poll→harvest→down, cost-gated) ·
**설계-아키텍처 `harness demi`** (7-verb) · **클라우드 학습잡 `harness dojo <slug>`**. raw curl/우회나
폐기된 sidecar/`hexa cloud`·수동 runpod·vast·train 스크립트 습관 대신 harness 우선 (없으면 그때 fallback).
이 강제는 hint 수준이 아니라 keywords 트리거(gpu/runpod/vast/파인튜닝→pod, 설계→demi, 학습잡→dojo)로도 발화한다.
**항상 PATH 의 글로벌 `harness` 를 써라** — repo 의 `.harness-engine/bin/harness`(서브모듈)는 그 브랜치
핀에 따라 stale 일 수 있어 recommend default·신기능을 못 읽는다. 최신화는 `harness self-update`.

## c13 — main-flow return stack (trail)
메인 목표에서 곁가지로 샐 땐 `harness trail push <어디까지 했나>` 로 위치를 남기고, 곁가지 끝나면
`harness trail pop` 으로 복귀한다. repo-root `TRAIL.md`(git-tracked) 에 쌓여 곁가지 타다 원래 작업을
잊는 걸 막는다. 스택 깊어지면(>2) 더 파기 전에 복귀 우선.

## c14 — every cycle = docs + pr-cycle (필수)
한 작업 사이클을 끝낼 때마다 **반드시**: ① 문서 업데이트 — `CHANGELOG.md`(append) **+** `ARCHITECTURE.md`
(최종 아키텍처 = 갱신형 SSOT, repo 에 있으면 매 사이클 현행화) **+** `README.md`(최신 정보 유지 — repo 에
있으면 매 사이클 현행화) ② **`harness pr-cycle`** 로 push→PR→**검증된 main 머지**(✅ <base> 머지 완료 —
검증됨 블록을 유저에게 그대로 보고). pr-cycle 의 doc-gate 가 CHANGELOG 또는 (존재 시) ARCHITECTURE·README
미갱신이면 **거부**한다(`--no-doc` 는 진짜 문서 불필요할 때만).
커밋만 쌓고 머지 안 하기·문서 없이 머지하기 금지.
**이 강제는 pr-cycle 뿐 아니라 매 커밋(`harness lint` pre-commit)에서도 동일하게 발화한다** — 의미있는 코드
변경이 staged 인데 CHANGELOG / (존재 시) ARCHITECTURE·README 가 같이 staged 안 됐으면 **commit 차단(block)**.
즉 pr-cycle 을 거치지 않는 모든 작업에도 문서 현행화가 강제된다. 진짜 문서 불필요한 변경만 `git commit --no-verify`.

## c15 — 논문은 지시 전 선제 언급 금지
유저가 **명시적으로** 논문/arXiv/레퍼런스/선행연구를 요청하기 전에는 논문을 먼저 **언급·제시·추천·
인용하지 않는다**. 일반 작업 응답에 "관련 논문은…" 류 곁다리·근거용 논문 나열 금지. `harness research`
(arXiv 등) 도 유저 지시 시에만 호출. 유저가 요청하면 그때 제시.

## c16 — 벽을 만나면 돌파하라 (closed-negative ≠ 종착)
벽(closed-negative · 🧱 · 막힌 블로커)에 부딪히면 거기서 멈추지 말고, **다른 메커니즘·각도·렌즈**로
돌파를 한 번은 시도한 뒤에야 terminal 로 받아들인다. 벽은 흔히 (1) 틀린 방법 (2) 틀린 방향
(3) 부족한 투자이지 진짜 천장이 아니다 — 표면 처방을 바꾸기 전에 "이 막힘의 진짜 원인은 무엇이고,
다른 substrate/도메인 렌즈에선 어떻게 푸나"를 먼저 묻는다. **단, tune-to-green 금지 (c9·p7)**:
돌파는 사전등록(frozen-first) + 대조(shuffle/dissociation/negative-control)로 검증된 진짜 새 각도라야
하며, 그런 진짜 시도 뒤의 정직한 🧱(terminal)도 유효한 결과다. 한 번 막혔다고 포기·우회·축소하지 말 것.
