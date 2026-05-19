# wilson-pool — external-access (tailscale) design ledger

> Decisions for letting wilson-pool route heavy Bash to its roster from
> *outside the LAN* (laptop on the road, mobile network, coffee shop)
> via tailscale. Gated decision-by-decision 2026-05-19. Append
> `### Decision N` blocks as choices are made.

## Context

wilson-pool's PreToolUse router rewrites a heavy Bash command to
`ssh <host> 'cd <workdir> && <cmd>  # __SIDECAR_POOL__'` (`bin/_route.py`).
Today `<host>` resolves only on the LAN — off-LAN the SSH never lands and
routing silently falls back to local. The goal: make the roster reachable
from anywhere, ergonomically, via CLI.

## Decisions

### Decision 1 — A: `tailscale ssh <node>` (connection transport)

How does the rewritten command reach the host off-LAN?

- **A — `tailscale ssh <node>`**: tailscale-identity auth, no SSH keys,
  centrally revocable via ACL; remote one-time `sudo tailscale up --ssh`.
- B — `ssh <tailnet-name>`: tailnet provides connectivity only; existing
  SSH keys do auth.

**picked:** A (2026-05-19)

**rationale:**
- frees SSH key management — no `authorized_keys` per remote; a lost
  device is revoked from the tailnet, not by rotating keys everywhere
- device auth ≡ tailscale identity — no separate account/password;
  lost/stolen device → remove that one tailnet node
- one-line remote opt-in (`tailscale up --ssh`), then every external
  device works; wilson-pool only swaps `ssh` → `tailscale ssh`
- LAN-vs-external split handled by tailscale itself (direct when on the
  same LAN, DERP relay otherwise) — no transport branching in the router

### Decision 2 — C+A: auto-detect transport with global/per-host override

- A global bit · B per-host field · **C auto-detect** · (chosen: C + A).

**picked:** C (auto-detect) + A (global `pool.json` override) (2026-05-19)

**rationale:**
- common case is 0-config — `tailscale up --ssh` once, router auto-uses
  `tailscale ssh` when the local tailscale daemon is present, else plain
  `ssh`, else local fallback (fail-open, consistent with existing pool
  philosophy)
- one-line escape hatch — `pool.json` top-level `transport: auto |
  tailscale | ssh`; optional per-host `transport` override; no per-host
  enum proliferation (minimal-keep)
- dispatcher wraps the remote command in `bash -l -c '<cmd>'` so a
  non-login `tailscale ssh` shell still gets Homebrew/`.bash_profile`
  PATH — same wrap on plain ssh too, for consistency

### Decision 3 — B: 3 CLI verbs (tailnet · add · status)

- A minimal (`add` only) · **B 3 verbs** · C full (5+).

**picked:** B — `tailnet` / `add` / `status` (2026-05-19)

**rationale:**
- closes the discover → add → verify round-trip in the CLI alone:
  `tailnet` (list tailnet nodes: name/OS/online/in-pool), `add <node>
  [--platform]` (register + auto-detect platform + one probe), `status`
  (roster + per-host reachability + transport-in-use)
- `status` breaks the silent-failure mode — today an unreachable host
  just falls back to local with a note; `status` shows transport + probe
  result in one line
- `transport` toggle / `rm` / `ping` are over-engineering — transport is
  `auto` (D2) so the global override is a rare one-line pool.json edit;
  `status` already subsumes `ping`; `rm` is a once-a-year file edit

### Decision 4 — A: autosync unchanged for v1

- **A leave it** · B adaptive · C drift-detector · D watcher.

**picked:** A — no autosync change in v1 (2026-05-19)

**rationale:**
- smallest safe scope — D1–D3 already a meaningful patch; touching the
  sync layer too blurs "transport bug vs sync bug" when debugging
- `off` mode + the new `status` verb is enough discipline; the per-turn
  `## Pool` user-synced-mirror caveat remains the correctness invariant
- sync is orthogonal — can be added later without touching tailscale
  plumbing
- **v2 placeholder**: C drift-detector (skip rsync when no local change
  since last sync, per-host marker; `find -newer`) — add *if/when*
  external `autosync on`/`mirror` rsync friction is actually observed
  (instrument-first; do not pre-build)

## Implementation surface (for the build)

- `bin/_route.py` — transport resolution (auto-detect tailscale daemon →
  `tailscale ssh` vs `ssh`; honor `pool.json` global + per-host
  `transport`); wrap remote cmd in `bash -l -c`.
- `pool.json` schema — optional top-level `transport` + optional per-host
  `transport`. Absent ⇒ `auto`. No other schema change.
- `bin/_pool.py` (+ `commands/*.md`) — `tailnet`, `add`, `status` verbs.
- SessionStart `## Pool` block — note transport actually in use.

## Implementation status

- **v0.9.0 (this commit) — D1 · D2 · D4 LANDED in `bin/_route.py`:**
  `transport_of()` (per-host > global > auto; auto = `tailscale_live()`
  daemon probe), `login_wrap()` (`bash -lc` for non-login shell PATH),
  `roster()` parses per-host `transport`, `preflight_ok()` probes via the
  resolved transport, the autosync-off path emits `tailscale ssh` /
  `ssh` accordingly. Autosync path left on plain ssh per D4 with an
  inline caveat in the routed note. Verified locally: 5-case transport
  resolution + login_wrap (heredoc-run, routing-bypassed).
- **D3 (CLI verbs `tailnet` / `add` / `status`) — NEXT SLICE, not in
  this commit.** Clean ship boundary: the transport core is the
  external-access enabler and is self-contained; the CLI verbs are
  ergonomic discovery/debug helpers layered on `bin/_pool.py`. Tracked
  in memory `wilson-pool-tailscale-design`. The feature already works
  end-to-end via a hand-edited `pool.json` `transport` key; the verbs
  just remove the hand-edit.

## Cross-references

- `bin/_route.py` — the PreToolUse ssh rewriter (transport locus)
- `bin/_pool.py` — the `/wilson-pool` slash command (CLI verbs locus)
- `samples/pool.md` — pool.json schema sample (extend with `transport`)
