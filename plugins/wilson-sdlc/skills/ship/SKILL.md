---
name: ship
description: Ship a sidecar change with the dogfooded release checklist — version bump, marketplace.json registration, GROWTH §10 log entry, commit and push. Use when a reviewed, simplified change is ready to land. Stage 7 of the wilson-sdlc pipeline.
---

# Ship (wilson-sdlc · stage 7/7)

## Overview

Shipping is a checklist, not an event. This is the exact procedure this pack
ships *itself* by — the dogfood loop closes here. There is no single "ship"
plugin because shipping is a multi-step convention: version → registry →
growth log → commit. Run it the same way every time so a release is boring.

## When to Use

- A change has passed stage 5 (review) and stage 6 (simplify)
- A plugin's behavior or surface changed and needs a version
- A new plugin/skill is ready to be discoverable

## The Ship Checklist

```
version bump ──→ marketplace.json ──→ GROWTH §10 ──→ commit + push
     │                  │                 │              │
 plugin.json       register/update    append-only    Co-Authored-By
 semver (patch/    name·source·       newest-at-      trailer, push
 minor/major)      description·ver    bottom log      to origin
```

- [ ] **Version** — bump `plugins/<name>/.claude-plugin/plugin.json` `version`
      (patch = fix, minor = new behavior, major = breaking). Update the
      `description` if behavior or surface changed.
- [ ] **Registry** — add or update the entry in the repo-root
      `.claude-plugin/marketplace.json` (name · source · description ·
      version) so the plugin is discoverable and the manifest matches reality.
- [ ] **Growth log** — append one newest-at-bottom entry to the GROWTH §10
      execution log (separate repo): what shipped, why it matters, version,
      cross-link. Append-only; never rewrite prior entries.
- [ ] **Commit & push** — conventional message
      (`feat(scope): … ` / `fix(scope): …`), `Co-Authored-By` trailer, push
      to `origin`. PR-only where the project governance requires it.
- [ ] **Optional launch** — if the asset is launch-worthy, hand the GROWTH
      wave template (§2) the rest; that is a soft cross-repo reference, not a
      hard step of this stage.

## Fallback

Not a sidecar repo? The shape still holds: version the artifact, update
whatever registry/manifest makes it discoverable, record the release in the
project's changelog, then commit/push. The four boxes are tool-agnostic.
