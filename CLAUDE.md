# harness

Project-agnostic AI coding harness — guards, injects, and runbooks that wire a single `harness`
CLI into any agent (Claude Code, etc.) via hooks. Config-driven, zero domain hardcoding; ships as a
global command (`~/.harness/cli` + `~/.local/bin/harness`, bootstrapped by `harness install`) and as a
Claude Code plugin (`/plugin`).

> 📍 SSOT 포인터 (이 파일 = 진입점 + 작업규칙만):
> · **구조·설계 → [ARCHITECTURE.json](ARCHITECTURE.json)** — 디렉토리·모듈 트리는 **여기 단일 SSOT** (`harness architecture inject` 가 SessionStart 주입 · 사람은 `python3 serve.py` HTML 뷰어)
> · 거버넌스 → [config/commons.md](config/commons.md) (always-on · slug-keyed do/dont)
> · 이력 → [CHANGELOG.md](CHANGELOG.md) (append)

## 작업 규칙 (this repo)
- do: 매 사이클 문서(CHANGELOG + 설계변경 시 ARCHITECTURE) → 검증 → **구현 후 항상 `harness ship`** = 전 설치 surface 한 번에 전파(pr-cycle 검증머지 → self-update 전역 CLI → shadow 슬래시 미러) · config/data-only 는 `harness ship --no-doc` (commons `cycle-docs-pr`)
- do: 새 명령은 `modules/<name>.ts` + `cli/index.ts` 등록 + help 라인 + CHANGELOG (+ 런북형 `templates/<name>.md` · 슬래시 노출 `commands/<name>.md`) → `npx tsx cli/index.ts help` 로드 + `harness toolkit write`(카탈로그 100%) + 관련 스모크로 검증
- dont: `shadow` 를 빠뜨리고 `pr-cycle`+`self-update` 만 돌리기 — 새 슬래시가 picker 에 안 떠 "반영 안됨" 이 재발한다(그래서 셋을 `ship` 한 명령으로 묶었다)
