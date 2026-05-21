# pool

`/pool <args>` — wrap the `pool` CLI (host roster + remote exec).

## Verbs

| Form | Effect |
|---|---|
| `/pool list` | enumerate hosts (cached roster) |
| `/pool add <host>` | add a host |
| `/pool on <host> <cmd>` | run `<cmd>` on `<host>` |
| `/pool status` | roster + reachability summary |
| `/pool install tailscale` | install tailscale on local host |
| `/pool rm <host>` | remove host |
| `/pool off <host>` | mark host offline |

## Trigger

- Slash: `/pool <args>` — args pass through unchanged
- Natural language: *"pool 호스트"*, *"다른 호스트에서 돌려"*, *"remote exec"*, *"GPU 호스트에 dispatch"*, *"host 추가"*, *"pool status"*

## Related

- `commons.tape g9` — surfaces `pool` cross-project.
- sidecar `pool-route` hook — PreToolUse(Bash) suggestion that proposes `pool on <host>` when a command is host-specific.
- `/cloud` — wraps `hexa cloud` (runpod-specific dispatch; different surface).
