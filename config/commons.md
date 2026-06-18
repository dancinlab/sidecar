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

## c2 — verify before "done"
"됐다" 전에 실제 검증을 돌리고 **출력으로** 확인한다 (`harness ci`/build/test). 실패는 실패라고
말한다. LLM 자가판정 금지 — 캡처된 명령 출력이 증거. (`harness verdict record` 로 박제 가능.)

## c3 — anti-punt (bypass)
local + reversible + 비파괴 + 유저-전용-입력 아님 → **그냥 실행**한다. 되돌리기 어려움/외부노출/유저
결정일 때만 묻는다. 선택지 박스로 punt 금지 (질문은 평문 채팅으로 — askq-text).

## c4 — single-doc discipline
AI 산출물은 두 문서로 통합: **ARCHITECTURE**(갱신형 SSOT — `.md` 산문 또는 `.json` 트리[+`.html`
뷰어] 중 택1) + **CHANGELOG.md**(append). 흩어진 `*-report/summary/notes` 금지. 부득이 분리 시 상단에
SSOT quickref 1줄. 메인 CLAUDE.md = 프로젝트 설명 + 트리구조(노드별 한 줄).
`.json` 트리 채택 시: JSON 이 SSOT(AI·툴 파싱), 사람은 `.html` 뷰어로 본다 — 로컬은 `python3 serve.py`
(정적 서버 + 브라우저 자동 오픈, `file://` fetch 차단 우회), 원격은 raw.githack.com / GitHub Pages.

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
  바뀌면(시작·진행단계 전환·블로커·완료·다음 한 수 결정) 그 턴에 보드를 현행화한다(add/next/done). ING 는
  커밋 불필요(빠른 갱신), 의미있는 코드 변동은 c12 로 닫는다.
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

## c17 — upstream 막힘: 컴파일/런타임 코어는 ING 로, 그 외는 직접 fix
작업이 의존하는 **upstream**(특히 `hexa`/`hexa-lang`, 그 외 dancinlab 소유 repo)의 버그·한계·미지원에
막히면 — 막힘의 **종류로 갈라** 처리한다:
- **컴파일러·런타임 코어**(compiler/codegen · runtime.a · gen3/gen4 byteeq · toolchain 빌드 실패 · OOM
  등 substrate)는 **직접 고치지 말고 ING 로 인계**한다: `harness ing add <증상+재현> --to hexa-lang`(또는
  해당 upstream). 이 영역은 **여러 세션이 동시에 깊게 파고드는 고위험 지대** — 함부로 손대면 충돌·회귀다
  (이번 세션도 hexa-lang 컴파일러 코어는 건드리지 않고 cloud 레이어만 고쳤다). 인계로 남기고 본 작업은 진행.
- **그 외**(응용 로직 · CLI · stdlib · cloud · 설정 · 문서 등 코어 밖)는 로컬에서 wrapper·shadow·fork·
  monkey-patch 로 **덮지 말고** 그 upstream repo 를 **직접 고쳐 `harness pr-cycle` 로 정식 머지**한다
  (**필요시 반드시 진행** · "남의 코드"라 미루지 말 것). 공유 checkout 은 **격리 worktree**(`git worktree
  add`)에서 작업하고 동시 세션 활동 감지 시 STOP(c7·c9).
dancinlab 생태계는 한 몸 — harness 가 hexa 빌트인(c11)에 의존하듯, 응용층 막힘의 진짜 원인이 upstream 에
있으면 거기서 고치는 게 근본 수정(c1)이다. upstream 도 c12 대로 문서+검증 머지로 닫는다. c1·c16(우회금지)의
연장 — 단, 컴파일/런타임 substrate 는 다세션 충돌 위험이 커 직접수정 대신 ING 인계가 안전한 정공법이다.

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
