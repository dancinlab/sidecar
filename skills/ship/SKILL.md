---
name: ship
description: |
  Ship a sidecar plugin change: the atomic commit + push + local
  install-sync tail of the @D ship cycle. Use when the user says
  "ship", "배포", "출시", "shipit", or asks to commit + push +
  reinstall a sidecar plugin edit. The skill bundles the mechanical
  tail (stage explicit paths → credential scan → commit → push →
  sidecar sync); the AGENT still owns the judgment part — version
  bump + version-surface lockstep + commit message — done BEFORE
  invoking /ship.
allowed-tools: Bash
---

# ship — atomic ship tail for sidecar plugin changes

`@D ship` (project.tape) + `@D g27` (commons) define the cycle. `/ship` automates only its **mechanical tail**; the judgment stays with you.

## Do this FIRST (judgment — not automated)

Per `@D g22` (version discipline), before `/ship`:

1. **Bump SemVer** on every changed plugin (patch = fix / new entry · minor = feature / format · major = breaking).
2. **Lockstep ALL version surfaces** in the same commit — `plugin.json` · `marketplace.json` entry · README plugin-table row · `CHANGELOG.md`.
3. Write the commit message (`feat(<plugin> X.Y.Z): …`).

## Then run the tail

```
/ship -m "<commit message>" <path> [<path>...]
```

`bin/ship.sh` runs, in order:

1. `git add -- <paths>` — **explicit paths only** (never `-A` / `-u`).
2. **Credential scan** the staged diff (`rpa_` · `sk-…` · `hf_…` · `AKIA`) — abort + unstage on hit.
3. `git commit -m "<msg>"`.
4. `git push origin <current-branch>`.
5. `sidecar sync` — marketplace pull → cache copy → patch `installed_plugins.json`.

## Guardrails

- **Explicit paths required** — refuses `-A` / `-u` by design (you must name paths).
- **Credential scan is non-skippable** — a match aborts the whole ship and unstages.
- **`bin/sidecar` (the CLI) changed?** Also run `hx update sidecar` afterward — `sidecar sync` refreshes plugins, not the CLI binary itself.

## Related

- `@D ship` (project.tape) · `@D g27` (commons) — the cycle SSOT.
- `sidecar sync` — the install-sync step (also standalone via `/inject`).
- `/inject` — in-session rule refresh after a ship.
