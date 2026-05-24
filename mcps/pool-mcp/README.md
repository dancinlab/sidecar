# pool-mcp

`pool` 호스트들을 Claude Code MCP 도구로 노출하는 stdio MCP 서버. JSON-RPC 2.0, newline-delimited, hexa-lang 구현 (`bin/_pool_mcp.hexa`).

## 도구

- **`mcp__pool__on(host, command, timeout?)`** — `pool on <host> <command>` 실행, `{stdout, stderr, exit_code, non_claude_load}` 반환. `non_claude_load` 는 로컬 Mac 의 비-claude CPU% 합산 (sidecar @D s9 — `claude` PID 제외, advisory 전용).
- **`mcp__pool__list(include_anima?)`** — `~/.pool/pool.json` roster 반환. pi5-akida 는 기본 제외 (sidecar @D s8 — anima 전용); `include_anima=true` 면 포함.

## 등록

`mcpServers` 필드를 `plugin.json` 에 포함 — 플러그인 활성화 시 Claude Code 가 자동 spawn (transport: stdio). 런처는 셸 read-loop: JSON-RPC 한 줄마다 `hexa run` 1회를 띄워 그 줄만 처리하고 종료한다.

## 동작 범위 (0.1.1 POC)

- `initialize` · `tools/list` · `tools/call` 3개 메서드 처리
- 메시지당 1회 디스패치 — 런처 read-loop 이 한 줄을 받을 때마다 `hexa run` 1회를 띄워 그 줄만 처리. 장수명 in-process 리더 없이도 stdio 핸드셰이크가 즉시 응답 (클라이언트가 stdin 을 닫기 전에 `initialize` 응답)
- `notifications/*` 는 silent swallow (JSON-RPC 스펙)
- 오류는 `{"error": {"code": -32xxx, "message": "..."}}` 봉투

## 0.2.0 follow-ups

per-tool `timeout` 강제, fan-out 병렬 dispatch (`hosts: []`).
