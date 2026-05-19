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
