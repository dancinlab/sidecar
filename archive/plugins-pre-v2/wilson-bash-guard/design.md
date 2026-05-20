# Design

> Step-by-step decision gate audit trail. One decision per gate, never batched. See `/wilson-decision-gate sample` for the full convention.

---

## Decisions

### Decision 1 — wilson-bash-guard 에 cwd-suicide 분기 추가 — git worktree remove · rm -rf · rmdir 가 현재 cwd(또는 ancestor) 를 가리키면 PreToolUse 에서 block
- **picked**: wilson-bash-guard 에 cwd-suicide 분기 추가 — git worktree remove · rm -rf · rmdir 가 현재 cwd(또는 ancestor) 를 가리키면 PreToolUse 에서 block
- **rationale**:
  - 실 사례에서 git worktree remove --force 가 자기 cwd 를 지워 이후 모든 hook posix_spawn ENOENT — 같은 sidecar 가 막을 수 있는 명확한 패턴
  - 새 플러그인 대신 기존 bash-guard 에 분기 — 한 PreToolUse Bash hook 안의 같은 카테고리(catastrophic destructive shell)
  - realpath 비교로 symlink(/var↔/private/var) 흡수하고, 같은 체인 prior cd 가 있으면 user 우회로 간주해 skip — false-positive 0

### Decision 2 — cross-session-cwd-suicide 까지 cover — 본 세션이 *다른 active 세션의 cwd* 를 지우는 명령도 0.3.0 에서 block
- **picked**: cross-session-cwd-suicide 까지 cover — 본 세션이 다른 active 세션의 cwd 를 지우는 명령도 0.3.0 에서 block
- **rationale**:
  - 2026-05-20 transcript — 본 세션의 cwd `/private/tmp/wt-final3-77395` 가 외부 (다른 세션 or 수동 명령) 에서 삭제되어 posix_spawn ENOENT 가 6+2번 burn; 0.2.0 의 self-cwd-suicide 가드는 *본 세션의 명령*만 검사하므로 이 axis 는 사각지대
  - parallel-agent / Agent isolation worktree 워크플로우에서 sibling 세션이 isolated 워크트리를 cleanup 하다 다른 세션의 cwd 를 죽이는 패턴이 반복 가능 — guardrail 가치가 충분
  - 메커니즘이 이미 존재: Claude Code 가 `~/.claude/projects/<sha>/<sessionId>.jsonl` 에 transcript 를 쓰고 각 라인에 `cwd · sessionId · timestamp` 필드가 있음. 최신 라인 cwd + 파일 mtime 으로 active 세션 set 을 비용 없이 산출 가능 — 새 외부 의존성 0
  - one-plugin-one-guardrail 유지 — 새 플러그인 대신 wilson-bash-guard 의 cwd-suicide 카테고리에 axis 확장 (self → self + cross-session)

### Decision 3 — active session detection: transcript mtime scan (`~/.claude/projects/**/*.jsonl`) — 외부 도구 없음
- **picked**: transcript mtime scan — `~/.claude/projects/**/*.jsonl` 살아있는 파일들의 마지막 라인 cwd 를 active set 으로
- **rationale**:
  - probe 결과 (2026-05-20) jsonl 라인에 `cwd · sessionId · timestamp` 필드 모두 존재 — 메커니즘 바로 가능, 새 인프라 0
  - 비용 = 디렉토리 1 scandir + 살아있는 jsonl 마다 마지막 라인 1 read (수 ms) · PreToolUse 가산 부담 작음
  - 옵션 B (lsof/ps) 는 macOS sandbox 권한 거부 위험 + platform 분기 필요 + lsof 자체 수십 ms — minimal-keep 위반
  - 옵션 C (lockfile) 는 SessionStart/End lifecycle 추가 surface + crash 시 stale cleanup 미보장 → 결국 mtime TTL 필요해 A 와 합쳐짐 — 새 hook 추가 ROI 없음

### Decision 4 — liveness TTL: 60 minutes default · `SIDECAR_BASH_GUARD_SESSION_TTL_MIN` 으로 user override
- **picked**: 60min default + env override — `SIDECAR_BASH_GUARD_SESSION_TTL_MIN=<n>` (0 = cross-session axis off, escape hatch)
- **rationale**:
  - Claude Code 세션은 메시지마다 transcript line 추가 → mtime 갱신 — 60min 침묵 = 사실상 사용 안 함
  - 60min 은 false-positive (stale 보호) 와 false-negative (active 놓침) 의 중립점 — 점심·휴식 정도는 보호, 어제 닫은 세션은 stale 처리
  - 환경변수 override → 워크플로우 차이 (parallel-agent 多 / 한 세션 길게) 를 디폴트에 강제 인코딩 안 함, 0 으로 set 하면 0.2.0 self-only 동작 그대로
  - 옵션 B (24h) 는 의도적 cleanup 차단 빈발 → warning fatigue, 옵션 C (5min) 는 본 케이스 같은 active 사용자도 stale 분류 → 가드 무용
