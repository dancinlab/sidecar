# INBOX — current state

@goal: cross-project handoff 수신함 — 다른 repo가 sidecar로 넘긴 gap·patch·note를 추적하고 해소

(현재 상태만 기록 — 열린 handoff는 `- [ ]` 로, 처리 이력은 `INBOX.log.md` 로)

- [x] **`/micro-exp` (context-driven sweep) + commons.tape g63-g66** ✅ (from demiurge RTSC 2026-05-25) — skill 0.2.0 **context-driven 재설계** land (manifest 파일 없이 `/cycle`처럼 맥락에서 candidate self-enumerate · 바=현재 맥락·인자=스코프) + commons.tape **g63 honest-sweep · g64 budget-cap · g65 aggregation · g66 pod≠agent-cap** land (유저 `sidecar sign commons` 후). 상세 → `INBOX.log.md`.
- [x] **worktree/branch 하네스 4-gap** (from anima 2026-05-25) — sidecar 몫 **#4(pr-cycle `gh pr merge` cross-repo 오작동) ✅ 해소** (pr-cycle 0.3.6 — `--repo` 파싱→merge 전파 · cross-repo 시 로컬 worktree cleanup skip). 남은 **#1**(공유 .git HEAD main 이동)·**#2**(로컬 브랜치 ref 유실)·**#3**(worktree agent PR 무관파일 bundle)은 **harness-upstream**(Anthropic `isolation:worktree` 영역) — sidecar 직접 fix 불가, 추적만. 상세 → `INBOX.log.md`.
- [ ] **pool.json roster race-wipe 방어** (from demiurge RTSC 2026-05-25) — 동시 세션/agent 가 `~/.pool/pool.json` 을 비원자 rewrite → roster `hosts:[]` 로 wipe (이번 세션 실증 · `pool list` empty → ubu-1 DFT job 접근 차단 · n11bak 수동복구로 해소). 제안: **atomic write(temp→rename) · flock · empty-write guard · bak-rotation · item-merge**. 상세 → `INBOX.log.md`.
- [ ] **`/domain` 아이콘+별칭 타이틀/서브타이틀** (from anima IIT4 2026-05-25) — 도메인 문서마다 easy-mode 7요소 헤더 `🧠 IIT4 — "의식 측정자(尺)"` (아이콘·이름·별칭) 형태를 지정할 수 있게. 제안: `<NAME>.md` 에 옵션 `@title:` 필드 + `/domain title "🧠 — 의식 측정자(尺)"` 서브커맨드 + bare `/domain`·`set` 출력이 plain `active domain: IIT4` 대신 타이틀 렌더. easy plugin 7요소와 정합. 상세 → `INBOX.log.md`.
