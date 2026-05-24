# INBOX — log

Append-only history sister of `INBOX.md`. Each entry starts with `## <ISO timestamp> — <header>` (newest on top); body = `- [x]` (done) / `- [ ]` (pending) checkbox tasks.

## 2026-05-25 — skill `--root` 빈-바이너리 + pool-route 전면 escalate (from demiurge CARDIO+)
- [ ] **#1 skill `--root` 빈-바이너리 가드** — wrapper 패턴 `H="$(command -v _<skill>.hexa)"; hexa run "$H" --root "$(dirname "$H")/.." …` 에서 `command -v` 가 빈 문자열을 반환하면 `hexa run "" --root …` → `--root` 가 첫 positional 로 소스파일 오인 → `source file not found: --root`. routed 환경(skill 바이너리 PATH 부재)서 `/imagine`·`/paper` 전면 차단. 빈-바이너리 guard 추가: `[ -z "$H" ] && { echo "skill binary _<skill>.hexa not on PATH (host=$(hostname))"; exit 127; }` (~5 LOC × N skills: imagine·paper·research·domain·inbox·ship 등 동일 패턴 전부)
- [ ] **#2 pool-route 전면 escalate (load-escalated)** — load-escalated(Mac load > 150%) 분기가 macOS-only 명령까지 무차별 ubu SSH 라우팅 → 도달 불가: `secret`(Keychain)·`pool` CLI 자체·`pdflatex`/`/Library/TeX`·`_*.hexa` skill wrapper·`/opt/homebrew` 절대경로. 또 `SIDECAR_NO_POOL_ROUTE=1` override 가 load-escalate 분기서 무시됨. fix: escalate 제외 allowlist + `SIDECAR_NO_POOL_ROUTE=1` hard-override + `pool on <host>` 자체 재escalate 금지(idempotency) (~30 LOC)
- 출처: hexa-lang `inbox/patches/sidecar-skill-root-arg-and-pool-route-escalate-2026-05-25.md` (handoff 이관 후 hexa-lang 쪽 archive). 원 리포트 #3(`hexa verify --expr` ubu-2 `verify_cli.hexa` build segfault)은 hexa-lang 소관 — 별도 추적(이 handoff 범위 밖).

## 2026-05-24 — worktree disk fill-up · 자동 prune (from anima)
- [x] `hooks/worktree-gc` 0.1.0 land — SessionStart 에서 merged linked worktree prune (threshold-gated · open-PR skip · NO opt-out)

## 2026-05-24 — agent self-merge via admin toggle (from hexa-lang PROBE r14)
- [x] `hooks/gh-api-guard` 0.1.0 + commons `@D g55` land — agent surface 의 branch-protection toggle + `gh pr merge --admin` hard-block (env-var bypass 없음)

## 2026-05-24 — `.hexa`-migrated skill 이 PATH 로 bin 못 찾음 (from anima)
- [x] resolved — command 템플릿을 `$CLAUDE_PLUGIN_ROOT/bin/_*.hexa` 절대경로로 전환 (research·domain·inbox·imagine·paper·ship)

## 2026-05-23 — hexa shim regen after rebuild (to hexa-lang)
- [x] closed — upstream 이미 해결 (hexa-lang #421·#446·#466, `hexa` 래퍼 추적됨) · sidecar #85 portable resolver 가 defense-in-depth

## 2026-05-22 — reflect hexa cloud cycle C (preflight) in /cloud (from hexa-lang)
- [x] resolved in `cloud` 0.2.0 — `preflight` verb + GPU mem-budget surface 반영
