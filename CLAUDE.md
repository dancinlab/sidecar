# sidecar

Project-agnostic AI coding sidecar — guards, injects, and runbooks that wire a single `sidecar`
CLI into any agent (Claude Code, etc.) via hooks. Config-driven, zero domain hardcoding; ships as a
global command (`~/.sidecar/cli` + `~/.local/bin/sidecar`, bootstrapped by `sidecar install`) and as a
Claude Code plugin (`/plugin`).

> 📍 SSOT 포인터 (이 파일 = 진입점 + 작업규칙만):
> · **구조·설계 → [ARCHITECTURE.json](ARCHITECTURE.json)** — 디렉토리·모듈 트리는 **여기 단일 SSOT** (`sidecar architecture inject` 가 SessionStart 주입 · 사람은 `python3 serve.py` HTML 뷰어)
> · 거버넌스 → [config/commons.md](config/commons.md) (always-on · slug-keyed do/dont)
> · 이력 → [CHANGELOG.md](CHANGELOG.md) (append)

## 작업 규칙 (this repo)
- do: **어떤 구현·수정이든 완료되면 사용자가 따로 시키지 않아도 그 턴에 자동으로 `sidecar ship`** (deterministic 명령 = direct-execute · 4축 박스/확인 없이 즉시) = 전 설치 surface 한 번에 전파(pr-cycle 검증머지 → self-update 전역 CLI → shadow 슬래시 미러) · 직전에 매 사이클 문서(CHANGELOG + 설계변경 시 ARCHITECTURE/README) → 검증 선행 · config/data-only 는 `sidecar ship --no-doc` (commons `cycle-docs-pr`)
- do: 새 명령은 `modules/<name>.ts` + `cli/index.ts` 등록 + help 라인 + CHANGELOG (+ 런북형 `templates/<name>.md` · 슬래시 노출 `commands/<name>.md`) → `npx tsx cli/index.ts help` 로드 + `sidecar toolkit write`(카탈로그 100%) + 관련 스모크로 검증
- dont: `shadow` 를 빠뜨리고 `pr-cycle`+`self-update` 만 돌리기 — 새 슬래시가 picker 에 안 떠 "반영 안됨" 이 재발한다(그래서 셋을 `ship` 한 명령으로 묶었다)

## inject-lint — 잘라내기 금지, 작성 시 lint
- do: 각 inject 소스(commons·recommend·easy·prefs 등)는 **작성·편집 시점에** 자기 lint 로 lean 유지 — INJECT-OVERSIZED 개별 cap(`lint.injectCaps`) 또는 do/dont·ARCH-cell 양식 · 새 inject 추가 시 그 inject 의 lint 도 함께 추가
- dont: **inject 를 emit/런타임에 잘라내기(truncate·tail-cut) — 절대 금지**(내용 조용히 손실) · 비대하면 소스를 직접 트림해 lint 통과 · lint 없는 inject 방치
