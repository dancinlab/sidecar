# CHANGELOG

## fix: hook guards (submodule 미초기화 내성)

- `init` 이 생성하는 `.claude/settings.json` hook 들을 `[ -x .harness-engine/bin/harness ] && … || true` 로 guard — submodule 미초기화(`git submodule update --init` 전) clone 에서 `No such file` 에러 대신 조용히 통과.
- git pre-commit/pre-push hook 도 wrapper 부재 시 `exit 0` 으로 skip.
- 적용된 repo 에서 매 프롬프트마다 뜨던 `bash: .harness-engine/bin/harness: No such file or directory` 비차단 에러 제거.

## self-dogfood

- 하네스가 **자기 자신에게** 적용됨 (harness.config.json profile:default · 엔진=repo 루트, submodule 없음). `.claude/settings.json` self hooks(pre/post/prompt + prefs/easy/recommend inject) + git pre-commit(`bin/harness lint`). hardcore 자기모순(protectedBranches·no-verify 차단)은 제외해 자기 개발 흐름 보존. CHANGELOG 강제(.ts 변경 시) + 번들 enforcement(root-cause/secret/force-push) self 적용.

## 0.5.0

- **다국어 1급 지원** — 웹/JS 편향 제거. Python·Rust·C/C++·Go·Swift·hexa 로컬/모바일 앱에서 즉시 동작.
  - `harness init` 스택 자동감지: 마커 파일(Cargo.toml·pyproject·go.mod·Package.swift·CMakeLists·*.hexa…)로 `verify.checks`(cargo/pytest/swift build/…)와 CHANGELOG `triggerPattern` 자동 생성, 혼합 스택 병합.
  - `G-ROOT-CAUSE` 우회패턴 다국어화: `# type: ignore`·`# noqa`·`except: pass`(Py) · `#[allow(...)]`(Rust) · `//nolint`(Go) · `swiftlint:disable`(Swift) · `#pragma ... diagnostic ignored`·`NOLINT`(C/C++) 추가.
  - L0 파서·folderGuides·secret·root-cause 대상 확장자에 c/h/cpp/cc/cxx/hpp/m/mm/rs/go/kt/scala/php/dart/hexa 기본 포함.
  - [docs/languages.md](docs/languages.md) 추가 — 언어별 프리셋 + Node(tsx) 런타임 요구 명시(타깃 빌드와 무관).

## 0.4.0

- **CHANGELOG 갱신 강제** — `lint` 에 `CHANGELOG-MISSING`(block) 체크 추가: 소스 코드가 staged 인데 `CHANGELOG.md` 가 함께 staged 되지 않으면 차단. `lint.changelog`(file/triggerPattern/ignore) config 로 조정, docs/test/엔진 경로는 ignore.
- **`harness init` 이 git pre-commit hook 설치** — 커밋 시 `harness lint` 자동 실행으로 위 규칙이 실제 강제됨. `--no-verify` 로 우회 가능(의도된 탈출구).
- **경로 정규화** — REPO_ROOT/HARNESS_ROOT 를 realpath 로 canonical 화(macOS `/var`↔`/private/var` 심볼릭 대응) → 생성되는 wrapper/hook 경로가 항상 정확.
- `scripts/harness` wrapper 를 repo-root 기준(`$ROOT/<engine>/bin/harness`)으로 견고화.

## 0.3.0

- **`harness folders` 추가** — 서브폴더별 `CLAUDE.md` 작성 유도. `scan`(누락 폴더 목록) · `scaffold <dir>`(5칸 템플릿 생성). `post edit` hook 이 가이드 없는 소스 폴더의 파일 편집 시 그 폴더당 1회 넛지(dedupe). `folderGuides`(roots/depth/minFiles/ignore/ext) config 로 조정, 기본 enabled.
- 번들 `keywords.json` 에 `folder-guides` 트리거(폴더 구조/서브폴더/코드 탐색) 추가.

## 0.2.0

- **`harness init` 추가** (`install` alias) — 한 방 스캐폴딩: `harness.config.json`(프로젝트명 자동감지) + `.harness/{enforcement,keywords,severity-map}.json`(번들 기본 복사) + `.gitignore` 로그 무시 + `scripts/harness` 래퍼 + `.claude/settings.json` hook(`--hooks`). 기존 파일은 보존(`--force` 만 예외), `--dry-run` 으로 미리보기. 멱등(재실행 시 skip).

## 0.1.0

최초 공개 — 프로젝트-무관 AI 코딩 하네스 엔진.

- **코어 12 모듈**: `pre` · `post` · `prompt` · `lint` · `verify` · `errors` · `ledger` · `bitter-gate` · `audit` · `gc` · `handoff` · `convergence` · `sync`
- **config 주도**: 모든 프로젝트 색채를 `harness.config.json` + `.harness/*.json` 로 분리. 엔진 코드는 도메인 하드코딩 0.
- **repo-root 자동탐색**: submodule / vendor / 심볼릭링크 어느 배치든 동작 (`HARNESS_REPO_ROOT` override).
- **번들 기본 규칙**: 도메인-무관 enforcement(force-push · curl|sh · rm -rf · 비밀키 리터럴 · 우회패턴 · 인라인 hook 금지).
- **문서 3종**: 전수 설계(architecture) · 설치(install) · 확장(extending).
- 출처: 운영 중인 두 하네스(애플리케이션 본체 + 매니저)를 전수조사해 일반형으로 추출. 도메인 전용 모듈(배포/DB/SSH 등)은 제외하고 확장 패턴만 문서화.
