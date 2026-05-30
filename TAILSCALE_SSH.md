# Tailscale SSH — reach `mini` from anywhere

Make `ssh mini` work from outside the LAN by putting this host on a
[Tailscale](https://tailscale.com) tailnet and enabling **Tailscale SSH**
(auth + encryption handled by `tailscaled`, no key distribution, ACL-gated).

The host stays reachable at its stable `100.x` tailnet IP / MagicDNS name no
matter which network it sits behind — no port forwarding, no public IP.

```
before                              after
──────                              ─────
 LAN only  192.168.50.39      →      tailnet 100.x.y.z  (anywhere)
 sshd ON   (key/password)     →      Tailscale SSH      (sshd stays as fallback)
```

## Decisions (sidecar `/sbs auto`)

| axis | choice | why |
|------|--------|-----|
| 표준 | Homebrew `tailscale` formula | CLI-managed `tailscaled`, headless-friendly (no GUI over SSH) |
| 완성도 | `tailscale up --ssh` | no key mgmt, ACL-gated; macOS sshd stays ON as fallback |
| 표준 | `~/.ssh/config` `Host mini` alias | MagicDNS resolves `mini`; alias pins user + 100.x fallback |
| 표준 | this runbook doc | reproducible / re-applicable to other hosts |

## One-time setup (run ON `mini`)

`tailscaled` (daemon) + `tailscale up` (auth) need **sudo + an interactive
browser login**, so run these yourself. In a Claude Code session, prefix with
`!` so the output lands in the chat:

```bash
# 1. install (already done if you ran the /sbs flow)
brew install tailscale

# 2. start the daemon as a system service (restarts at login)
sudo brew services start tailscale

# 3. join the tailnet AND enable Tailscale SSH — opens a browser to auth
sudo tailscale up --ssh
```

Step 3 prints an auth URL; approve the device in the browser. Done.

## Verify

```bash
tailscale status          # this host should be listed, "offers: ssh"
tailscale ip -4           # its stable 100.x address
```

## Connect from outside (any other tailnet device)

With **MagicDNS** (on by default) nothing else is needed — the short name
resolves tailnet-wide:

```bash
ssh mini                  # MagicDNS → mini.<tailnet>.ts.net, Tailscale SSH auths you
```

If MagicDNS is off, use the `100.x` IP, or add this to the **client's**
`~/.ssh/config` (already added to this host's config by the `/sbs` flow):

```
Host mini
    HostName mini          # or the host's `tailscale ip -4` (100.x.y.z)
    User mini
```

## Optional — register in the sidecar pool

So `pool on mini <cmd>` reaches this host over the tailnet:

```bash
sidecar pool add mini mini@mini
```

## Notes

- The macOS Remote Login (`sshd`) service is left **ON** — a LAN fallback if
  Tailscale is ever down. Tailscale SSH and `sshd` coexist on port 22; Tailscale
  SSH only intercepts connections arriving over the tailnet interface.
- Homebrew `tailscaled` on macOS runs in userspace-networking mode; Tailscale
  SSH is terminated inside `tailscaled`, so it works regardless of mode.
- To leave the tailnet: `sudo tailscale down` (reversible; `up` rejoins).
- To remove entirely: `sudo brew services stop tailscale && brew uninstall tailscale`.
