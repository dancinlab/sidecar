# sidecar

Project-agnostic AI coding sidecar — guards, injects, and runbooks that wire a single `sidecar`
CLI into any agent via hooks. Config-driven, zero domain hardcoding; ships as a global command
(`~/.sidecar/cli` + `~/.local/bin/sidecar`, bootstrapped by `sidecar install`). One engine, two
agent surfaces: a **Claude Code plugin** (`/plugin` · `hooks/`) and a **Pi extension**
(`sidecar pi install` · `pi/`) — both call the SAME CLI; only the wiring is per-agent.

> 📍 SSOT 포인터 (이 파일 = 진입점 + 작업규칙만):
> · **구조·설계 → [ARCHITECTURE.json](ARCHITECTURE.json)** — 디렉토리·모듈 트리는 **여기 단일 SSOT** (`sidecar architecture inject` 가 SessionStart 주입 · 사람은 `python3 serve.py` HTML 뷰어)
> · 거버넌스 → [config/commons.md](config/commons.md) (always-on · slug-keyed do/dont)
> · 이력 → [CHANGELOG.jsonl](CHANGELOG.jsonl) (append)

## Project
Project-agnostic AI coding sidecar — a single config-driven engine that wires guards, context injects,
and runbooks into any agent via hooks. The engine (when/how to check) is shared; the rules (what to
check) are per-repo data. Ships as a global `sidecar` CLI driving two agent surfaces: a Claude Code
plugin (`hooks/`) and a Pi extension (`pi/`). The 60 CLI modules are agent-neutral; each surface is a
thin adapter translating that agent's hook contract to/from the CLI. Stop hard-gates are CC-only
(Pi has no blocking stop hook); per-turn injects re-assert the rules on both.

## Tree
Top-level orientation map (deep module SSOT = [ARCHITECTURE.json](ARCHITECTURE.json)):

```
sidecar/
├─ bin/        — runtime auto-detect launcher (L1 실행 입구)
├─ cli/        — index.ts 디스패처 (L2 명령 라우팅)
├─ lib/        — 공용 부품 (paths·config·log·exec·lockdown · L3)
├─ modules/    — 기능 모듈 + 코드 가드 (one file per command · L4)
├─ config/     — 번들 규칙 데이터 (commons·enforcement·severity-map · L5)
├─ hooks/      — Claude Code 플러그인 훅 배선 (hooks.json + run.sh)
├─ pi/         — Pi 코딩에이전트 브리지 확장 (sidecar.ts · 같은 CLI 를 Pi 이벤트에 배선)
├─ commands/   — 슬래시-명령 위임자 (shadow 가 미러하는 SOURCE)
├─ templates/  — 런북형 명령 가이드
└─ state/      — 작업 산출물 단일 루트 (preserve-state)
```

## 작업 규칙 (this repo)
- do: **어떤 구현·수정이든 완료되면 사용자가 따로 시키지 않아도 그 턴에 자동으로 `sidecar ship`** (deterministic 명령 = direct-execute · 4축 박스/확인 없이 즉시) = 전 설치 surface 한 번에 전파(pr-cycle 검증머지 → self-update 전역 CLI → shadow 슬래시 미러) · 직전에 매 사이클 문서(CHANGELOG + 설계변경 시 ARCHITECTURE · README 는 손댄 김에 비강제) → 검증 선행 · config/data-only 는 `sidecar ship --no-doc` (commons `cycle-docs-pr`)
- do: 새 명령은 `modules/<name>.ts` + `cli/index.ts` 등록 + help 라인 + CHANGELOG (+ 런북형 `templates/<name>.md` · 슬래시 노출 `commands/<name>.md`) → `npx tsx cli/index.ts help` 로드 + `sidecar toolkit write`(카탈로그 100%) + 관련 스모크로 검증
- do: **훅에 배선되는 기능(가드·inject·라이프사이클)을 구현·수정하면 두 agent surface 모두 배선** — CC 플러그인(`hooks/hooks.json`+`hooks/run.sh`)과 Pi 확장(`pi/sidecar.ts`) 둘 다 (CLI 본체는 공유 · 배선만 surface 별). 한쪽만 고치면 다른 에이전트에서 미반영(`wire-to-prod`)
- dont: `shadow` 를 빠뜨리고 `pr-cycle`+`self-update` 만 돌리기 — 새 슬래시가 picker 에 안 떠 "반영 안됨" 이 재발한다(그래서 셋을 `ship` 한 명령으로 묶었다) · 한 surface(CC 만/Pi 만)만 배선하고 끝내기

## inject-lint — 잘라내기 금지, 작성 시 lint (왜: 매턴 inject 비대 = context-rot → 에이전트 열화 · `commons-md-1`)
- do: 각 inject 소스(commons·recommend·easy·prefs 등)는 **작성·편집 시점에** lean 유지 — 매턴 재주입(현 ~7.5K tok) 누적 = 입력토큰↑ → 어텐션 분산 → **에이전트 멍청해짐**(transformer 구조적 · Chroma 18-model 실측)이라 lean 이 곧 성능 · INJECT-OVERSIZED 개별 cap(`lint.injectCaps`, 소스별 byte 천장 · 항목 없으면 게이트 dead) 또는 do/dont·ARCH-cell 양식 · 새 inject 추가 시 그 cap/lint 도 함께 추가
- dont: **inject 를 emit/런타임에 잘라내기(truncate·tail-cut) — 절대 금지**(내용 조용히 손실) · 비대하면 소스를 직접 트림해 lint 통과 · lint 없는 inject 방치 · injectCaps 비워 게이트 죽이기
