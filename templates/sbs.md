# /sbs — plan-first 순차 런북 (2-mode · chat-form · plan.md handoff)

> 📍 SSOT: 설계 [ARCHITECTURE.json](../ARCHITECTURE.json). 본 문서는 /sbs 런북 (단일 canonical · `step-by-step` 별도 파일 없음).
> 위 `resolved:` 줄은 `sidecar`(modules/sbs.ts)가 `recommend resolve-mode` 를 **CODE 로** 실행해 찍은 권위값이다 — 모델이 다시 해석하지 않는다.

`/sbs` 를 실행 중: chat 으로 모호성을 0 으로 만들고 → 결정셋을 잠그고 → plan 문서를 쓰고 →
백그라운드 Agent 로 **인계**해 끝까지 돌린다. `/cycle`·`abg`(병렬 fan-out)의 의도적 단일-스레드
반대편 — 한 가닥, 순서대로, 위→아래. 단 chat-form + 합의화면 + plan.md handoff 가 주 경로다.

AUTO = 4축 가중평균 자동선택, MANUAL = 라운드별 사용자 채팅 응답. 둘 다 같은 흐름:

```
auto ─────────────────── manual
Q마다 auto-pick           Q마다 user-pick
(사용자 응답 없음)        (라운드마다 채팅 응답)
            ↓
    같은 합의화면 → 같은 plan.md → 같은 handoff
```

## 1. mode 파싱 (resolver-first · CODE 가 권위 · directive 는 fallback)

위 `resolved:` 줄(`resolved: mode=.. axis=.. weights=.. source=…`)을 **권위로** 따른다. `mode:`
한 줄은 그대로 echo 해 모드를 선언한다. **CLI 파일읽기 ≠ 모델 파일읽기**: resolver 가 CODE 로
`~/.sidecar/recommend-default` 를 읽어 우선순위를 계산한 것은, 옛 설계가 금지한 "모델이 건너뛰던
파일읽기"의 정반대다 — 모델 해석을 제거하고 답을 코드로 박았으므로 더 신뢰성 있다. 모델은
`~/.sidecar/recommend-default` 를 따로 읽지 않는다.

**Fallback (resolver 가 비동기/에러/빈 출력일 때만)** — in-context `# default mode:` 디렉티브
(recommend-axes 훅이 매 턴 주입하는 단일 SSOT)를 해석한다. 첫 공백구분 토큰만(대소문자 무시):

- `auto:<axis>` (`complete`·`simple`·`safe`·`std`) → AUTO, 그 단일 축 forced(나머지 셋 weight 0). task = 나머지.
- `auto:<k>=<n>,<k>=<n>,…` → AUTO, 명시 weights(미지정 축 0). task = 나머지.
- `auto` (BARE — 정확히 `auto`, `:axis`/`:weights` 없음) → AUTO. **먼저** in-context 디렉티브 확인:
  `# default mode: FIXED <axis>` 면 그 단일 축 inherit(forced) + mode 줄에 리터럴 `inherited from
  recommend-default` 표기(예: `mode: auto (4-axis: complete forced) ← inherited from recommend-default`).
  디렉티브가 AUTO/present/부재면 4-axis 1:1:1:1 유지. task = 나머지.
- `manual` → MANUAL(기본 chat-form). task = 나머지.
- `legacy-manual` → MANUAL, 단 먼저 한 줄 배너: `⚠ legacy-manual 은 옛 per-step pause — phase-out 중; 새 chat-form 기본은 plain manual`. 이후 MANUAL.
- **명시 mode 토큰이 없으면** (`auto`/`auto:…`/`manual`/`legacy-manual` 중 아무것도 아님) →
  `~/.sidecar/recommend-default` 를 따로 읽지 말고 in-context `# default mode:` 디렉티브를 OBEY:
  `AUTO …`→AUTO 4-axis 1:1:1:1 · `FIXED <axis> …`→AUTO 해당 단일 축 forced(auto-proceed · 합의화면 1회) ·
  디렉티브 부재(present)→MANUAL. 입력 전체가 task(토큰 미소비). 상속 시 mode 줄에 `inherited from recommend-default` 표기.
- 그 외(디렉티브도 없음 / 입력 공백) → MANUAL. 입력 전체가 task.

**우선순위: EXPLICIT arg 토큰 > recommend-default 디렉티브 > MANUAL fallback.** AUTO 내 축
우선순위: explicit `auto:<axis>`/`auto:<weights>` > inherited FIXED `<axis>`(BARE `auto`/no-token) > 4-axis 1:1:1:1.
(`go` 는 mode 가 아니다 — "멈춘 흐름 이어가기"는 별도 `/go`.)

**target 해석**: task 텍스트 비었으면 컨텍스트의 현재 작업으로 가정(미커밋 diff → 논의 중 작업 →
cwd repo 순). 가정을 한 줄로 말하되 **묻지 않는다**(비었고 비자명하면 2번 첫 라운드가 묻는다).

## 2. 채팅 disambiguation (양 모드 공통 · 모호성→0 hard gate)

plan 잠그기 전 모호성을 0 으로 몬다 — "묻고 또 묻고" 형. **AskUserQuestion 의 4-옵션 selectbox 가
아니라 CHAT** — selectbox 는 라운드당 최대 4축을 쌓아 설계/학습 작업의 인지부하를 튀게 한다.
chat-form 은 라운드당 **1문항**을 easy 7요소로 감싸 각 라운드를 작은 수업으로 만든다.

1. **Enumerate (MANDATORY · 첫 라운드 전)** — target 의 모든 미해결 질문을 **먼저 전부** 열거한다
   (lazy 하게 하나씩 발견 금지): 불명확 요구·미명시 제약·엣지케이스·네이밍/위치·범위 경계·성공
   기준·복수해석 중 택1·트레이드오프 선호. 내부에 들고만 있고 사용자에게 덤프하지 않는다 — 한 번에
   하나씩 먹인다(또는 AUTO-pick). 목록은 item 3 재스캔으로 자랄 수 있으나, 초기 전수 enumerate 는 생략 불가.

2. **한 번에 하나씩, 채팅으로 (NOT AskUserQuestion).** 비자명 문항은 easy 7요소로:
   아이콘 · 이름/별칭 · 하는 일(한 줄) · 비유(요리/뜨개질/배선) · ASCII(옵션공간 스케치) ·
   비교 표(옵션×축) · 추천(한 줄 "나라면 X, 이유 Y"). 매 라운드 마무리: `→ A · B · 또는 자유응답 (예: "다른 안: …")`.

   **7요소 골격 = `sidecar easy` 결정적 빌트인 래핑 (손으로 짜지 말 것).** 골격과 점수는 결정적이므로
   `sidecar easy` 빌트인에 맡긴다 — `easy` 주입 스타일이 쓰는 바로 그 SSOT backbone:
   ```
   [ 라운드 N ] ─▶ ① sidecar easy scaffold ─▶ ② LLM 슬롯 채움 ─▶ ③ sidecar easy lint ─▶ 라운드 렌더
                      7-슬롯 골격(결정적)        창의 질문(LLM만)      축별 advisory 점수(결정적)
   ```
   - `sidecar easy scaffold "<axis question>"` — 라운드의 빈 7-슬롯 골격(아이콘·이름/별칭·하는 일·비유·ASCII·비교표·추천 + `→ A · B · 또는 자유응답`)을 발행. 손으로 짜지 말고 이걸 채운다.
   - `sidecar easy lint <file|->` — 렌더된 라운드의 prose 품질 advisory 점수(jargon-ratio · analogy-presence · ascii-presence · acronym-expansion · 7-element adoption). 라운드 prose 만 게이트 — disambiguation/auto-pick 로직은 빌트인과 독립이며 항상 실행. **항상 exit 0(advisory) — 라운드를 막지 않는다.**
   - **SSOT(복제 금지)** — 7요소 패턴 + 4종 ASCII 템플릿은 `~/.sidecar/cli/styles/easy.<lang>.md`(없으면 repo `styles/easy.<lang>.md` · 기본 `ko`)가 소유. 가리켜 APPLY 하되 복제 금지(`sidecar easy show` 로 경로/언어 확인).
   - **graceful fallback** — `sidecar easy` 미동기 시 styles SSOT 에서 손-골격 + 일반인-번역 체크리스트 self-check. advisory 라 빌트인 부재가 라운드를 막지 않는다.

   - **MANUAL** — 사용자 채팅 응답 대기 → 결정셋에 기록 → 다음. 미지값을 **절대 지어내지 않음**.
   - **AUTO** — 즉시 4축 가중평균 auto-pick(일시정지 없음). 4축:
     완성도(complete · 견고+엣지커버) · 단순(simple · Occam) · 안전(safe · blast radius 최소·가역) ·
     표준(std · sidecar 패턴 적합). 옵션별 1–5 점 → Step1 weights 곱 → 합 → 최고 선택, 동점이면 추천 줄 우선.
     로그: `🤖 auto-pick Q<n>: <option> (axes — complete=X, simple=Y, safe=Z, std=W · weighted=<sum>)`. 즉시 다음 라운드.

3. **매 라운드 후 재스캔 = NON-SKIPPABLE hard gate** (advice 아님). 답(user/auto)이 전부 해소했는지,
   새 모호성을 띄웠는지 target 전체 재스캔. 새/잔여 모호성 있으면 **무조건 한 라운드 더** — 모호성>0
   인 채 합의화면(3번) 진입은 금지(AUTO 도 short-circuit 불가). 라운드 캡·"이만하면 됐다" exit 없음 —
   유일 exit = 명시적 zero-ambiguity 재스캔.

4. 재스캔이 0 을 반환한 뒤에만 합의화면으로. 진입 전 종료 게이트 명시:
   `🔍 disambiguation: <N> rounds · final re-scan → ambiguity 0` (AUTO: `· auto-picked (weights: complete=…, simple=…, safe=…, std=…)` 덧붙임).
   정직히 "최종 재스캔 0" 이라 말할 수 없으면 게이트 미충족 — item 2 로 회귀.

**미지값 무날조 (양 모드).** MANUAL 은 모든 미지값이 채팅 질문 — 의도 발명 금지. AUTO 의 auto-pick 은
답이되, **진짜 enumerate 해 비교표에 깐 옵션 중에서만** 고른다 — 없는 FACT(미명시 요구·외부값)는 발명
금지. 미지값이 선호가 아니라 빠진 사실이면 라운드에 open assumption 으로 기록하고(plan 을 막으면)
합의화면에서 surface — 값을 지어내지 않는다. AUTO 도 합의화면에서 사용자가 override 가능.

(Fallback — 닫힌 소수 옵션집합이고 사용자가 picker 를 선호한다 신호하면, **MANUAL 한정** 그 한 라운드만 AskUserQuestion 허용. 기본은 chat.)

## 3. 합의 화면 (2번이 모호성 0 반환한 뒤에만)

**Precondition: 2번 최종 재스캔이 ambiguity 0 (item 3).** 열린 질문 든 채 여기 오면 spec 위반 —
회귀. plan 실행으로 직행 말고, 누적 결정셋을 ASCII 트리로 렌더 + 일시정지(AUTO 의 auto-pick 도 사용자
사전확정 체크포인트):

```
🎯 합의된 결정셋 (N개)
┌─ Q1: <axis>  → ✅ <chosen>
├─ Q2: <axis>  → ✅ <chosen>
└─ Qn: <axis>  → ✅ <chosen>
요약: <plan 이 실제로 만들 것 한 줄 재진술>
plan 문서: drafts/<slug>-plan.md (생성 예정)
→ 맞으면 `go` · 수정은 `Qn=<다른 선택>` (예: `Q2=B` 또는 `Q3=다른 안: <text>`)
```

턴 종료 후 사용자 대기. 응답에:
- **`go`**(또는 `예`/`yes`/`맞아`) → 4번.
- **`Qn=<X>`** → 그 결정만 갱신, 나머지 유지 → 재렌더(연속 flip 가능 · 매번 재렌더).
- **`Qn=다른 안: <text>`** → 자유응답 수정 → 기록 + 재렌더.
- **응답에 새 모호성**("그런데 X 는?") → 새 2번 라운드(chat-form · 7요소 · MANUAL 대기/AUTO auto-pick) → 합의화면 복귀.

합의화면은 plan 문서 작성·agent fan-out 직전 **마지막 싼 체크포인트**.

## 4. plan.md + 백그라운드 handoff (`go` 시 · IN ORDER · atomic)

1. **slug 도출** — task brief 에서 kebab-case ≤6 토큰, `[a-z0-9][a-z0-9-]*`. 모호하면 2번 첫 라운드에서 한 번 물어 결정셋에 박는다.
2. **`drafts/` 보장 + gitignore** — 디렉토리 없으면 생성. `.gitignore` 에 `drafts/` 줄 없으면 append(`/draft` 패턴). 편집 차단 시 진행하되 경고 한 줄: `⚠ drafts/ not in .gitignore — plan.md may commit accidentally`.
3. **`drafts/<slug>-plan.md` 작성** (Write 도구 · echo/heredoc 아님). frontmatter 에 **항상 `status: active` stamp**(정확히 1개만 active):
   ```
   ---
   slug: <slug>
   mode: <manual|auto>
   status: active                                              # active | done | abandoned
   auto-weights: complete=<n>, simple=<n>, safe=<n>, std=<n>   # AUTO 만; MANUAL 은 생략
   created: <ISO date>
   ---

   # <slug> — plan

   ## task brief
   <task 를 이해한 대로 한 문단 재진술>

   ## locked decisions
   - @L1 (<axis>): <chosen option> · assert:<grep:|file:|verdict:> <arg>
   - @L2 (<axis>): <chosen option> · assert:<grep:|file:|verdict:> <arg>
   - …

   ## next-action checklist
   - [ ] step 1: <…>
   - [ ] step 2: <…>
   - …
   - [ ] ship (명시 경로 · 한국어 commit msg · push 후 `sidecar sync`(있으면))

   ## completion criteria
   <agent 가 done 임을 아는 법 — 변경 파일 · 통과 게이트 · ship 착지>
   ```

   ### `@L<n> … assert:` — locked-decision 기계가독 계약
   각 `## locked decisions` 불릿은 기계검증 assertion 을 실어 plan 을 contract 로 만들 수 있다 (현재
   전용 enforcer 는 없으므로 **advisory** — 미래 plan-guard/`plan-lint` 가 들어오면 그대로 강제됨). 형식:
   ```
   - @L<n> (<axis>): <human-readable chosen option> · assert:<kind> <arg>
   ```
   - `@L<n>` — 안정 id(`@L1`,`@L2`,…), 단조증가, plan 내 재사용 금지.
   - `assert:<kind> <arg>` — falsifier. 3종:
     - `assert:grep <pattern>` — 잠근 용어가 검사면(repo 파일 / `--diff` 셋)에 존재해야 함. `!` 접두=부재(`assert:grep !GPU`).
     - `assert:file <path>` — 경로(repo 루트 상대)가 존재해야 함.
     - `assert:verdict <slug>/<id>` — terminal verdict `.verdicts/<slug>/<id>.txt` 가 존재+non-empty(closure 게이트).
   - human 옵션 텍스트와 `assert:` 절은 ` · ` 로 구분. `@L` 줄당 assert 1개(더 잠그려면 줄 추가).
   - **후방호환** — `@L` 없는 plan.md(레거시 `Q1`/`Q2` 불릿)는 그냥 skip(검사 대상 없음 → 통과). `@L` 추가는 opt-in.
4. **백그라운드 Agent 발사** (general-purpose · `run_in_background=true`). 프롬프트 = self-contained:
   plan.md 전문 + ship 지침(명시 경로 · no force-push · 한국어 commit msg · push 후 `sidecar sync`) +
   완료기준 + "끝나면 보고". Agent 가 추가 사용자 입력 없이 end-to-end 소유.
5. **사용자에게 handoff 줄** 후 턴 종료:
   ```
   🚀 handoff: agent launched (id=<agent-id>) · plan saved to drafts/<slug>-plan.md · 나가셔도 됩니다
   ```
   이후 이 세션에서 할 일 없음 — 백그라운드 Agent 가 완료(또는 hard halt) 시 보고. 폴링 금지 · 인라인 계속 금지.

## 5. 인라인 fallback (2번 첫 스캔에서 모호성 0 · chat-form 이 과할 때)

task 가 자명하면(2번 첫 스캔 모호성 0) 합의화면+handoff 생략, 인라인 실행:
`📋 plan (N steps)` → `▶ i/N — <step>` → 작업 → `✅`/`⚠`/`❌`.
- **AUTO** — 단계 간 일시정지 없이 직진.
- **MANUAL** — 단계마다 STOP: `⏸ step i/N done. next → … proceed? (continue / adjust / skip / stop)` → 사용자 대기.

## 6. Halt (전 모드·전 경로)

mode/handoff 무관, 멈추고 보고 — 맹목 진행 금지:
- 단계 **실패**(`❌`) — 어느 단계 + verbatim 에러 + 안 돌린 나머지 단계 보고 → 사용자 판단.
- 다음 단계가 **비가역·파괴적·외부노출**(배포·공개·force-push·대량삭제·전송) — 직전 확인 후 재개. `bypass` self-check 와 같은 기준. handoff Agent 는 그런 단계 **전 먼저 보고**.

## 7. Closure

마지막 단계(또는 종료) 후: `🏁 <done>/<N> steps complete`. 조기 halt 면 어디서·왜 멈췄고 남은 tail 출력.

## 8. Auto-QA 4축 (handoff agent · ship 직후)

Ship 완료 즉시 4축 자동검증. 각 축 PASS/FAIL/SKIP — SKIP=PASS-equivalent(통과 간주).

| 축 | 묻는 것 | 실행 방법 |
|---|---|---|
| **functional** | 새 endpoint/verb/surface 가 응답? | 코드 실행 또는 smoke verb (없으면 SKIP) |
| **visible** | 사용자 진입 URL/path/surface 노출? | render check (없으면 SKIP) |
| **conformance** | locked decision ↔ 코드 1:1 | spec ↔ diff 대조 (LLM judge) |
| **regression** | 기존 surface 미손상 | 영향 plugin/module parse + smoke 재실행 |

**Fail 정책(hybrid):**
- regression FAIL → `git revert <ship-SHA> && git push && sidecar sync` 자동 + 다음 turn 첫 줄 banner `🛑 sbs-qa: regression FAIL — auto-reverted <SHA> · 자세히 drafts/<slug>-plan.md`.
- functional/visible/conformance FAIL → ship 유지 + plan.md `## qa-deferred` append + banner `🛑 sbs-qa: <axis> FAIL — alert only · see drafts/<slug>-plan.md`.
- SKIP = PASS-equivalent.
- ALL PASS/SKIP → banner 없음 · plan.md `## qa-results` 에 ✓ 라인만 append · DONE.

결과는 항상 plan.md `## qa-results`(최신 위) + 필요 시 `## qa-deferred` 에 기록.

**상태 flip** — ship + auto-QA 종료로 plan 종료 시 frontmatter `status: active` → `status: done`
(regression auto-revert 로 폐기면 → `status: abandoned`). 정확한 active-plan 추적용(미래 plan-guard 가
stale plan 의 @L 을 오강제하지 않게). flip 깜빡해도 fallback(최신 mtime)이 받치나, closure 시 flip 권장.

## 9. 인계 dossier (handoff agent · QA 직후 · 보고 직전)

다음 세션(AI 인계용) 인계 정보를 굳힌다. ⛔ **NO ad-hoc HANDOFF.md / INBOX.md / inbox/*.md**
(handoff-guard 가 Write/Edit hard-deny · ing-board 규칙). 두 carrier:
- **(a) intra-repo** → 같은 `drafts/<slug>-plan.md` 에 `## handoff` 섹션 append(gitignored · 소유자와 co-locate · 이력=ship commit git log). append(덮어쓰기 X) · 재실행 시 최신 위.
- **(b) cross-repo follow-up** → `sidecar ing add <text> --to <repo>` 레지스트리(타 repo 보드에 착지·커밋). 드래프트에만 두지 말 것 — 반드시 ING 보드로.

**9 섹션** (생략 가능=SKIP 표기, 비우지 말 것) — `## handoff` 에 작성:
1. `## § PR 진행 상태 매트릭스` — `| # | title | status | merged | core |`. status=merged/open/draft/closed. stacked 아니어도 최소 1행(이번 ship main commit/PR).
2. `## § 설계 SSOT 파일 인덱스` — 다음 세션이 먼저 읽을 파일 경로 bullet(plan.md · 핵심 런북 · ARCHITECTURE 노드 · spec).
3. `## § 새 API surface` — `| method | path | role | auth |`. 신규 없으면 `(none — no new API surface)`.
4. `## § 새 컴포넌트/lib 트리` — 신규 디렉토리 스케치(tree -L 2 형). 없으면 `(none)`.
5. `## § 환경 변수` — 활성화 전 export 필요 env. 없으면 `(none required)`.
6. `## § 다음 우선순위` — 정렬 todo. 소스 = ING 보드 open 항목 + plan `## deferred` + 이번 발견 follow-up.
7. `## § 알려진 한계 + guard rule` — 이번 ship 미처리 + 관련 commons/`.harness` governance rule pointer.
8. `## § memory/CLAUDE.md 인덱스` — `~/.claude/projects/<project>/memory/MEMORY.md` 의 관련 entry pointer. 없으면 `(no related memory entries)`.
9. `## § 한 줄 시작 가이드` — 다음 세션 첫 command 한 줄(예: `cd <repo> && /go` · `sidecar ing show`).

**Trigger 키워드** (task brief 에 있으면 복잡도 무관 강제 작성): `완전한 handoff` · `handoff 모드` ·
`완전 구현` · `complete handoff` · `end-to-end handoff`. 없으면 휴리스틱: plan PR ≥ 3 OR 변경 LOC ≥ 500
이면 작성, 아니면 SKIP + plan.md `## qa-results` 아래 한 줄 `handoff-dossier: SKIP (small change)`.

**Memory mirror** (`## handoff` 작성 후): `~/.claude/projects/<project>/memory/MEMORY.md` 인덱스에 한 줄
`- project:<slug>-handoff — <task one-line> (drafts/<slug>-plan.md `## handoff`)` append. 별도 pointer
파일 X · memory dir 없으면 silent skip — 인계 본문은 plan draft `## handoff` 단일 carrier 에 산다.

**Stacked PR-cycle hint** (관찰만): plan 이 N stacked PR 이면 **단일 worktree**(`~/core/<repo>-pr-cycle`)
안 branch 갈아끼우기가 N 회 worktree 생성/제거보다 5–10× 빠름(실측 7 PR ~6분). 매 PR:
`git reset --hard origin/main && git checkout -b feat/<n>`. agent 프롬프트에 한 줄 hint 권장.

## 10. end-user dossier (plan 에 `handoff` verb 있을 때만)

plan 의 next-action checklist 또는 task brief 가 **end-user 대상 `handoff` verb** 를 포함하면(사용자가
클릭 한 번에 받아 들고 나갈 실 산출물이 필요한 케이스), 9번 AI 인계 doc 와 **별도로** end-user dossier
bundle 도 생성한다. 형식 자유 — JSON dossier · zip · pdf · csv export · download link 등 사용자가 손에
쥘 수 있으면 OK. sbs 가 강제하는 건: handoff verb 구현이 user-deliverable 산출물을 produce 한다는 것.
reference impl 예 = HTTP API 가 dossier JSON 을 download 헤더로 반환(`Content-Disposition: attachment`)
— 단순 예시(강제 X). 작성 결과는 plan.md `## qa-results` 에 `end-user-dossier: <path or url>` 한 줄로 기록.

**두 패턴 공존**: AI handoff doc(9번)=handoff agent 가 **항상** 작성 · end-user dossier(10번)=plan 에 handoff verb 있을 때만.
