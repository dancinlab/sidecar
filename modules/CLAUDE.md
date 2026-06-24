# modules — 기능 모듈 (one file per command + code-level guards)

> 이 폴더에서 작업하는 AI/사람을 위한 로컬 가이드. 상위 설계는 repo-root [ARCHITECTURE.json](../ARCHITECTURE.json).

## 목적
`cli/index.ts` 가 디스패치하는 각 서브커맨드의 구현 + PreToolUse/PostToolUse 훅 로직. `lib/` 부품 위에 얹혀 "언제·어떻게 검사"를 담는다. 규칙 데이터(무엇을 검사)는 `config/`·`.harness/` JSON 에서 읽는다.

## 핵심 파일 (대표)
| 파일 | 역할 |
|------|------|
| `pre.ts` | PreToolUse(Bash/Write/AskQuestion) — 코드레벨 가드 평가 → config enforcement 정규식 (가드는 config 보다 먼저·끌 수 없음) |
| `post.ts` | PostToolUse — exit 라우팅·L0 편집 경고·folder 넛지 |
| `cloud-guard.ts` | raw GPU provider CLI/API 차단 (vast/vastai/runpod/runpodctl·api.runpod.*) · 따옴표 인식 세그먼트 |
| `naming-guard.ts` | 버전/복사 접미사 파일·폴더명 차단 (`_v2`·`_copy`…) |
| `state-guard.ts` | scatter 디렉토리(.verdicts/bench/…) 차단 → `state/` 유도 |
| `docs.ts` | single-doc 규율 (scatter `.md` 차단 + quickref) |
| `lint.ts` | commit-time 게이트 — staged 검사 모음 (CHANGELOG·convergence·folder-guide…) |
| `ing.ts` · `folders.ts` · `architecture.ts` · `toolkit.ts` … | 진행보드 · 폴더가이드 · 설계주입 · 명령카탈로그 |

## 규칙 / 컨벤션
- 새 명령 = `modules/<name>.ts` + `cli/index.ts` 등록 + help 라인 + CHANGELOG (+ `templates/`·`commands/`) → `toolkit write` 카탈로그 100%.
- 코드 가드는 **config 보다 먼저** 실행되고 프로필 편집으로 못 끈다 (인라인 `# …-ok` 마커만 예외) — 재발방지는 `@convergence` 마커로 박제(lint 가 well-formed 강제).
- 토글·임계는 `lib/config.ts` 에서만 (여기 하드코딩 금지).

## 주의 (gotchas)
- PreToolUse 입력은 **STDIN** 에서 읽는다(`$CLAUDE_TOOL_INPUT` 은 현 CC 가 안 채움) · block 은 `hookSpecificOutput.permissionDecision:deny` 스키마(레거시 `decision:block` 무시됨).
- 셸 명령 파싱 시 따옴표 안 `|`/`;` 는 데이터 — `cloud-guard.ts` 의 `segments()` 처럼 따옴표 인식 후 분리(quoted-regex 오차단 회피).
- help 블록은 백틱 템플릿 리터럴 — 설명에 백틱 넣으면 문자열이 깨진다(작은따옴표 사용).

## 관련
- 부품: [lib/](../lib/CLAUDE.md) · 디스패치: `cli/index.ts` · 규칙 데이터: `config/`·`.harness/` · 설계 SSOT: [ARCHITECTURE.json](../ARCHITECTURE.json)
