# hardcore 프로파일

> 🥋 **최대 강도 거버넌스 프로파일.** main 의 모든 기능 + "막을 수 있는 건 다 막고 탈출구를 좁힌" 설정.
> `harness-hardcore` 브랜치에서 관리하며, main 업데이트는 계속 흘러들어온다(아래 동기화).

## default vs hardcore

| 항목 | default | hardcore |
|------|---------|----------|
| enforcement action | 대부분 `warn` | 대부분 `block` |
| severity fallback | `defer` | `block` (unknown_threshold 5) |
| `--no-verify` 우회 | 가능 | `H-NO-VERIFY` 로 차단 |
| force-push | warn | `H-FORCE-PUSH` block (lease 만 허용) |
| 파괴적 git (reset --hard/clean -fd) | 자유 | `H-RESET-HARD` block |
| main 직접 커밋 | 자유 | `PROTECTED-BRANCH` block (feature 브랜치 강제) |
| 디버그 잔재(console.log 등) | 무검사 | `H-DEBUG-LEFTOVER` warn |
| git hook | pre-commit(lint) | pre-commit(lint) **+ pre-push(verify + errors drain)** |
| ledger staleSec | 3600 | 1800 |

## 적용

```bash
cd your-repo
git submodule add -b harness-hardcore https://github.com/dancinlab/harness .harness-engine
bash .harness-engine/bin/harness init --hardcore --hooks
```

`init --hardcore` 가 default 와 달리:
- `.harness/enforcement.json` ← `config/enforcement.hardcore.json`
- `.harness/severity-map.json` ← `config/severity-map.hardcore.json`
- `harness.config.json` 에 `profile:"hardcore"` + `lint.protectedBranches:["main","master"]`
- `.git/hooks/pre-push` 추가(`harness ci` + `errors drain_check 1`)

## 닫힌 탈출구 / 면제 마커

hardcore 도 정당한 예외는 인정한다 — 같은 줄/명령에 마커:

| 게이트 | 면제 마커 |
|--------|-----------|
| H-NO-VERIFY | `# no-verify-ok <사유>` |
| H-FORCE-PUSH | `--force-with-lease` 또는 `# force-ok` |
| H-RESET-HARD | `# reset-ok` |
| H-CURL-PIPE-SH | `# curl-pipe-ok` |
| H-RM-RF-ROOT | `# rm-ok` |
| H-ROOT-CAUSE / H-SECRET | `@root-cause-ok` / `@secret-ok` |
| H-DEBUG-LEFTOVER | `@debug-ok` |

## prefs — 언어 선호 (3축)

sidecar `prefs` 패리티. 코드 작성어 · 문서 작성어 · 응답어를 repo 단위로 고정하고, 매 턴 에이전트에 주입한다.

```bash
harness prefs show                 # 현재값
harness prefs code english         # 코드/주석 언어
harness prefs docs korean          # 문서(.md) 언어
harness prefs response korean      # 사용자 응답 언어
harness prefs inject               # UserPromptSubmit hook — # prefs 블록 주입 (init --hooks 가 자동 배선)
```

- 저장: `.harness/prefs.json` (`{code,docs,response}`). hardcore `init` 기본값 = code:english · docs:korean · response:korean.
- **hardcore 강제**: `code=english` 인데 코드/주석에 한글이 들어가면 `post edit` 가 `🌐 prefs` 경고(UI 텍스트는 locale 파일로, 정당하면 `// @lang-ok`). 문서축은 주입(soft)만 — 오탐 방지.

## easy — 친근(7요소) 응답 스타일 자동주입

sidecar `easy-auto` 패리티. `styles/easy.<lang>.md`(ko·ja·zh·ru + en base, sidecar 원본 그대로 복사)를 `prefs.response` 언어에 맞춰 매 턴 주입한다.

```bash
harness easy show       # 선택된 스타일 파일 (response 언어 기준)
harness easy inject     # SessionStart/UserPromptSubmit hook — 7요소 패턴 주입 (init --hooks 자동 배선)
```

- 언어 선택: `prefs.response` → ko/ja/zh/ru, 그 외 영문 base(`easy.md`).
- NL 트리거: 프롬프트에 `설명`/`쉽게` 포함 시 활성 배너(`🎓 easy 모드 활성 …`) prepend.
- opt-out 없음(always-on) — sidecar 와 동일.

## recommend — 4축 추천 + 기본모드 (sidecar recommend-axes 패리티)

모든 추천을 4축(완성도·단순·안전·표준) 박스로 강제하고, 기본 결정모드를 repo 단위로 둔다. `config/recommend.tape`(룰 SSOT, sidecar 원본 복사)를 매 턴 주입.

```bash
harness recommend show              # 룰 본문(+활성 default 디렉티브)
harness recommend set-default complete   # present|auto|complete|simple|safe|std
harness recommend get-default
harness recommend clear-default
harness recommend inject            # SessionStart/UserPromptSubmit hook (init --hooks 자동)
harness recommend resolve-mode <args>    # sbs 용 결정적 모드 리졸버
```

- default 저장: `.harness/recommend-default` (한 토큰, 커밋=팀 공유). sidecar 는 `~/.sidecar` 전역, harness 는 repo 단위.
- LOCKED precedence: 명시 `auto:<axis>`/`<weights>`/`manual` > bare `auto`/no-token 의 상속 FIXED 축 > 4축 1:1:1:1 > MANUAL.

## sbs — plan-first 순차 런북 (sidecar /step-by-step 패리티)

```bash
harness sbs                    # 현재 맥락 작업, 모드는 recommend default 상속
harness sbs auto:safe "리팩터" # 명시 모드 + task
harness sbs manual "기능 추가"
```

`harness sbs` 는 ① `recommend resolve-mode` 로 모드를 결정해 `mode:`/`resolved:` 두 줄 출력 → ② `templates/sbs.md` 런북(파싱→채팅 disambiguation→합의화면→plan.md→백그라운드 handoff→auto-QA→halt→closure) 출력. 에이전트는 이 런북을 따른다. sidecar `sidecar sync`/`hexa easy`/플러그인 캐시 의존은 harness 등가물(`harness sync`/`harness easy`/엔진)로 일반화.

## abg / afg — fan-out 런북 (sidecar all-bg-go / all-fg-go 패리티)

직전 어시스턴트 턴이 제시한 브랜치들을 한 번에 처리. `harness sbs` 처럼 런북 출력기.

```bash
harness abg [labels]   # 병렬 백그라운드: 브랜치당 background Agent 동시 발사
harness afg [labels]   # 순차 포그라운드: 한 번에 하나씩 이 세션에서 직접 실행(HALT on failure)
# alias: all-bg-go / all-fg-go
```

- `templates/abg.md` / `templates/afg.md` 출력 + 라벨 제한(인자 있으면 해당 label 만).
- REACTIVE only — 직전 턴 제시 목록만, 없는 브랜치 지어내기 금지. 종료 메시지 형태(`N agents launched…` / `N branches run sequentially…`)는 sidecar 와 동일.
- abg=병렬(Agent run_in_background) · afg=순차 in-session(subagent 금지). 수동 호출(hook 아님).

## docs — 단일 문서 규율 (중구난방 → 2파일 통합)

AI 가 리포트/요약/노트를 흩뿌리는 걸 막고 **2개 단일 문서**로 모은다. `ARCHITECTURE.md` 존재 시 활성(opt-in by presence).

```
2-파일 규약
├─ ARCHITECTURE.md  — 최종 아키텍처 SSOT (업데이트형: 항상 최신으로 덮어씀, 추가형 아님)
└─ CHANGELOG.md     — 이력/결정 (추가형: append)
임시 산출물         → scripts/scratch/ (tmp 휘발 금지)
부득이 분리 문서     → 상단에 SSOT 로 가는 quickref 1줄 무조건 연결
메인 CLAUDE.md      → 프로젝트 간략 설명 + 트리 구조(트리별 간략 설명) 반드시 포함
```

```bash
harness docs status            # 활성 여부 + 흩어진 문서/quickref 누락/CLAUDE.md 위반
harness docs check             # 위반 시 exit 1 (lint 가 자동 포함 — pre-commit 강제)
harness docs scratch [name]    # scripts/scratch 경로 생성(tmp 대체)
```

검사 규칙 (lint 통합 · severity-map.hardcore = block):
| 규칙 | 트리거 |
|------|--------|
| `DOC-SCATTER` | `-report/-summary/-notes/날짜-*.md` 등 흩어진 작명 |
| `DOC-NO-QUICKREF` | 비-SSOT 분리 .md 상단에 SSOT 포인터 없음 |
| `CLAUDE-MD-MISSING/NO-DESC/NO-TREE/TREE-NO-DESC` | 메인 CLAUDE.md 의 프로젝트설명·트리·트리설명 누락 |

enforcement(hardcore): `H-SCATTER-DOC`(pre_write 흩어진 .md 작성 경고) · `H-TMP-SCRATCH`(pre_bash /tmp 작성 경고 → scripts/scratch) · prompt-hint `H-SINGLE-DOC`. `init --hardcore` 가 ARCHITECTURE.md·CHANGELOG.md·CLAUDE.md 스텁 + scripts/scratch/ 생성.

## 규칙 추가 (이 브랜치에서 한 건씩)

hardcore 규칙은 **이 브랜치의 `config/enforcement.hardcore.json` / `config/severity-map.hardcore.json` 에만** 추가한다(main 의 default 규칙은 건드리지 않음). 새 규칙은 `pre_bash` / `pre_write` / `prompt_hints` 에 append.

## main 업데이트 동기화 (필수)

hardcore 는 main 의 superset 이다. main 의 코어 개선을 주기적으로 흡수한다:

```bash
git checkout harness-hardcore
git fetch origin
git merge origin/main        # 충돌 거의 없음 — hardcore 는 새 파일 위주(additive)
# 충돌 시: config/*.hardcore.json · docs/hardcore.md 는 hardcore 우선, 엔진 파일은 main 우선 후 재확인
git push origin harness-hardcore
```

> 설계상 hardcore 는 **새 파일 추가** 위주라 `merge origin/main` 이 깨끗하게 흐른다. 엔진 파일(lint/config/init)의 hardcore 지원 코드는 default 에서 비활성(config 미설정 시 no-op)이라 main 으로 역병합해도 안전하다.
