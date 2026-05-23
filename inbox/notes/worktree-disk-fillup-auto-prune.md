---
status: resolved
---
# sidecar inbox/notes: worktree disk fill-up · 자동 prune 후보

## 해결 (2026-05-24)
✅ `hooks/worktree-gc/` 0.1.0 — SessionStart hook 으로 land (idea A+B+C 통합 형태). threshold-gated (linked-count >= 3 OR avail < 20 GiB), merged-branch / origin-gone candidate 만 prune, open-PR worktree 는 skip. NO opt-out.

- **filed**: 2026-05-24 (anima session, PURE /cycle-full turn-2 round)
- **source-repo**: dancinlab/anima
- **destination**: dancinlab/sidecar (or any commons-level hook surface)
- **kind**: 트러블슈팅 + 자동 처리 design candidate

## 문제 (트러블슈팅 record)

cycle-full turn-2 round 의 5-agent fan-out 중 3 agent 가 worktree 생성 단계에서 `No space left on device` 로 실패.

| metric | 발견 시점 |
|--------|----------|
| `df -h /System/Volumes/Data` | **897 GiB used / 4.9 GiB avail (100% capacity)** |
| `git worktree list \| wc -l` | 30+ (전부 `locked`) |
| 단일 worktree 크기 (`du -sh .claude/worktrees/agent-*`) | 약 4-5 GB 각각 (full repo checkout · ~33k files) |
| 누적 worktree 디스크 | **150 GB+** (워크트리 잔여만) |
| `gh pr list --state merged --limit 200` 와 cross-ref | 30 worktree 중 **15 이상이 이미 머지된 PR** |

수동 1-batch cleanup (15 worktree force remove) 으로 4.9 GiB → 35 GiB 회복.

## 원인 분석

- `cycle` skill 의 fan-out 이 각 background Agent 에게 `isolation: worktree` 옵션을 부여 → agent 종료 후 worktree 자동 정리 안 됨
- agent 종료 후 worktree 는 `locked` 상태로 남아 `git worktree prune` 으로 회수 불가
- 머지된 PR 의 worktree 도 lock 유지 → 누적 디스크 압박
- agent JSONL 트랜스크립트는 별도 (`tasks/<agentId>.output`) 라 worktree 자체는 코드 변경 머지 후 obsolete

## 자동 처리 아이디어 후보 (sidecar hook / cron)

### A. PostToolUse hook — agent 종료 후 worktree 자동 unlock + remove

```jsonc
// .claude/hooks/agent-worktree-cleanup.json
{
  "matcher": "Agent",
  "command": "agent-worktree-cleanup.hexa --agentId $CLAUDE_AGENT_ID --status $CLAUDE_AGENT_STATUS"
}
```

agent 가 종료될 때 (status = completed/failed) 해당 worktree 가 머지된 branch 면 즉시 prune. open 이면 retention TTL (예: 7d) 부여.

### B. cron — 주기적 stale worktree GC

```
0 */6 * * * /Users/ghost/.local/bin/sidecar-worktree-gc --merged-only --min-age 1h
```

- `gh pr list --state merged` 와 worktree branch cross-reference
- 머지된 PR worktree → unlock + force remove + prune
- open PR worktree → skip (사용자 작업 보호)
- log: `~/.cache/sidecar/worktree-gc.log`

### C. SessionStart hook — 세션 진입 시 디스크 임계 경보

```
df -h /System/Volumes/Data → if Used > 90%, emit warning + offer auto-cleanup
```

cycle fan-out 직전 디스크 fail-fast → 사용자에게 정리 옵션 제시.

### D. cycle skill 내부 guard

`Agent({ isolation: "worktree" })` 호출 전 디스크 체크:
- avail < 10 GB → 자동 cleanup (merged-only) 시도 후 재시도
- avail < 5 GB → 사용자 confirm 요청

### E. agent 종료 시 worktree 자동 remove (--detach 동시 보존)

```bash
# in agent harness wrapper
git worktree remove --force "$WT_PATH" 2>/dev/null
git branch --detach "$WT_BRANCH"   # branch 만 보존, 파일은 머지/origin 에서 회수
```

worktree 파일은 GC, branch ref 만 보존 → 디스크 절감 + branch 복구 가능.

### F. lazy worktree (copy-on-write)

macOS APFS clonefile / Linux `cp --reflink` 로 worktree 가 read-only base 와 변경분만 디스크 점유 → 워크트리 30개 = 30 × 4GB 가 아닌 ~30 × 100 MB 변경분만 점유.

상위 sidecar 가 OS-level CoW 지원 시 worktree create 시 자동 적용.

## 권장 우선순위

| 순위 | 아이디어 | 구현 비용 | 효과 | 비고 |
|------|---------|----------|------|------|
| 1 | **B cron** | 낮음 (~50 LoC sh) | 90% — 누적 방지 | 가장 빠른 ship · destructive 게이트 필수 |
| 2 | A PostToolUse hook | 중 (hook spec + agent wrapper) | 70% — 실시간 정리 | cron 보완 |
| 3 | C SessionStart 경보 | 낮음 | 30% — 인지만 | UX 개선, 정리 자체는 별도 |
| 4 | D cycle internal guard | 중 (skill 수정) | 50% — 발사 직전 정리 | 본 incident 직접 예방 |
| 5 | E branch-only retention | 낮음 | 95% — disk 면 | branch 폭증 trade-off |
| 6 | F CoW worktree | 높음 (OS-specific) | 95% — file 면 | git 자체 지원 부족, 자작 필요 |

## anima-side 즉시 조치 (incident response · 본 turn 완료)

- [x] 머지된 PR worktree 15개 force remove (batch 1) — disk 4.9 → 35 GiB
- [ ] 나머지 머지된 worktree 정리 (~43 미정리)
- [ ] failed 3 agent (dispatcher hexa-port · CLAUDE.md eval · bilingual_mi) 재발사

## meta

- 본 note 는 sidecar 자동 처리 검토용. 채택 시 → sidecar `commands/` + `hooks/` 또는 별도 plugin 으로 land.
- 만약 dancinlab/sidecar 가 PR 아닌 직접 commit 정책이면 본 note 가 spec 으로 활용 가능.
- 관련 메모: anima `feedback_cross_machine_dispatch` + `feedback_no_scale_caps` + `project_lora_session_2026_05_22` (다수 cycle 패턴이 worktree 누적 주요인)
