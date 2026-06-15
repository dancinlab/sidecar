# commons — cross-project governance (MUST FOLLOW · hard rules, not hints)

These are the always-on, project-agnostic rules — the harness governance SSOT. Project-specific
rules live in `.harness/enforcement.json` / `.harness/keywords.json`; a repo may override this
file at `.harness/commons.md`. Most rules are also mechanically enforced by harness hooks — this
block keeps them salient in context.

## c1 — root cause, not workaround
원인을 고친다 (증상 아님). 금지: `@ts-ignore`·`eslint-disable`·빈 catch·`if(false)`·TODO-만-남기기·
shadow 가드. 정당하면 `@root-cause-ok <이유>` 마커 + 코멘트로 justify.

## c2 — verify before "done"
"됐다" 전에 실제 검증을 돌리고 **출력으로** 확인한다 (`harness verify`/build/test). 실패는 실패라고
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
단계실행 `harness sbs` · 실험 스윕 `harness micro-exp` · 검증기록 `harness verdict`. raw curl/우회나
폐기된 sidecar/`hexa cloud` 습관 대신 harness 우선 (없으면 그때 fallback).

## c13 — main-flow return stack (trail)
메인 목표에서 곁가지로 샐 땐 `harness trail push <어디까지 했나>` 로 위치를 남기고, 곁가지 끝나면
`harness trail pop` 으로 복귀한다. repo-root `TRAIL.md`(git-tracked) 에 쌓여 곁가지 타다 원래 작업을
잊는 걸 막는다. 스택 깊어지면(>2) 더 파기 전에 복귀 우선.
