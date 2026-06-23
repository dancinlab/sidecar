# 언어/플랫폼 범용성

> 📍 SSOT: 설계 [ARCHITECTURE.json](../ARCHITECTURE.json) · 이력 [CHANGELOG.md](../CHANGELOG.md). 본 문서는 보조 언어 가이드.

사이드카 **엔진 로직은 언어 무관**이다 — git staged/commit, 파일 경로·내용 정규식, 명령 실행, JSONL 로그만 다룬다. 웹앱뿐 아니라 로컬 앱(Python·Rust·C/C++·Go·hexa)과 모바일(Swift)에 그대로 쓴다.

## 한 가지 호스트 요구사항: Node (tsx)

엔진 자체는 TypeScript 라 `tsx`(Node) 로 실행된다. 즉 **개발 머신에 Node 1개**가 필요하다. 단:

- **타깃 프로젝트 빌드와는 무관** — Rust/Swift 프로젝트에 Node 의존성을 추가하지 않는다. 사이드카만 Node 로 돈다.
- `bin/sidecar` 는 `tsx` 를 자동 탐색하고 없으면 `npx tsx` 로 받는다.
- 완전 오프라인/Node 불가 환경이면 엔진 옆에서 한 번 `pnpm install`(tsx 번들) 해두면 네트워크 없이 동작.

```
[ 내 Rust/Swift repo ] ──(코드)── 빌드: cargo / swift  (Node 무관)
        │
        └──(거버넌스)── sidecar (tsx/Node) ── lint·pre·post·folders·verify
```

## `sidecar init` 자동 감지

`init` 이 마커 파일로 스택을 감지해 `verify.checks` 와 CHANGELOG `triggerPattern` 을 자동 채운다(여러 개면 병합):

| 스택 | 감지 마커 | 기본 verify.checks |
|------|-----------|--------------------|
| node | `package.json` | `tsc --noEmit`(tsconfig 있으면) · `<pm> test` (pnpm/yarn/npm 자동) |
| python | `pyproject.toml`·`setup.py`·`requirements.txt` | `ruff check .` · `pytest -q` |
| rust | `Cargo.toml` | `cargo fmt --check` · `cargo clippy -D warnings` · `cargo test` |
| go | `go.mod` | `go vet ./...` · `go test ./...` |
| swift | `Package.swift`·`*.xcodeproj` | `swift build` · `swift test` |
| c/c++ | `CMakeLists.txt` → `cmake --build build` / `Makefile` → `make` | |
| hexa | `*.hexa` | `hexa verify` |

감지 안 되면 `verify.checks` 는 비고, 직접 채우면 된다. 생성된 명령은 **제안**이니 repo 에 맞게 수정한다(예: python 이 ruff 대신 flake8).

## 다국어 우회(bypass) 패턴

`G-ROOT-CAUSE` 규칙(번들 `enforcement.json`)이 언어별 억제 마커를 감지해 근본원인 해결을 유도한다:

| 언어 | 감지하는 우회 마커 |
|------|---------------------|
| JS/TS | `@ts-ignore` · `@ts-nocheck` · `eslint-disable` · 빈 catch · `if(false)` |
| Python | `# type: ignore` · `# noqa` · `except ...: pass` |
| Go | `//nolint` |
| Rust | `#[allow(...)]` |
| Swift | `// swiftlint:disable` |
| C/C++ | `#pragma GCC/clang diagnostic ignored` · `// NOLINT` |
| 공통 | `TODO`/`FIXME`/`HACK`/`XXX` (// 또는 #) |

정당하면 같은 줄에 `@root-cause-ok <사유>` 마커로 면제. 확장자/마커는 `.harness/enforcement.json` 에서 repo 별로 조정한다.

## L0·folders·secret 확장자

`lockdown`(L0 파싱) · `folderGuides`(폴더 가이드) · `G-SECRET-LITERAL`(비밀키) 의 대상 확장자에 ts/js/py/rb/php/go/rs/java/kt/scala/c/h/cpp/cc/cxx/hpp/m/mm/swift/dart/hexa 를 기본 포함한다. 빠진 확장자가 있으면 config 에서 추가한다.

## 예시 — Rust 프로젝트

```bash
cd my-rust-app
git submodule add https://github.com/dancinlab/sidecar .harness-engine
bash .harness-engine/bin/sidecar init   # hooks: 전역 1벌 → sidecar install
# → detected stack: rust
#   verify.checks = cargo fmt/clippy/test, changelog trigger = \.(rs)$
bash .harness-engine/bin/sidecar ci   # cargo 검증 병렬 실행
```

## 예시 — Swift 앱

```bash
cd MyApp
git submodule add https://github.com/dancinlab/sidecar .harness-engine
bash .harness-engine/bin/sidecar init   # → detected stack: swift (hooks: 전역 → sidecar install)
# .swiftlint 억제 마커, swift build/test 자동 등록
```
