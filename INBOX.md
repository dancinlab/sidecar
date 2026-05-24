# INBOX — current state

@goal: cross-project handoff 수신함 — 다른 repo가 sidecar로 넘긴 gap·patch·note를 추적하고 해소

(현재 상태만 기록 — 열린 handoff는 `- [ ]` 로, 처리 이력은 `INBOX.log.md` 로)

- [ ] **`/micro-exp` slash command + commons.tape 거버넌스** (from demiurge RTSC 2026-05-25) — 검증-기반 micro-experiment sweep 오케스트레이터 (manifest 파싱 → rent → run → monitor → parse → atlas register) + 거버넌스 4 @D (honest_sweep · budget_cap · aggregation · pod_vs_agent_cap). H₃X sweep 등 ~100 micro-exps unlock. 상세 → `INBOX.log.md`.
- [x] **worktree/branch 하네스 4-gap** (from anima 2026-05-25) — sidecar 몫 **#4(pr-cycle `gh pr merge` cross-repo 오작동) ✅ 해소** (pr-cycle 0.3.6 — `--repo` 파싱→merge 전파 · cross-repo 시 로컬 worktree cleanup skip). 남은 **#1**(공유 .git HEAD main 이동)·**#2**(로컬 브랜치 ref 유실)·**#3**(worktree agent PR 무관파일 bundle)은 **harness-upstream**(Anthropic `isolation:worktree` 영역) — sidecar 직접 fix 불가, 추적만. 상세 → `INBOX.log.md`.
