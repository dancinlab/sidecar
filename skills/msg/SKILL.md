---
name: msg
description: Session-to-session messaging over a UNIX domain socket, NO MCP. `/msg send <nick> <text>` sends a one-line JSON message to another Claude Code session via `socat - UNIX-CONNECT:<peer>.sock` (fallback `nc -U`); `/msg listen` makes the AGENT arm a persistent Monitor on `socat UNIX-LISTEN:<self>.sock,fork -` so each received line becomes a chat notification; `/msg broadcast <text>` fans out to every roster peer; `/msg who` lists peers (alive marked via `test -S`); `/msg nick <name>` sets self nick; bare `/msg` shows status. Mailbox + roster live under `~/.sidecar/msg/` (local — pool-route keeps it on this host). Triggers — "/msg", "세션 메시지", "세션끼리 통신", "send to session", "socket message", "옆 세션에 보내", "inter-session", "다른 세션에 알려".
allowed-tools: Bash, Monitor, Read
---

@D msg := "session-to-session UNIX-socket mailbox — send is a socat/nc one-liner, listen arms a Monitor on the socket so received lines become chat notifications" :: skill
  do   = "send/broadcast via `socat - UNIX-CONNECT:<peer>.sock` (nc -U fallback) one-line JSON · `listen` arms a persistent Monitor on `socat UNIX-LISTEN:$HOME/.sidecar/msg/<self>.sock,fork -` so each line = a notification · roster + mailbox under $HOME/.sidecar/msg/"
  dont = "introduce an MCP server (s15) · hardcode an absolute socket path (use $HOME) · inject on every UserPromptSubmit (noise — listen is explicit, agent-armed)"
