#!/usr/bin/env node
// walkie-mcp-server.mjs — walkie phase-3 IDLE-PUSH broker.
//
// sidecar's FIRST non-hexa (Node) executable. An HTTP/SSE-transport MCP
// "channels" server (sidecar @D s15 1.8 — STDIO MCP forbidden, HTTP/SSE allowed).
//
// WHAT IT DOES
//   Listens on a fixed loopback port (127.0.0.1:7717) via the official
//   @modelcontextprotocol/sdk Streamable HTTP transport. It declares the
//   experimental `claude/channel` capability the Claude Code host requires to
//   treat a server as a message channel, and per new line in
//   $HOME/.sidecar/walkie/<self>.inbox.log (written by the walkie-arm capture daemon)
//   emits an MCP channel notification:
//     method: "notifications/claude/channel"
//     params: { content: "📨 from <handle>: <text>", meta: { from, ts } }
//   Claude Code then PUSHES that content into the live-but-idle session that
//   has selected this channel (no turn needed) — closing walkie phase-2's poll gap.
//
//   IDLE-PUSH is gated by the host: it only delivers when Claude Code was
//   launched with `--dangerously-load-development-channels walkie-mcp` (or, once
//   channels GA, `--channels walkie-mcp`) AND on a first-party provider
//   (Bedrock/Vertex skip channels). Until a channel client connects, the server
//   still tails the log and logs each emit attempt — so the read+emit path is
//   observable even without a live client. receive-PUSH only; send stays /walkie.
//
// PORTABILITY / s11
//   No absolute paths ($HOME only). No env-var/flag disables it. Single broker
//   per machine: if the port is already bound (another session's broker), this
//   instance exits 0 (idempotent reuse). Self handle from $HOME/.sidecar/walkie/self.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const HOST = "127.0.0.1";
const PORT = 7717;
const CHANNEL_METHOD = "notifications/claude/channel";

const MSG_DIR = path.join(os.homedir(), ".sidecar", "walkie");

function log(...a) {
  // durable progress log; the launcher redirects stdout/stderr to walkie-mcp.daemon.log
  process.stdout.write(`[walkie-mcp ${new Date().toISOString()}] ${a.join(" ")}\n`);
}

function readSelfHandle() {
  try {
    const s = fs.readFileSync(path.join(MSG_DIR, "self"), "utf8").trim();
    return s || null;
  } catch {
    return null;
  }
}

// Render one captured JSON line `{from,text,ts}` into the channel payload.
// Falls back to the raw line when it is not parseable JSON (walkie-arm format-compatible).
function renderLine(line) {
  const t = line.trim();
  if (!t) return null;
  let from = "", text = "", ts = "";
  try {
    const m = JSON.parse(t);
    if (m && typeof m === "object") {
      if (typeof m.from === "string") from = m.from;
      if (typeof m.text === "string") text = m.text;
      if (m.ts != null) ts = String(m.ts);
    }
  } catch {
    /* not JSON — fall through to raw */
  }
  if (from || text) {
    return { content: `📨 from ${from || "?"}: ${text}`, meta: { from: from || "?", ts } };
  }
  return { content: `📨 ${t}`, meta: {} };
}

// Tail <self>.inbox.log from a dedicated <self>.mcp.offset (separate from
// walkie-arm's <self>.offset so the poll-drain and the push-emit never contend).
// Returns an array of { content, meta } for each new line, advancing the offset.
function drainNewLines(self) {
  const logFile = path.join(MSG_DIR, `${self}.inbox.log`);
  const offFile = path.join(MSG_DIR, `${self}.mcp.offset`);
  let size = 0;
  try {
    size = fs.statSync(logFile).size;
  } catch {
    return []; // no inbox yet
  }
  let off = 0;
  try {
    off = parseInt(fs.readFileSync(offFile, "utf8").trim(), 10) || 0;
  } catch {
    off = 0;
  }
  if (size < off) off = 0; // truncation/rotation → reset
  if (size <= off) {
    if (off === 0) {
      try { fs.writeFileSync(offFile, "0\n"); } catch {}
    }
    return [];
  }
  // read the new tail [off, size)
  let chunk = "";
  try {
    const fd = fs.openSync(logFile, "r");
    const buf = Buffer.alloc(size - off);
    fs.readSync(fd, buf, 0, buf.length, off);
    fs.closeSync(fd);
    chunk = buf.toString("utf8");
  } catch (e) {
    log("read-error", String(e));
    return [];
  }
  try { fs.writeFileSync(offFile, String(size) + "\n"); } catch {}
  return chunk.split("\n").map(renderLine).filter(Boolean);
}

async function main() {
  const self = readSelfHandle();
  if (!self) {
    log("no self handle ($HOME/.sidecar/walkie/self) — graceful exit 0");
    process.exit(0);
  }
  log(`starting broker for self=${self} on http://${HOST}:${PORT}/mcp`);

  // declare the experimental claude/channel capability (REQUIRED — the host
  // skips any server that does not declare it: "server did not declare
  // claude/channel capability").
  const server = new Server(
    { name: "walkie-mcp", version: "0.1.1" },
    { capabilities: { experimental: { "claude/channel": {} } } }
  );

  // emit a channel notification for one rendered inbound line.
  async function emitChannel({ content, meta }) {
    try {
      await server.notification({ method: CHANNEL_METHOD, params: { content, meta } });
      log(`emit ${CHANNEL_METHOD}: ${content}`);
    } catch (e) {
      // before a client connects, the transport has no peer — notification is
      // a no-op / throws "Not connected". That is expected; log and continue.
      log(`emit-skip (no channel client yet): ${content} [${String(e)}]`);
    }
  }

  // Streamable HTTP transport (stateless mode: a fresh transport per request is
  // the SDK's documented stateless pattern; we keep one server bound to the most
  // recent transport so notifications reach the connected channel client).
  const httpServer = http.createServer(async (req, res) => {
    if (!req.url || !req.url.startsWith("/mcp")) {
      res.writeHead(404).end();
      return;
    }
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });
      res.on("close", () => { transport.close(); });
      await server.connect(transport);
      // collect the request body for POSTs
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        let parsed = undefined;
        if (body) { try { parsed = JSON.parse(body); } catch {} }
        await transport.handleRequest(req, res, parsed);
      });
    } catch (e) {
      log("http-handler-error", String(e));
      if (!res.headersSent) res.writeHead(500).end();
    }
  });

  httpServer.on("error", (e) => {
    if (e && e.code === "EADDRINUSE") {
      // another session's broker already owns the port → idempotent reuse, exit 0.
      log(`port ${PORT} already bound — broker already up, exit 0`);
      process.exit(0);
    }
    log("server-error", String(e));
    process.exit(0);
  });

  httpServer.listen(PORT, HOST, () => {
    log(`listening on http://${HOST}:${PORT}/mcp`);
  });

  // tail the inbox.log: emit any backlog now, then poll for new lines. Polling
  // (1s) the LOCAL file is cheap and burns NO model tokens — the cost the walkie
  // phase-2 poll gap had was per-TURN model context, not a file stat.
  const tick = async () => {
    const lines = drainNewLines(self);
    for (const ln of lines) await emitChannel(ln);
  };
  await tick();
  setInterval(() => { tick().catch((e) => log("tick-error", String(e))); }, 1000);

  // also push promptly on fs change (best-effort; the 1s poll is the floor).
  try {
    fs.watch(MSG_DIR, (_evt, fn) => {
      if (fn === `${self}.inbox.log`) tick().catch((e) => log("watch-error", String(e)));
    });
  } catch (e) {
    log("fs.watch unavailable, polling only", String(e));
  }
}

main().catch((e) => {
  log("fatal", String(e && e.stack ? e.stack : e));
  process.exit(0);
});
