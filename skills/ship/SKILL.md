---
name: ship
description: Ship a sidecar plugin change — the atomic commit + push + local install-sync tail of the @D ship cycle. Triggers — "ship", "배포", "출시", "shipit", or "commit + push + reinstall this plugin". The agent owns version bump + surface lockstep + commit message FIRST, before /ship.
allowed-tools: Bash
---

@D ship := "atomic ship tail for sidecar plugin changes" :: skill
  do   = "bump SemVer + lockstep all version surfaces FIRST · then `/ship -m <msg> <path>…`"
  dont = "`/ship` with `-A`/`-u` (explicit paths only) · skip the version bump or credential scan"
