---
name: inbox
description: |
  Cross-project handoff inbox. Invoke when the user wants to file a gap, bug,
  request, or design note that belongs in ANOTHER SSOT repo — not the one the
  agent is currently working in. The entry lands as inbox/<kind>/<slug>.md in
  the target repo (kind ∈ notes | patches | poc | rfc_drafts) so the upstream
  owner can process it without losing context. Triggers on phrases like
  "file an inbox entry", "send a patch upstream", "leave a note for <repo>",
  "this belongs in <other-repo>'s inbox".
allowed-tools: Bash
---

# inbox — cross-project handoff

## When to use

The current repo hits a limitation in another repo's substrate. The fix or feature belongs upstream. Instead of working around it locally, file a structured entry in the upstream repo's `inbox/`.

## Verbs (via the /inbox slash command)

```
/inbox list                          # enumerate inbox/<kind>/*.md in the current repo
/inbox new <kind> <slug>             # scaffold inbox/<kind>/<slug>.md from a minimal template
                                     # kind = notes | patches | poc | rfc_drafts
```

Other operations (apply, archive, PR, status lifecycle) go through plain git/gh — keep this skill minimal.

## Template

`new` writes a 5-line template — fill in body before the upstream owner processes:

```
# <slug>

**Source**: <originating repo · session · brief context>
**Kind**: <notes | patches | poc | rfc_drafts>
**Status**: filed

<body — what changed / what's needed / why>
```

## Target repo resolution

`/inbox` operates on the **current repo** (nearest `.git` walking up from cwd). For cross-repo handoff, `cd ~/core/<target-repo>` first, then invoke `/inbox new ...` there.
