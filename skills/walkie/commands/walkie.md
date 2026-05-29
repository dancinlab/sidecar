---
description: 📻 /walkie — session-to-session walkie-talkie over a UNIX domain socket (NO MCP). Radio verbs — on (listen on your socket) · call <handle> <text...> · all-call <text...> (every peer) · scan (roster table) · handle <name> · arm [<handle>] (print a sub-agent's listen command for main→sub steer) · bare (status). OLD verbs (listen/send/broadcast/who/nick) still dispatch as silent aliases. Mailbox + roster under ~/.sidecar/walkie/.
argument-hint: "<on | call <handle> <text> | all-call <text> | scan | handle <name> | arm [<handle>]>"
allowed-tools: Bash, Monitor, Read
---

!`set -e

WALKIE_DIR="$HOME/.sidecar/walkie"
ROSTER="$WALKIE_DIR/roster.json"
SELF_FILE="$WALKIE_DIR/self"
mkdir -p "$WALKIE_DIR"

# ---- transport detection: socat preferred, nc -U fallback ----
HAVE_SOCAT=0; HAVE_NC=0
command -v socat >/dev/null 2>&1 && HAVE_SOCAT=1
command -v nc >/dev/null 2>&1 && HAVE_NC=1
HAVE_JQ=0
command -v jq >/dev/null 2>&1 && HAVE_JQ=1

# ---- self handle: stored file, else "anon" ----
self_handle() {
  if [ -s "$SELF_FILE" ]; then
    head -n1 "$SELF_FILE" | tr -d '[:space:]'
  else
    echo "anon"
  fi
}

# ---- resolve a handle to its socket path from roster.json ----
# roster.json is a JSON object: { "<handle>": {"sock":"...","sid":"...","ts":<n>}, ... }
# caller sets HANDLE_Q before calling. functions take NO positional params: the
# slash-command preprocessor rewrites dollar-N tokens with the command args.
resolve_sock() {
  if [ ! -s "$ROSTER" ]; then echo ""; return; fi
  if [ "$HAVE_JQ" = "1" ]; then
    jq -r --arg n "$HANDLE_Q" '.[$n].sock // empty' "$ROSTER" 2>/dev/null
  else
    # fallback: default socket path convention
    echo "$WALKIE_DIR/$HANDLE_Q.sock"
  fi
}

# ---- list all roster handles ----
roster_handles() {
  if [ ! -s "$ROSTER" ]; then return; fi
  if [ "$HAVE_JQ" = "1" ]; then
    jq -r 'keys[]' "$ROSTER" 2>/dev/null
  fi
}

# ---- key the mic: send one JSON line to a socket path ----
# caller sets SOCK_PATH + PAYLOAD before calling
send_to_sock() {
  if [ ! -S "$SOCK_PATH" ]; then
    return 2
  fi
  if [ "$HAVE_SOCAT" = "1" ]; then
    printf '%s\n' "$PAYLOAD" | socat - "UNIX-CONNECT:$SOCK_PATH" 2>/dev/null
  elif [ "$HAVE_NC" = "1" ]; then
    printf '%s\n' "$PAYLOAD" | nc -U "$SOCK_PATH" 2>/dev/null
  else
    return 3
  fi
}

# ---- build a one-line JSON message ----
# caller sets FROM_V + TEXT_V + TS_V before calling
build_json() {
  if [ "$HAVE_JQ" = "1" ]; then
    jq -cn --arg f "$FROM_V" --arg t "$TEXT_V" --argjson ts "$TS_V" '{from:$f,text:$t,ts:$ts}'
  else
    # escape backslash and double-quote for a safe one-line JSON
    ESC_T=$(printf '%s' "$TEXT_V" | sed 's/\\/\\\\/g; s/"/\\"/g')
    ESC_F=$(printf '%s' "$FROM_V" | sed 's/\\/\\\\/g; s/"/\\"/g')
    printf '{"from":"%s","text":"%s","ts":%s}' "$ESC_F" "$ESC_T" "$TS_V"
  fi
}

no_transport_hint() {
  echo "! no socket transport found (need socat or nc)."
  echo "  install: brew install socat   (macOS)   |   apt install socat   (linux)"
  echo "  nc with -U (UNIX socket) also works."
}

VERB="${1:-}"
SELF=$(self_handle)
TS=$(date +%s)

case "$VERB" in
  handle|nick)
    NAME="${2:-}"
    if [ -z "$NAME" ]; then
      echo "! usage: /walkie handle <name>" >&2
      exit 1
    fi
    printf '%s\n' "$NAME" > "$SELF_FILE"
    echo "ok: self handle = $NAME"
    ;;

  call|send)
    TARGET="${2:-}"
    if [ -z "$TARGET" ]; then
      echo "! usage: /walkie call <handle> <text...>   (or: /walkie call all <text...>)" >&2
      exit 1
    fi
    shift 2
    TEXT="$*"
    if [ -z "$TEXT" ]; then
      echo "! usage: /walkie call <handle> <text...>  (text required)" >&2
      exit 1
    fi
    if [ "$HAVE_SOCAT" = "0" ] && [ "$HAVE_NC" = "0" ]; then
      no_transport_hint; exit 0
    fi
    # "call all <text>" == all-call
    if [ "$TARGET" = "all" ]; then
      roster_handles | while read -r RN; do
        [ "$RN" = "$SELF" ] && continue
        HANDLE_Q="$RN"; RP=$(resolve_sock)
        [ -z "$RP" ] && continue
        FROM_V="$SELF"; TEXT_V="$TEXT"; TS_V="$TS"; J=$(build_json)
        SOCK_PATH="$RP"; PAYLOAD="$J"
        if send_to_sock; then
          echo "  -> $RN  (sent)"
        else
          echo "  -> $RN  (peer offline — socket not live: $RP)"
        fi
      done
      echo "all-call done (from=$SELF)"
      exit 0
    fi
    HANDLE_Q="$TARGET"; SOCK=$(resolve_sock)
    # roster-miss fallback: a peer that armed via `arm` (bind-only, unregistered)
    # still has a socket at the default path convention. send_to_sock returns 2 if
    # it isn't live, so a truly-offline peer still reports gracefully below.
    [ -z "$SOCK" ] && SOCK="$WALKIE_DIR/$TARGET.sock"
    FROM_V="$SELF"; TEXT_V="$TEXT"; TS_V="$TS"; J=$(build_json)
    SOCK_PATH="$SOCK"; PAYLOAD="$J"
    if send_to_sock; then
      echo "ok: called $TARGET ($SOCK)"
      echo "    $J"
    else
      echo "! peer offline — $TARGET socket not live: $SOCK"
      echo "  (ask the peer to run /walkie on)"
      exit 0
    fi
    ;;

  all-call|broadcast)
    shift 1
    TEXT="$*"
    if [ -z "$TEXT" ]; then
      echo "! usage: /walkie all-call <text...>" >&2
      exit 1
    fi
    if [ "$HAVE_SOCAT" = "0" ] && [ "$HAVE_NC" = "0" ]; then
      no_transport_hint; exit 0
    fi
    if [ ! -s "$ROSTER" ]; then
      echo "(roster empty — no peers to all-call. peers register via /walkie on)"
      exit 0
    fi
    roster_handles | while read -r RN; do
      [ "$RN" = "$SELF" ] && continue
      HANDLE_Q="$RN"; RP=$(resolve_sock)
      [ -z "$RP" ] && continue
      FROM_V="$SELF"; TEXT_V="$TEXT"; TS_V="$TS"; J=$(build_json)
      SOCK_PATH="$RP"; PAYLOAD="$J"
      if send_to_sock; then
        echo "  -> $RN  (sent)"
      else
        echo "  -> $RN  (peer offline: $RP)"
      fi
    done
    echo "all-call done (from=$SELF)"
    ;;

  arm)
    # arm [<handle>] — print the EXACT persistent-Monitor listen command for a
    # target session (self when no arg, else a roster peer) so a PARENT agent can
    # paste it verbatim into a SUB-agent's prompt: main->sub steer. The sub runs
    # the printed command through the Monitor tool so each inbound line surfaces
    # mid-task. Resolution mirrors `on`'s socket/log logic but does NOT bind here.
    ARM_TARGET="${2:-}"
    if [ -z "$ARM_TARGET" ]; then
      ARM_HANDLE="$SELF"
      ARM_SOCK="$WALKIE_DIR/$SELF.sock"
      ARM_LOG="$WALKIE_DIR/$SELF.inbox.log"
    else
      ARM_HANDLE="$ARM_TARGET"
      HANDLE_Q="$ARM_TARGET"; ARM_SOCK=$(resolve_sock)
      if [ -z "$ARM_SOCK" ]; then
        # not yet in roster — fall back to the default socket-path convention so
        # a parent can pre-arm a sub that hasn't registered itself yet.
        ARM_SOCK="$WALKIE_DIR/$ARM_TARGET.sock"
        echo "NOTE: '$ARM_TARGET' not in roster yet — using default socket path convention."
      fi
      ARM_LOG="$WALKIE_DIR/$ARM_HANDLE.inbox.log"
    fi
    if [ "$HAVE_SOCAT" = "0" ] && [ "$HAVE_NC" = "0" ]; then
      no_transport_hint; exit 0
    fi
    # phase-2 coexistence: if walkie-arm's capture daemon owns the socket (inbox
    # log present) the listener must tail the durable log, not bind the socket.
    if [ -f "$ARM_LOG" ]; then
      ARM_CMD="tail -n0 -f $ARM_LOG"
    elif [ "$HAVE_SOCAT" = "1" ]; then
      ARM_CMD="socat UNIX-LISTEN:$ARM_SOCK,fork -"
    else
      ARM_CMD="rm -f $ARM_SOCK; while true; do nc -lU $ARM_SOCK; done"
    fi
    echo "=== 📻 walkie arm — listen command for '$ARM_HANDLE' ==="
    echo
    echo "AGENT ACTION REQUIRED — paste the block below into the SUB-agent's prompt"
    echo "(or run it yourself). The sub must arm a persistent Monitor on this exact"
    echo "command (Monitor tool, persistent=true — NOT a plain Bash call) and react"
    echo "to each inbound line MID-TASK, then ack via /walkie call <parent> \"ack\":"
    echo
    echo "    $ARM_CMD"
    echo
    echo "Each line the Monitor surfaces is one JSON message {from,text,ts} — a STEER"
    echo "from the parent. Treat it as a high-priority interrupt to the current task."
    ;;

  on|listen)
    SELF_SOCK="$WALKIE_DIR/$SELF.sock"
    SELF_LOG="$WALKIE_DIR/$SELF.inbox.log"
    # upsert self into roster.json atomically (tmp + mv)
    if [ "$HAVE_JQ" = "1" ]; then
      TMP=$(mktemp "$WALKIE_DIR/.roster.XXXXXX")
      if [ -s "$ROSTER" ]; then
        jq --arg n "$SELF" --arg s "$SELF_SOCK" --argjson ts "$TS" \
          '.[$n] = {sock:$s, sid:$n, ts:$ts}' "$ROSTER" > "$TMP" 2>/dev/null \
          || printf '{"%s":{"sock":"%s","sid":"%s","ts":%s}}' "$SELF" "$SELF_SOCK" "$SELF" "$TS" > "$TMP"
      else
        printf '{"%s":{"sock":"%s","sid":"%s","ts":%s}}\n' "$SELF" "$SELF_SOCK" "$SELF" "$TS" > "$TMP"
      fi
      mv "$TMP" "$ROSTER"
    else
      TMP=$(mktemp "$WALKIE_DIR/.roster.XXXXXX")
      printf '{"%s":{"sock":"%s","sid":"%s","ts":%s}}\n' "$SELF" "$SELF_SOCK" "$SELF" "$TS" > "$TMP"
      mv "$TMP" "$ROSTER"
      echo "(jq not found — roster reset to self-only; install jq to preserve peers)"
    fi
    echo "ok: registered self in roster as '$SELF'"
    echo "    socket = $SELF_SOCK"
    echo
    # phase-2 coexistence: if the walkie-arm capture daemon is present it OWNS the
    # socket (two listeners can't share one UNIX socket), and every received
    # line is durably appended to <self>.inbox.log. In that case `on` must
    # RETARGET the Monitor to `tail -f <log>` instead of binding the socket.
    # No log (walkie-arm not enabled / phase-1 standalone) → keep the original
    # behavior: Monitor directly on the socket.
    if [ -f "$SELF_LOG" ]; then
      echo "NOTE: walkie-arm capture daemon detected (inbox log present) — it owns the"
      echo "      socket. Tailing the durable log instead of binding the socket."
      echo
      LISTEN_CMD="tail -n0 -f $SELF_LOG"
      echo "AGENT ACTION REQUIRED — arm a persistent Monitor on your inbox log so each"
      echo "newly captured line becomes a chat task-notification. Run this exact command"
      echo "through the Monitor tool (persistent=true), NOT a plain Bash call:"
      echo
      echo "    $LISTEN_CMD"
      echo
      echo "Each line is one JSON message {from,text,ts} a peer sent (captured by walkie-arm)."
      exit 0
    fi
    if [ -S "$SELF_SOCK" ]; then
      echo "NOTE: a socket already exists at $SELF_SOCK — you may already be on."
      echo "      if your Monitor is gone, rm it first:  rm -f \"$SELF_SOCK\""
      echo
    fi
    if [ "$HAVE_SOCAT" = "1" ]; then
      LISTEN_CMD="socat UNIX-LISTEN:$SELF_SOCK,fork -"
    elif [ "$HAVE_NC" = "1" ]; then
      LISTEN_CMD="rm -f $SELF_SOCK; while true; do nc -lU $SELF_SOCK; done"
    else
      no_transport_hint; exit 0
    fi
    echo "AGENT ACTION REQUIRED — arm a persistent Monitor on your socket so each"
    echo "received line becomes a chat task-notification. Run this exact command"
    echo "through the Monitor tool (persistent=true), NOT a plain Bash call:"
    echo
    echo "    $LISTEN_CMD"
    echo
    echo "Each line the Monitor surfaces is one JSON message {from,text,ts} from a peer."
    ;;

  scan|who)
    if [ ! -s "$ROSTER" ]; then
      echo "(roster empty — $ROSTER has no peers yet. register via /walkie on)"
      exit 0
    fi
    echo "=== 📻 walkie roster (self=$SELF) ==="
    printf '  %-16s %-8s %s\n' "HANDLE" "STATUS" "SOCKET"
    if [ "$HAVE_JQ" = "1" ]; then
      jq -r 'to_entries[] | "\(.key)\t\(.value.sock)"' "$ROSTER" 2>/dev/null \
      | while IFS="$(printf '\t')" read -r RN RP; do
          if [ -S "$RP" ]; then
            ST="alive"
          else
            ST="dead"
          fi
          MARK=""
          [ "$RN" = "$SELF" ] && MARK=" (me)"
          printf '  %-16s %-8s %s%s\n' "$RN" "$ST" "$RP" "$MARK"
        done
    else
      echo "  (jq not found — cannot parse roster table; install jq)"
    fi
    ;;

  ""|status)
    SELF_SOCK="$WALKIE_DIR/$SELF.sock"
    echo "=== 📻 walkie status ==="
    echo "  self handle : $SELF"
    if [ -S "$SELF_SOCK" ]; then
      echo "  on          : yes (socket live: $SELF_SOCK)"
    else
      echo "  on          : no (run /walkie on to arm a Monitor)"
    fi
    if [ -s "$ROSTER" ] && [ "$HAVE_JQ" = "1" ]; then
      PEERS=$(jq -r 'keys | length' "$ROSTER" 2>/dev/null)
      [ -z "$PEERS" ] && PEERS=0
    elif [ -s "$ROSTER" ]; then
      PEERS="?"
    else
      PEERS=0
    fi
    echo "  roster      : $PEERS peer(s) in $ROSTER"
    TR="(none)"
    [ "$HAVE_SOCAT" = "1" ] && TR="socat"
    [ "$HAVE_SOCAT" = "0" ] && [ "$HAVE_NC" = "1" ] && TR="nc -U"
    echo "  transport   : $TR"
    echo
    echo "verbs: on | call <handle> <text> | all-call <text> | scan | handle <name> | arm [<handle>]"
    ;;

  *)
    echo "! unknown verb '$VERB'" >&2
    echo "  verbs: on | call <handle> <text> | all-call <text> | scan | handle <name> | arm [<handle>] | (bare = status)" >&2
    exit 1
    ;;
esac
`
