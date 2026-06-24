# lib — 공용 부품 (engine shared primitives)

> 이 폴더에서 작업하는 AI/사람을 위한 로컬 가이드. 상위 설계는 repo-root [ARCHITECTURE.json](../ARCHITECTURE.json).

## 목적
`modules/` 의 모든 기능이 공유하는 저수준 부품. repo-root 탐색·설정 로드·로깅·JSONL·셸 실행·잠금판정. 도메인 무지(domain-agnostic) — 여기엔 규칙(무엇을 검사)을 하드코딩하지 않는다.

## 핵심 파일
| 파일 | 역할 |
|------|------|
| `paths.ts` | repo-root 자동탐색(harness.config.json/.git 상향) + `LOGS`(.harness/logs/*.jsonl 경로) |
| `config.ts` | `config()` = harness.config.json 로드 + 기본값 머지 (모든 가드 토글·임계의 SSOT) · `repoPath()` |
| `lockdown.ts` | L0(잠금) 파일 판정 (config + 🔴 마크다운 블록 파싱) |
| `log.ts` | `info`/`ok`/`warn`/`loudFail` + `appendJsonl` (H1: 성공 조용·실패 시끄럽게) |
| `json.ts` | `readJsonl`/`readJsonOr` 안전 파싱 |
| `exec.ts` | `execShell`/`execArgs` 셸·argv 실행 래퍼 |

## 규칙 / 컨벤션
- 새 가드 토글·임계값은 **여기 `config.ts` 인터페이스 + 기본값**에 추가하고 `modules/` 는 `config().<key>` 로만 읽는다 (엔진 무하드코딩 · H4 config-driven).
- 경로는 `repoPath()`/`REPO_ROOT` 경유 (cwd 가정 금지 — linked worktree 안전).
- 출력은 `log.ts` 헬퍼로 (raw `console.log` 금지 · H1 일관성).

## 주의 (gotchas)
- `config()` 는 매 호출 머지 — 빈번 호출 비용 의식.
- `paths.ts` 의 root 탐색이 config-less worktree 를 지나칠 수 있다 (ing.ts 는 그래서 `git rev-parse --show-toplevel` 별도 사용).

## 관련
- 소비자: [modules/](../modules/CLAUDE.md) · 설계 SSOT: [ARCHITECTURE.json](../ARCHITECTURE.json)
