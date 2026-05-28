---
description: /msg — session-to-session messaging over a UNIX domain socket (NO MCP). Verbs — send <nick> <text...> · broadcast <text...> (= send all <text>) · listen (arm a Monitor on your socket) · who (roster table) · nick <name> · bare (status). Mailbox + roster under ~/.sidecar/msg/.
argument-hint: "<send <nick> <text> | broadcast <text> | listen | who | nick <name>>"
allowed-tools: Bash, Monitor, Read
---

!`set -e

MSG_DIR="$HOME/.sidecar/msg"
ROSTER="$MSG_DIR/roster.json"
SELF_FILE="$MSG_DIR/self"
mkdir -p "$MSG_DIR"

# ---- transport detection: socat preferred, nc -U fallback ----
HAVE_SOCAT=0; HAVE_NC=0
command -v socat >/dev/null 2>&1 && HAVE_SOCAT=1
command -v nc >/dev/null 2>&1 && HAVE_NC=1
HAVE_JQ=0
command -v jq >/dev/null 2>&1 && HAVE_JQ=1

# ---- self nick: stored file, else "anon" ----
self_nick() {
  if [ -s "$SELF_FILE" ]; then
    head -n1 "$SELF_FILE" | tr -d '[:space:]'
  else
    echo "anon"
  fi
}

# ---- resolve a nick to its socket path from roster.json ----
# roster.json is a JSON object: { "<nick>": {"sock":"...","sid":"...","ts":<n>}, ... }
# caller sets NICK_Q before calling. functions take NO positional params: the
# slash-command preprocessor rewrites dollar-N tokens with the command args.
resolve_sock() {
  if [ ! -s "$ROSTER" ]; then echo ""; return; fi
  if [ "$HAVE_JQ" = "1" ]; then
    jq -r --arg n "$NICK_Q" '.[$n].sock // empty' "$ROSTER" 2>/dev/null
  else
    # fallback: default socket path convention
    echo "$MSG_DIR/$NICK_Q.sock"
  fi
}

# ---- list all roster nicks ----
roster_nicks() {
  if [ ! -s "$ROSTER" ]; then return; fi
  if [ "$HAVE_JQ" = "1" ]; then
    jq -r 'keys[]' "$ROSTER" 2>/dev/null
  fi
}

# ---- send one JSON line to a socket path ----
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
SELF=$(self_nick)
TS=$(date +%s)

case "$VERB" in
  nick)
    NAME="${2:-}"
    if [ -z "$NAME" ]; then
      echo "! usage: /msg nick <name>" >&2
      exit 1
    fi
    printf '%s\n' "$NAME" > "$SELF_FILE"
    echo "ok: self nick = $NAME"
    ;;

  send)
    TARGET="${2:-}"
    if [ -z "$TARGET" ]; then
      echo "! usage: /msg send <nick> <text...>   (or: /msg send all <text...>)" >&2
      exit 1
    fi
    shift 2
    TEXT="$*"
    if [ -z "$TEXT" ]; then
      echo "! usage: /msg send <nick> <text...>  (text required)" >&2
      exit 1
    fi
    if [ "$HAVE_SOCAT" = "0" ] && [ "$HAVE_NC" = "0" ]; then
      no_transport_hint; exit 0
    fi
    # "send all <text>" == broadcast
    if [ "$TARGET" = "all" ]; then
      roster_nicks | while read -r RN; do
        [ "$RN" = "$SELF" ] && continue
        NICK_Q="$RN"; RP=$(resolve_sock)
        [ -z "$RP" ] && continue
        FROM_V="$SELF"; TEXT_V="$TEXT"; TS_V="$TS"; J=$(build_json)
        SOCK_PATH="$RP"; PAYLOAD="$J"
        if send_to_sock; then
          echo "  -> $RN  (sent)"
        else
          echo "  -> $RN  (peer offline — socket not live: $RP)"
        fi
      done
      echo "broadcast done (from=$SELF)"
      exit 0
    fi
    NICK_Q="$TARGET"; SOCK=$(resolve_sock)
    if [ -z "$SOCK" ]; then
      echo "! unknown nick '$TARGET' (not in roster $ROSTER). known peers:"
      roster_nicks | sed 's/^/    /'
      echo "  (peer must run /msg listen first to register)"
      exit 1
    fi
    FROM_V="$SELF"; TEXT_V="$TEXT"; TS_V="$TS"; J=$(build_json)
    SOCK_PATH="$SOCK"; PAYLOAD="$J"
    if send_to_sock; then
      echo "ok: sent to $TARGET ($SOCK)"
      echo "    $J"
    else
      echo "! peer offline — $TARGET socket not live: $SOCK"
      echo "  (ask the peer to run /msg listen)"
      exit 0
    fi
    ;;

  broadcast)
    shift 1
    TEXT="$*"
    if [ -z "$TEXT" ]; then
      echo "! usage: /msg broadcast <text...>" >&2
      exit 1
    fi
    if [ "$HAVE_SOCAT" = "0" ] && [ "$HAVE_NC" = "0" ]; then
      no_transport_hint; exit 0
    fi
    if [ ! -s "$ROSTER" ]; then
      echo "(roster empty — no peers to broadcast to. peers register via /msg listen)"
      exit 0
    fi
    roster_nicks | while read -r RN; do
      [ "$RN" = "$SELF" ] && continue
      NICK_Q="$RN"; RP=$(resolve_sock)
      [ -z "$RP" ] && continue
      FROM_V="$SELF"; TEXT_V="$TEXT"; TS_V="$TS"; J=$(build_json)
      SOCK_PATH="$RP"; PAYLOAD="$J"
      if send_to_sock; then
        echo "  -> $RN  (sent)"
      else
        echo "  -> $RN  (peer offline: $RP)"
      fi
    done
    echo "broadcast done (from=$SELF)"
    ;;

  listen)
    SELF_SOCK="$MSG_DIR/$SELF.sock"
    # upsert self into roster.json atomically (tmp + mv)
    if [ "$HAVE_JQ" = "1" ]; then
      TMP=$(mktemp "$MSG_DIR/.roster.XXXXXX")
      if [ -s "$ROSTER" ]; then
        jq --arg n "$SELF" --arg s "$SELF_SOCK" --argjson ts "$TS" \
          '.[$n] = {sock:$s, sid:$n, ts:$ts}' "$ROSTER" > "$TMP" 2>/dev/null \
          || printf '{"%s":{"sock":"%s","sid":"%s","ts":%s}}' "$SELF" "$SELF_SOCK" "$SELF" "$TS" > "$TMP"
      else
        printf '{"%s":{"sock":"%s","sid":"%s","ts":%s}}\n' "$SELF" "$SELF_SOCK" "$SELF" "$TS" > "$TMP"
      fi
      mv "$TMP" "$ROSTER"
    else
      TMP=$(mktemp "$MSG_DIR/.roster.XXXXXX")
      printf '{"%s":{"sock":"%s","sid":"%s","ts":%s}}\n' "$SELF" "$SELF_SOCK" "$SELF" "$TS" > "$TMP"
      mv "$TMP" "$ROSTER"
      echo "(jq not found — roster reset to self-only; install jq to preserve peers)"
    fi
    echo "ok: registered self in roster as '$SELF'"
    echo "    socket = $SELF_SOCK"
    echo
    if [ -S "$SELF_SOCK" ]; then
      echo "NOTE: a socket already exists at $SELF_SOCK — you may already be listening."
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

  who)
    if [ ! -s "$ROSTER" ]; then
      echo "(roster empty — $ROSTER has no peers yet. register via /msg listen)"
      exit 0
    fi
    echo "=== msg roster (self=$SELF) ==="
    printf '  %-16s %-8s %s\n' "NICK" "STATUS" "SOCKET"
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
    SELF_SOCK="$MSG_DIR/$SELF.sock"
    echo "=== msg status ==="
    echo "  self nick : $SELF"
    if [ -S "$SELF_SOCK" ]; then
      echo "  listening : yes (socket live: $SELF_SOCK)"
    else
      echo "  listening : no (run /msg listen to arm a Monitor)"
    fi
    if [ -s "$ROSTER" ] && [ "$HAVE_JQ" = "1" ]; then
      PEERS=$(jq -r 'keys | length' "$ROSTER" 2>/dev/null)
      [ -z "$PEERS" ] && PEERS=0
    elif [ -s "$ROSTER" ]; then
      PEERS="?"
    else
      PEERS=0
    fi
    echo "  roster    : $PEERS peer(s) in $ROSTER"
    TR="(none)"
    [ "$HAVE_SOCAT" = "1" ] && TR="socat"
    [ "$HAVE_SOCAT" = "0" ] && [ "$HAVE_NC" = "1" ] && TR="nc -U"
    echo "  transport : $TR"
    echo
    echo "verbs: send <nick> <text> | broadcast <text> | listen | who | nick <name>"
    ;;

  *)
    echo "! unknown verb '$VERB'" >&2
    echo "  verbs: send <nick> <text> | broadcast <text> | listen | who | nick <name> | (bare = status)" >&2
    exit 1
    ;;
esac
`
