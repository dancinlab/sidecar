# ship

Atomic ship tail for sidecar plugin changes — the commit + push + install-sync mechanical tail of the `@D ship` cycle.

## Trigger

- Slash: `/ship -m "<commit message>" <path> [<path>...]`
- Natural language: *"ship"* · *"배포"* · *"출시"* · *"shipit"*

## Do this FIRST (judgment — not automated)

Per `@D g22` (version discipline), before `/ship`:

| Step | Surface |
|---|---|
| Bump SemVer | each changed plugin's `plugin.json` |
| Lockstep | `marketplace.json` entry · README plugin-table row · `CHANGELOG.md` |
| Message | `feat(<plugin> X.Y.Z): …` |

## Then the tail (`bin/ship.sh`)

1. `git add -- <paths>` — explicit paths only (never `-A` / `-u`).
2. Credential scan the staged diff (`rpa_` · `sk-…` · `hf_…` · `AKIA`) — abort + unstage on hit.
3. `git commit -m "<msg>"`.
4. `git push origin <current-branch>`.
5. `sidecar sync` — marketplace pull → cache copy → patch `installed_plugins.json`.

## Guardrails

- Explicit paths required — refuses `-A` / `-u` by design.
- Credential scan is non-skippable — a match aborts + unstages.
- Changed `bin/sidecar` (the CLI)? Also run `hx update sidecar` — `sidecar sync` refreshes plugins, not the CLI binary.

## Related

- `@D ship` (project.tape) · `@D g27` (commons) — cycle SSOT.
- `/inject` — in-session rule refresh + `sidecar sync`.
