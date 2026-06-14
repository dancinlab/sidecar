# CHANGELOG

## 0.1.0

최초 공개 — 프로젝트-무관 AI 코딩 하네스 엔진.

- **코어 12 모듈**: `pre` · `post` · `prompt` · `lint` · `verify` · `errors` · `ledger` · `bitter-gate` · `audit` · `gc` · `handoff` · `convergence` · `sync`
- **config 주도**: 모든 프로젝트 색채를 `harness.config.json` + `.harness/*.json` 로 분리. 엔진 코드는 도메인 하드코딩 0.
- **repo-root 자동탐색**: submodule / vendor / 심볼릭링크 어느 배치든 동작 (`HARNESS_REPO_ROOT` override).
- **번들 기본 규칙**: 도메인-무관 enforcement(force-push · curl|sh · rm -rf · 비밀키 리터럴 · 우회패턴 · 인라인 hook 금지).
- **문서 3종**: 전수 설계(architecture) · 설치(install) · 확장(extending).
- 출처: 운영 중인 두 하네스(애플리케이션 본체 + 매니저)를 전수조사해 일반형으로 추출. 도메인 전용 모듈(배포/DB/SSH 등)은 제외하고 확장 패턴만 문서화.
