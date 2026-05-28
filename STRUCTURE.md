# STRUCTURE — sidecar 허용 구성 지정

sidecar 저장소가 가질 수 있는 **구성(composition)** 을 명시한다. by-owner 원칙(`project.tape @D s16` — 소유자 곁에 두기, 종류별 top-level 버킷 금지)을 사람이 읽을 수 있는 지도로 풀어쓴 spec이다.

루프를 닫는 세 층:

1. **규칙** — `project.tape @D s16` (terse do/dont)
2. **지도** — 이 문서 (`STRUCTURE.md` — 허용 구성을 명시)
3. **강제** — `hooks/sidecar-lint` check (8) allowlist (기계 검사, rename-proof)

> **범위 — sidecar-LOCAL.** 이 구성은 **sidecar 저장소에만** 적용된다. 형제 저장소(`anima`·`hexa-lang`·`phanes`·`demiurge`)는 `docs/`·`state/`·`archive/` 같은 종류별 디렉터리를 정당하게 사용한다(survey 확인). cross-repo 강제가 아니다.

## 허용 top-level 디렉터리 (= lint allowlist)

`sidecar-lint` check (8) 은 추적되는(`git ls-files`) top-level 디렉터리 중 아래 목록에 **없는 모든 것** 을 flag 한다. name-blocklist 가 아니라 **allowlist** 이므로 폴더명만 바꿔치기(`docs`→`documentation`)해도 빠져나가지 못한다.

| 디렉터리 | 역할 | 근거 |
|---|---|---|
| `hooks/` | hook concept 플러그인 (PreToolUse · SessionStart · PreCompact · PostCompact · LSP) | s1 — 1 plugin = 1 concept |
| `commands/` | command concept 플러그인 (`/slash`) | s1 |
| `skills/` | skill concept 플러그인 (Skill tool) | s1 |
| `agents/` | CC subagent concept 플러그인 (현재 비어있음 · 허용 예약) | s1 |
| `bin/` | CLI 진입점 (`sidecar` · 헬퍼) | — |
| `.github/` | GitHub workflow · 메타 | — |
| `.claude-plugin/` | `marketplace.json` (플러그인 매니페스트) · `profiles.json` (enable tier) | — |

그 외 추적 top-level 디렉터리는 **없다**. 위 7개가 전부다.

## 루트 reference 문서

cross-cutting 한 참고/정책 문서는 `docs/` 버킷이 아니라 **루트의 `*.md`** 로 둔다(s16). lint allowlist 는 디렉터리만 검사하므로 루트 `.md` 는 자유롭게 추가할 수 있다.

| 파일 | 역할 |
|---|---|
| `README.md` | 저장소 개요 · 설치 · 플러그인 카탈로그 |
| `CHANGELOG.md` | 날짜별 ship 로그 (commons @D g29) |
| `project.tape` (= `CLAUDE.md`) | sidecar 정체성 + 거버넌스 (`@D` 블록) · sign-gated |
| `*_POLICY.md` | 정책 문서 (`LATTICE_POLICY.md` · `CLOSURE_POLICY.md`) |
| `LIMIT.md` | real-limits-first 참고 |
| `STRUCTURE.md` | 이 문서 — 허용 구성 spec |
| `LICENSE` · `install.hexa` | 라이선스 · hx 빌드 훅 |

## 도메인쌍 관례 (by-owner의 심장)

진행 추적은 종류별 `notes/`·`audit/` 버킷이 아니라 **도메인쌍** 으로 소유자 곁에 둔다. 각 도메인 = 두 파일:

| 파일 | 내용 |
|---|---|
| `<NAME>.md` | snapshot — `@goal:` 최종 목표 + `- [ ]` 진행 milestone |
| `<NAME>.log.md` | append-only step 로그 (과거 항목 수정 금지) |

- **NAME** = 대문자 시작, 대문자/숫자/`-`/`+` 허용 (`_` 거부 · `+` 는 meta-domain 합성). 예: `POOL-OFFLOAD`.
- 루트 `DOMAINS.tape` 가 **roster**(NAME→경로)를 보유 — authoritative 하므로 도메인쌍이 어느 경로에 있어도 된다. progress/`@goal` 은 snapshot 에서 **derived** (roster 는 milestone flip 에 churn 하지 않음).
- SSOT = `/domain` 스킬 (`skills/domain/SKILL.md`). 생성/선택/골/milestone/done/list 는 모두 `/domain` 으로.

이 저장소의 live 예시: `DESIGN`·`GH-STACK`·`POOL-OFFLOAD`·`SIDECAR` (각각 `<NAME>.md` + `<NAME>.log.md`).

## where-goes — 산출물별 거처

| 산출물 | 거처 |
|---|---|
| 플러그인 코드/자산 | 해당 플러그인 디렉터리 (`hooks/<x>/` · `commands/<x>/` · `skills/<x>/`) |
| cross-cutting 정책/참고 문서 | 루트 `*.md` (s16 — `docs/` 금지) |
| 도메인 진행 추적 | `<NAME>.md` + `<NAME>.log.md` 쌍 + `DOMAINS.tape` 등록 |
| 임시 스크래치 | `drafts/` (gitignored — 절대 commit 안 됨 · `/draft` 스킬) |
| 런타임/마커/빌드 산출물 | **저장소 밖** — `$CLAUDE_PLUGIN_DATA` · `$HOME/.sidecar/` · hx-managed (s3 — 이식 가능 스크립트는 절대경로 금지) |

## 금지 — 종류별 top-level 버킷

종류(KIND)별 top-level 소스 디렉터리는 금지한다. 도메인(소유자)으로 묶지 종류로 묶지 않는다(s16).

- 금지 예: `docs/` · `state/` · `notes/` · `audit/` — **및 이름만 바꾼 동치**(`documentation/` · `tmp/` 등).
- lint allowlist 는 추적되는 top-level 디렉터리 중 허용 7개에 없는 **모든 것** 을 flag 하므로, 폴더명 바꿔치기로 못 빠져나간다(rename-proof).
- gitignored 런타임/스크래치(`drafts/` · `build/` · `state/` 등)는 `git ls-files` 에 안 잡혀 false-fire 하지 않는다.

## 정전(canonical) 레이아웃

```
sidecar/
├── hooks/                 # hook 플러그인 (concept · s1)
├── commands/              # command 플러그인 (concept · s1)
├── skills/                # skill 플러그인 (concept · s1)
├── agents/                # CC subagent 플러그인 (concept · 예약)
├── bin/                   # CLI — sidecar + 헬퍼
├── .github/               # GitHub 메타
├── .claude-plugin/        # marketplace.json · profiles.json
├── project.tape           # = CLAUDE.md — 정체성 + 거버넌스 (sign-gated)
├── README.md              # 개요
├── CHANGELOG.md           # ship 로그
├── STRUCTURE.md           # 이 문서 — 허용 구성 spec
├── *_POLICY.md            # 정책 (LATTICE · CLOSURE)
├── LIMIT.md               # real-limits 참고
├── DOMAINS.tape           # 도메인 roster (NAME→경로)
├── <NAME>.md              # 도메인 snapshot (@goal + milestones)
└── <NAME>.log.md          # 도메인 append-only 로그
    # (drafts/ · runtime state 는 gitignored / 저장소 밖)
```

## 참조

- 규칙: `project.tape` `@D s16` (co-locate by owner — no top-level kind-folders)
- 강제: `hooks/sidecar-lint` check (8) — top-level allowlist (rename-proof)
- 도메인쌍 SSOT: `/domain` 스킬 (`skills/domain/SKILL.md`)
