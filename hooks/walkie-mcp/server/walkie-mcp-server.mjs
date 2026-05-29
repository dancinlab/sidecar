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
//   Claude Code then PUSHES that content into the live-but-idle session(s) that
//   have selected this channel (no turn needed) — closing walkie phase-2's poll gap.
//
//   IDLE-PUSH is gated by the host: it only delivers when Claude Code was
//   launched with `--dangerously-load-development-channels walkie-mcp` (or, once
//   channels GA, `--channels walkie-mcp`) AND on a first-party provider
//   (Bedrock/Vertex skip channels). Until a channel client connects, the server
//   still tails the log and logs each emit attempt — so the read+emit path is
//   observable even without a live client. receive-PUSH only; send stays /walkie.
//
// TRANSPORT — STATEFUL, ONE SESSION PER CLIENT (0.1.2 fix)
//   Server-initiated push needs a LONG-LIVED SSE stream. The SDK's stateless mode
//   (sessionIdGenerator: undefined) tears down per request, so binding ONE shared
//   Server to a fresh transport on EVERY request orphaned the previous client's
//   push stream — when a second session (another Claude window) connected, or the
//   first session issued any follow-up request, the live stream was rebound and
//   closed mid-turn, surfacing host-side as "socket connection closed
//   unexpectedly". Fix: stateful transports keyed by the SDK-minted session id,
//   one dedicated Server per session, and channel emits fan out to EVERY connected
//   session — so multiple windows each receive the push and none is orphaned.
//
// PORTABILITY / s11
//   No absolute paths ($HOME only). No env-var/flag disables it. Single broker
//   per machine: if the port is already bound (another session's broker), this
//   instance exits 0 (idempotent reuse). Self handle from $HOME/.sidecar/walkie/self.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

const HOST = "127.0.0.1";
const PORT = 7717;
const VERSION = "0.1.2";
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

// Collect a request body (POST) then hand the parsed JSON to cb. GET/DELETE carry
// no body (cb(undefined)) — they are routed straight to the persistent transport.
function collectBody(req, cb) {
  if (req.method === "GET" || req.method === "DELETE") { cb(undefined); return; }
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let parsed = undefined;
    if (body) { try { parsed = JSON.parse(body); } catch {} }
    cb(parsed);
  });
  req.on("error", () => cb(undefined));
}

async function main() {
  const self = readSelfHandle();
  if (!self) {
    log("no self handle ($HOME/.sidecar/walkie/self) — graceful exit 0");
    process.exit(0);
  }
  log(`starting broker for self=${self} on http://${HOST}:${PORT}/mcp`);

  // One MCP session per connected channel client (each Claude Code window that
  // selected this channel). Keyed by the SDK-minted session id. A SHARED single
  // Server rebound on every request orphaned long-lived push streams (the phase-3
  // crash); a per-session Server + persistent stateful transport keeps every
  // client's push stream alive independently.
  const sessions = new Map(); // sessionId -> { server, transport }

  function buildChannelServer() {
    // declare the experimental claude/channel capability (REQUIRED — the host
    // skips any server that does not declare it: "server did not declare
    // claude/channel capability").
    return new Server(
      { name: "walkie-mcp", version: VERSION },
      { capabilities: { experimental: { "claude/channel": {} } } }
    );
  }

  // emit a channel notification for one rendered inbound line — fan out to EVERY
  // connected channel client so multiple windows each receive the push.
  async function emitChannel({ content, meta }) {
    if (sessions.size === 0) {
      // before any client connects, the transport has no peer — expected; the
      // line is still drained from the offset and remains available to the
      // walkie-arm poll path. Log and continue.
      log(`emit-skip (no channel client yet): ${content}`);
      return;
    }
    for (const [sid, { server }] of sessions) {
      try {
        await server.notification({ method: CHANNEL_METHOD, params: { content, meta } });
        log(`emit ${CHANNEL_METHOD} → ${sid}: ${content}`);
      } catch (e) {
        log(`emit-error → ${sid}: ${content} [${String(e)}]`);
      }
    }
  }

  // Streamable HTTP transport in STATEFUL mode: the SDK mints a session id on
  // initialize; that session's transport persists across the standalone GET SSE
  // stream (server push), follow-up POSTs, and DELETE teardown.
  const httpServer = http.createServer((req, res) => {
    if (!req.url || !req.url.startsWith("/mcp")) {
      res.writeHead(404).end();
      return;
    }

    const sid = req.headers["mcp-session-id"];

    // existing session → route to its persistent transport.
    if (typeof sid === "string" && sessions.has(sid)) {
      collectBody(req, (parsed) => {
        sessions.get(sid).transport.handleRequest(req, res, parsed).catch((e) => {
          log("handle-error", String(e));
          if (!res.headersSent) res.writeHead(500).end();
        });
      });
      return;
    }

    // no/unknown session → only a POST `initialize` may open a new one.
    collectBody(req, async (parsed) => {
      if (req.method !== "POST" || !isInitializeRequest(parsed)) {
        res.writeHead(400, { "content-type": "application/json" }).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "Bad Request: no valid session (initialize first)" },
            id: null,
          })
        );
        return;
      }
      try {
        const server = buildChannelServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            sessions.set(id, { server, transport });
            log(`session open ${id} (clients=${sessions.size})`);
          },
        });
        transport.onclose = () => {
          const id = transport.sessionId;
          if (id && sessions.delete(id)) log(`session close ${id} (clients=${sessions.size})`);
        };
        await server.connect(transport);
        await transport.handleRequest(req, res, parsed);
      } catch (e) {
        log("init-error", String(e));
        if (!res.headersSent) res.writeHead(500).end();
      }
    });
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
