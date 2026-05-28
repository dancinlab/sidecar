# Changelog

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
