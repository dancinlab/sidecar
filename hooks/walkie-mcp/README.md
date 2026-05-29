# walkie-mcp

📻 walkie **phase-3 — idle-push** receive half. An HTTP/SSE-transport MCP **channels**
server that pushes inbound session-to-session messages into a live-but-idle
Claude Code session, closing the poll gap left by phase-2.

`walkie` (0.3.0, socket call + receive) and `walkie-arm` (0.1.1, capture daemon →
`~/.sidecar/walkie/<self>.inbox.log`) already capture every inbound line durably.
But an **idle** session only drains that log on its *next turn* (a poll). This
plugin runs a local Node broker that tails the same log and emits an MCP channel
notification per new line, which the host delivers to the idle session with no
turn required.

## first non-hexa executable

This is sidecar's **first non-hexa (Node) executable**. MCP's canonical SDK is
TypeScript/Python; a hand-rolled hexa HTTP+JSON-RPC+SSE stack would be
disproportionate. The launcher (`bin/_walkie_mcp_up.hexa`) stays hexa; the server
(`server/walkie-mcp-server.mjs`) is Node + the official `@modelcontextprotocol/sdk`.

## experimental — flag required

Idle-PUSH is a **research-preview** Claude Code feature. The host only delivers
channel notifications when **both** hold:

- Claude Code is launched with **`--dangerously-load-development-channels walkie-mcp`**
  (or, once channels reach GA, `--channels walkie-mcp`); AND
- the session runs on a **first-party** Anthropic provider (Bedrock / Vertex /
  third-party providers skip channels).

Without the flag the broker still tails the log and logs each emit attempt
(`~/.sidecar/walkie/walkie-mcp.daemon.log`), but nothing is pushed into the session.

## how it works

- **transport** — Streamable HTTP (NOT stdio — sidecar @D s15: STDIO MCP
  forbidden, HTTP/SSE allowed) on a fixed loopback broker `127.0.0.1:7717`.
- **capability** — declares `experimental["claude/channel"]`, which the host
  requires (`server did not declare claude/channel capability` → skip otherwise).
- **registration** — `plugin.json` exposes an http url-based `mcpServers` entry
  plus a `channels` entry binding it as a message channel; `hx install` / plugin
  load registers it.
- **payload** — per new `{from,text,ts}` line: `notifications/claude/channel`
  with `params.content = "📨 from <handle>: <text>"` (phase-1/2 format-consistent).
- **offset** — tails from a dedicated `<self>.mcp.offset` (separate from
  walkie-arm's `<self>.offset`) so push-emit and poll-drain never contend.
- **idempotent** — one broker per machine; pidfile + pgrep guard on SessionStart,
  and `EADDRINUSE` → exit 0 (reuse the running broker).
- **dependencies** — `node_modules` is **never committed**; the SessionStart
  launcher runs `npm install --omit=dev` into `server/` on first run.

## graceful skip (s11 — no opt-out)

No env-var or flag disables this. It gates only on real preconditions, each a
clean `exit 0` (never blocks SessionStart):

- **node absent** → skip (cannot run a Node server);
- **npm absent on first run** → skip (cannot vend the SDK);
- **no self handle** (`~/.sidecar/walkie/self` unset) → skip (no inbox to tail);
- **port already bound** → reuse the running broker.

## send

receive-PUSH only. To send, use the existing `/walkie call <handle> <text>` — its
socket path is unchanged.

## steer recipe (main → sub)

The point of `walkie` is a PARENT agent actively **steering** a SUB-agent
mid-task — change priorities, feed a correction, abort a path — without waiting
for the sub to finish. `/walkie arm` makes this turnkey:

```
1. PARENT          /walkie on                 # parent arms its own listener (handle "main")
2. PARENT spawns SUB, embedding in the prompt:
       /walkie arm sub1                        # parent runs this; pastes the printed
                                               # listen command into the sub's prompt +
                                               # "arm a persistent Monitor on it and react
                                               #  to inbound STEER lines mid-task"
3. SUB             <arms the Monitor, starts multi-step work>
4. PARENT          /walkie call sub1 "STEER: skip step 3, jump to validation"
5. SUB             <Monitor surfaces the line mid-task → reacts>
6. SUB             /walkie call main "ack: skipping to validation"
```

> sub는 `/walkie arm <handle>`(소켓 bind만, roster 미등록)로 무장해도 됩니다 — 부모의 `call`이 0.3.2부터 기본-소켓(`<handle>.sock`) 폴백으로 도달합니다. sub가 `scan`(roster 등록)에도 보여야 하면 `/walkie on`을 쓰세요.

ASCII timeline:

```
  parent: on ──────call sub1 "STEER…"──────────────────► (waits for ack)
                          │ transport ~0s                       ▲
                          ▼                                      │ ack
  sub:    arm ─ work… ─ [Monitor line] ─ react ─ call main "ack"┘
                          └── agent-reaction: ~single-digit seconds ──┘
```

**benchmark** — socket transport is effectively instantaneous (`~0s`, local
UNIX domain socket); the dominant latency is the sub-agent's reaction time (the
Monitor surfaces the line, the model reads it and acts) — measured at roughly
**single-digit seconds** end-to-end.

### macOS ms-timing note

To measure sub-second latency on macOS, **BSD `date` has no `%N`** (it prints a
literal `N`). Use coreutils `gdate` or python3 instead:

```sh
gdate +%s.%3N                                   # coreutils (brew install coreutils)
python3 -c 'import time; print(f"{time.time():.3f}")'
```

The plugin itself uses whole-second `date +%s` for the message `ts` field — that
is intentional and unchanged; the ms-timing note is only for hand-benchmarking
the round trip.
