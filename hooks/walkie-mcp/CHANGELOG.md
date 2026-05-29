# Changelog

## 0.1.2

- 🐛 fix idle-push 스트림 고아화 크래시. 서버가 요청마다 stateless transport를
  새로 만들고 단일 `Server`를 매번 `connect()` 하던 탓에, 두 번째 세션(다른
  Claude 창)이 붙거나 첫 세션이 후속 요청을 보내는 순간 기존 push용 SSE 스트림이
  재바인딩되며 끊겼다 — 긴 턴 도중이면 호스트가 라이브 요청에 치명적으로 처리해
  `socket connection closed unexpectedly` 로 표면화. 수정: MCP SDK 권장
  **stateful 멀티세션** 패턴 — SDK가 발급한 session id 로 transport 를 보관하고
  세션마다 전용 `Server` 를 두며, 채널 emit 은 연결된 **모든** 세션으로 fan-out.
  여러 창이 각자 push 를 받고 어느 것도 고아가 되지 않는다.

## 0.1.1

- 📻 family rename `msg-mcp` → `walkie-mcp` (walkie-talkie theme). Data dir
  `~/.sidecar/msg/` → `~/.sidecar/walkie/`; server `msg-mcp-server.mjs` →
  `walkie-mcp-server.mjs`; `mcpServers` key + `channels` displayName → `walkie`;
  launcher `_msg_mcp_up.hexa` → `_walkie_mcp_up.hexa`. Pairs with `walkie` 0.3.0
  + `walkie-arm` 0.1.1. send half is now `/walkie call`.

## 0.1.0

- msg phase-3 idle-push: HTTP/SSE-transport MCP **channels** server.
- sidecar's first non-hexa (Node) executable: `server/msg-mcp-server.mjs` on the
  official `@modelcontextprotocol/sdk` Streamable HTTP transport, fixed loopback
  broker `127.0.0.1:7717`.
- Declares `experimental["claude/channel"]`; tails `~/.sidecar/msg/<self>.inbox.log`
  from a dedicated `<self>.mcp.offset`; emits `notifications/claude/channel`
  (`📨 from <nick>: <text>`) per new line.
- `plugin.json` registers an http url-based `mcpServers` entry + a `channels`
  entry (NOT stdio command-based → sidecar @D s15 / sidecar-lint 0.9.0 pass).
- SessionStart launcher (`bin/_msg_mcp_up.hexa`): idempotent detached spawn
  (pidfile + pgrep guard), on-demand `npm install --omit=dev` (node_modules never
  committed), graceful exit 0 on node/npm-absent / no-nick / port-bound.
- receive-PUSH only; send stays the existing `/msg send` socket path.
- IDLE-PUSH is experimental (research-preview): requires Claude Code launched
  with `--dangerously-load-development-channels msg-mcp` (or `--channels msg-mcp`
  once GA) AND a first-party provider.
