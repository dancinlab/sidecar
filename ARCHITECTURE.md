# 하네스를 어떻게 구성하는가 (전수 설계)

> 이 문서는 운영 중인 두 하네스(애플리케이션 본체 + 매니저)를 전수조사해 **프로젝트-무관 일반형**으로 추출한 결과다.
> "무엇을 단속해야 하는가"가 아니라 "**하네스를 어떤 층(layer)으로 쌓아야 재사용 가능한가**"에 대한 설계다.

---

## 0. 하네스란 무엇인가

AI 에이전트는 셸 명령을 실행하고 파일을 편집한다. 빠르지만, 같은 실수를 반복하고(잊어버리고), 위험한 명령을 무비판적으로 실행하며, "고쳐줘"라는 말에 증상만 숨긴다. 하네스는 에이전트의 **작업 흐름에 끼어드는 게이트 집합**으로 이 실수를 구조적으로 줄인다.

핵심 통찰: **규칙은 코드가 아니라 데이터다.** 엔진(언제 어떻게 검사하는가)은 모든 프로젝트가 공유하고, 규칙(무엇을 검사하는가)만 프로젝트별로 주입한다. 이 분리가 "범용 하네스"를 가능하게 한다.

```
전 (프로젝트마다 하네스 재작성)     후 (엔진 공유 + 규칙 주입)
──────────────────────────       ──────────────────────────
 repo A: 하네스 코드 풀세트   →     공유 엔진(.ts) ── repo A: config.json
 repo B: 하네스 코드 풀세트   →                  └─ repo B: config.json
 (drift·중복·유지보수 3배)          (단일 엔진 · 규칙만 N벌)
```

---

## 1. 다섯 가지 통합 지점 (Integration Surfaces)

에이전트가 무언가 하기 **직전/직후**가 하네스가 끼어들 자리다. 어떤 에이전트 런타임이든 이 다섯 hook 으로 환원된다.

```
┌─ UserPromptSubmit ─┐   사용자가 말함        → prompt  (트리거·힌트 주입)
│                    │
│  ┌─ PreToolUse ────┤   도구 호출 직전        → pre bash / pre write  (block/warn)
│  │                 │
│  │   [도구 실행]    │
│  │                 │
│  └─ PostToolUse ───┤   도구 호출 직후        → post bash / post edit (기록·라우팅)
│                    │
└─ (commit/세션) ────┘   체크포인트            → lint / verify / handoff
```

| 표면 | 들어오는 신호 | 하네스가 하는 일 | 결과 채널 |
|------|--------------|-----------------|-----------|
| UserPromptSubmit | 프롬프트 텍스트 | 키워드→플레이북 매핑, 위험어→힌트 | stderr(컨텍스트 주입) |
| PreToolUse(Bash) | `{command}` | enforcement 정규식 매칭 | **stdout JSON**(block) / stderr(warn) |
| PreToolUse(Write) | `{file_path,content}` | 경로·내용·우회패턴 매칭 | stdout JSON / stderr |
| PostToolUse | exit code / 파일경로 | 실패 라우팅, L0 편집 경고 | errors 큐 / stderr |
| 체크포인트 | (수동/CI) | 검증·신선도·인계 | exit code + stderr |

**block 의 계약**: stdout 에 `{"decision":"block","reason":"..."}` 한 줄을 쓰면 지원 런타임이 도구 호출을 취소한다. 이게 유일한 "강제력"이고, 나머지는 전부 경고/기록이다(H2).

---

## 2. 층 구조 (Layering)

```
┌─────────────────────────────────────────────┐
│ 5. 규칙 데이터 (per-repo)                       │  enforcement.json · keywords.json
│    "무엇을 막을까"                              │  severity-map.json · harness.config.json
├─────────────────────────────────────────────┤
│ 4. 기능 모듈 (공유 엔진)                         │  modules/*.ts — pre/post/lint/verify/...
│    "언제 어떻게 검사할까"                         │
├─────────────────────────────────────────────┤
│ 3. 공용 부품 (공유 엔진)                         │  lib/ — paths/config/log/json/exec/lockdown
│    "경로찾기 · 로깅 · 실행 · 직렬화"              │
├─────────────────────────────────────────────┤
│ 2. 디스패처 (공유 엔진)                          │  cli/index.ts
├─────────────────────────────────────────────┤
│ 1. 실행 입구 (공유 엔진)                         │  bin/harness (런타임 자동탐색)
└─────────────────────────────────────────────┘
```

재사용성의 비밀은 **1–4 층이 5 층을 절대 하드코딩하지 않는다**는 것이다. 원본 하네스의 가장 큰 비-범용 부채가 바로 이 위반이었다(아래 §5).

---

## 3. 모듈 분류 — 무엇이 범용이고 무엇이 도메인인가

전수조사한 모듈을 세 등급으로 나눈다. **이 repo 는 ① 등급만 담는다.**

### ① 완전 범용 (이 repo 에 포함)

| 모듈 | 왜 범용인가 |
|------|------------|
| `pre` | 정규식 규칙 엔진 — 규칙은 전부 외부 JSON |
| `post` | exit/파일경로만 봄 — 도메인 지식 0 |
| `prompt` | 키워드→힌트 매핑 — 키워드는 외부 JSON |
| `lint` | staged-L0·신선도·수렴 누락 + **doc-gate**(CHANGELOG·ARCHITECTURE·README 미동반 = block, pr-cycle parity) — 대상은 config 선언 |
| `verify` | 검증 명령 병렬 실행 — 명령은 config 선언 |
| `errors` | (kind,code)→severity 분류 — 맵은 외부 JSON |
| `ledger` | 에이전트 작업 등록 — 도메인 무관 |
| `bitter-gate` | JSONL 빈도 분석 — 도메인 무관 |
| `audit` | JSONL 카운트 기반 스코어 |
| `gc` | 마크다운 링크 drift |
| `handoff` | git 스냅샷 |
| `convergence` | incident 집계 — 스키마만 맞으면 범용 |
| `sync` | 셸 스크립트 래퍼 |
| `pool` | 호스트 로스터 + 원격 실행. `shared:false` 제한 호스트는 `allow` 프로젝트 컨텍스트(cwd 경로 세그먼트) 밖에서 `on`/`status` 차단 — 사적/연구 전용 머신이 공용 컴퓨트로 새는 걸 막음 (env `HARNESS_POOL_ALLOW=<name>` = 의도적 override) |

### ② 부분 범용 (패턴만 문서화, 코드 미포함)

`lint` 의 "공유 파일 byte-drift 검사"처럼 **개념은 범용이나 구현이 특정 디렉토리 규약에 묶인** 것들. 필요하면 repo 가 자체 모듈로 추가한다([extending.md](extending.md)).

### ③ 도메인 전용 (포함 금지)

원본 하네스의 `deploy`(서버 배포) · `db`(SQL 래퍼) · `ssh` · `health` · `site`(매니저 API 조회) · 정산/머니 조사 모듈 등. 이들은 **특정 인프라·비즈니스 로직**에 묶여 다른 repo 에서 의미가 없다. 범용 하네스는 이들을 담지 않고, "도메인 모듈을 어떻게 끼우는가"만 [extending.md](extending.md) 에서 다룬다.

> 분류 기준 한 줄: **"규칙을 JSON 으로 빼면 다른 repo 에서 그대로 도나?" → YES 면 ①, NO 면 ③.**

---

## 4. config 주도 설계 (범용성의 심장)

`lib/config.ts` 가 `harness.config.json`(repo 루트)을 읽어 기본값과 머지한다. 모든 모듈은 하드코딩 대신 이 config 를 본다.

```
harness.config.json ─┬─ project            로그/리포트 라벨
                     ├─ lockdown.files     L0 잠금 파일 — opt-in, 기본 0개 (관리: harness lockdown add/rm)
                     │                     (fromMarkdown 명시 repo 만 🔴 블록 파싱; DEFAULT 아님)
                     ├─ enforcementFile    pre 규칙 위치 (없으면 번들 기본)
                     ├─ keywordsFile       prompt 트리거 위치
                     ├─ severityMapFile    errors 분류 맵 위치
                     ├─ verify.checks[]    {id,cmd,timeoutMs,slow}
                     ├─ lint.freshnessFiles[] · lint.convergence
                     ├─ convergence.issuesFile
                     ├─ sync.script
                     ├─ guides[]           gc 가 검사할 마크다운
                     └─ ledger.staleSec
```

**경로 자동탐색**(`lib/paths.ts`): 하네스가 repo 안 어디에 설치되든, `$PWD` 에서 위로 올라가며 `harness.config.json` → `.git` 순으로 repo 루트를 찾는다. `HARNESS_REPO_ROOT` 로 override 가능. 덕분에 submodule·vendor·심볼릭링크 어느 배치든 동작한다.

**규칙 파일 fallback**(`resolveRuleFile`): repo 가 `.harness/enforcement.json` 을 두면 그걸, 없으면 번들 `config/enforcement.json` 을 쓴다. → **설정 0 으로도 합리적 기본 동작**, 점진적 커스터마이즈 가능.

---

## 5. 원본 하네스에서 들어낸 비-범용 부채 (교훈)

일반화하며 제거한 안티패턴 — 새 하네스를 만들 때 피할 것:

| 부채 | 증상 | 일반형 처방 |
|------|------|------------|
| 경로 하드코딩 | 절대경로 고정 (예: `~/work/app/.shared`) | repo-root 상향 탐색 + env override |
| L0 목록 하드코딩 | fallback 배열에 실제 파일 박힘 | `config.lockdown` (opt-in, 기본 0개 · `harness lockdown` 관리) + 명시 repo 의 🔴 블록 파싱 |
| 도메인 모듈 번들 | 배포/머니 모듈이 코어에 섞임 | ①/③ 등급 분리, ③ 제외 |
| SSOT 단일 repo 고정 | 두 repo 가 한 repo 의 JSON 에 수렴 | per-repo 로그, 공유는 `sync` 로 명시 |
| 검증 명령 하드코딩 | `pnpm test` 등 박제 | `verify.checks[]` 로 선언 |

---

## 6. 새 repo 에 하네스를 세우는 절차 (요약)

```
1. 엔진 추가        git submodule add …/harness .harness-engine
2. config 작성      cp harness.config.example.json harness.config.json   → 수정
3. (선택) 규칙 추가  cp config/enforcement.json .harness/  → repo 규칙 append
4. hook 배선        .claude/settings.json 에 pre/post/prompt delegate
5. 검증            harness audit / harness ci list
6. 운영            commit 전 verify, 세션 끝 handoff, 규칙 추가 전 bitter-gate
```

자세한 통합은 [install.md](install.md), 규칙·모듈 확장은 [extending.md](extending.md) 참조.
