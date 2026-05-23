# subagent-route

PreToolUse(Task|Agent) **관찰 전용 PoC** 훅 (v0.1.0). 막거나 재작성하지 **않음** — 그저 본다.

## 왜 PoC 인가

Claude Code 의 PreToolUse 훅 문서는 `Bash` 의 `tool_input` 형태는 잘 정의돼 있지만 `Task`/`Agent` 의 필드(`agent_type` · `prompt` · `timeout` · `isolation`)는 예시가 빈약하고, `updatedInput` 재작성도 Bash 한정으로만 검증됨. v0.1.0 는 **실제 페이로드 형태를 런타임에서 채집** 하기 위한 관찰 도구. 실제 deny + ssh 재작성은 v0.2.0 의 몫.

## 무엇을 하나

1. PreToolUse 가 `tool_name ∈ {Task, Agent}` 로 fire (matcher `Task|Agent` — 어느 이름이 떨어질지 모르므로 둘 다 등록; sibling 인 `limit-guard` 의 검증된 컨벤션과 동일)
2. `tool_input` 의 모든 키를 그대로 dump → `~/.sidecar/subagent-route.log.jsonl` (100줄 cap, `pool-route` 의 `route-log.jsonl` 패턴 미러)
3. 비-blocking `additionalContext` 3줄 advisory 발행 — Mac load 가 높을 때 `ssh mini -- claude --print --no-tty -p '<prompt>'` 로 라우팅 가능함을 알림 (실제 재작성 X)
4. SessionStart 이벤트 → 최근 5건 관찰을 `additionalContext` 로 스냅샷 (`pool-route` 의 `_emit_session_start` 패턴과 동일)
5. 항상 `exit 0` — advisory only, 절대 block 안 함

## 로그 라인 스키마

```json
{"t":"2026-05-24T..","tool_name":"Task","keys":["agent_type","prompt","isolation"],"agent_type":"general-purpose","prompt_preview":"<첫 80자>","isolation":"worktree"}
```

모든 필드 선택적 — 부재 시 빈 문자열로 채워 defensive.

## v0.2.0 로의 길

`tool_input` 페이로드 형태가 충분히 관찰되면 — (a) deny + `ssh <host> claude` 재작성 가능 여부 검증, (b) `updatedInput` 이 Agent tool 에서도 동작하는지 확인. 남은 미지수는 "Agent tool 에 대해 `updatedInput` 이 실제 적용되는가" — 문서엔 Bash 만 보장돼 있음.

## opt-out

없음 — observation only 라 옵트아웃 의미 없음.
