# INBOX — archive log

Cold archive of resolved INBOX entries, split off from `INBOX.log.md` when the
hot log grows past its soft cap (~20 entries). Same `## <ISO> — <header>`
format; newest archive batch on top. Hot log keeps recent + open entries for
quick scanning; cold archive preserves the full audit trail.

---

## 2026-05-24 — worktree disk fill-up · 자동 prune (from anima) ✅
- [x] `hooks/worktree-gc` 0.1.0 land — SessionStart 에서 merged linked worktree prune (threshold-gated · open-PR skip · NO opt-out)

## 2026-05-24 — agent self-merge via admin toggle (from hexa-lang PROBE r14) ✅
- [x] `hooks/gh-api-guard` 0.1.0 + commons `@D g55` land — agent surface 의 branch-protection toggle + `gh pr merge --admin` hard-block (env-var bypass 없음)

## 2026-05-24 — `.hexa`-migrated skill 이 PATH 로 bin 못 찾음 (from anima) ✅
- [x] resolved — command 템플릿을 `$CLAUDE_PLUGIN_ROOT/bin/_*.hexa` 절대경로로 전환 (research·domain·inbox·imagine·paper·ship)

## 2026-05-23 — hexa shim regen after rebuild (to hexa-lang) ✅
- [x] closed — upstream 이미 해결 (hexa-lang #421·#446·#466, `hexa` 래퍼 추적됨) · sidecar #85 portable resolver 가 defense-in-depth

## 2026-05-22 — reflect hexa cloud cycle C (preflight) in /cloud (from hexa-lang) ✅
- [x] resolved in `cloud` 0.2.0 — `preflight` verb + GPU mem-budget surface 반영
