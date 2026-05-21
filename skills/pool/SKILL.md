---
name: pool
description: |
  Wrap the `pool` CLI (host roster + remote exec — minimal Python,
  zero deps). Invoke when the user wants to list hosts, dispatch a
  command to a host, check status, or manage the roster. Triggers
  on phrases like "pool 호스트", "다른 호스트에서 돌려", "remote
  exec", "GPU 호스트에 dispatch", "host 추가", "pool status".
allowed-tools: Bash
---

# pool — wrap the `pool` CLI

## When to use

Heavy / deterministic / host-specific work that shouldn't run on the current shell — Mac-only tools (swift · xcodebuild), GPU work, build sweeps, host-specific test runs. Per `commons.tape g9`, `pool` is the canonical CLI for the host roster + remote-exec pattern.

## Verbs (pass-through)

```
/pool list                       enumerate hosts (cached roster)
/pool add <host>                 add a host
/pool on <host> <cmd>            run <cmd> on <host>
/pool status                     roster + reachability summary
/pool install tailscale          install tailscale on the local host
/pool rm <host>                  remove a host
/pool off <host>                 mark a host offline
```

## Related

- `commons.tape g9` — surfaces `pool` as an available CLI cross-project.
- `pool-route` hook (sidecar) — auto-suggests `pool on <host> <cmd>` when a command looks host-specific.
- `hexa cloud` (`/cloud` wrapper) — runpod-specific cloud dispatch (different surface from `pool`).
