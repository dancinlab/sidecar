---
name: inbox
description: Cross-project handoff inbox — file a gap, bug, request, or design note that belongs in another repo's SSOT as inbox/<kind>/<slug>.md (kind ∈ notes | patches | poc | rfc_drafts). Triggers — "file an inbox entry", "send a patch upstream", "leave a note for <repo>", "this belongs in <other-repo>'s inbox".
allowed-tools: Bash
---

@D inbox := "cross-project handoff inbox" :: skill
  do   = "`/inbox new <kind> <slug>` files inbox/<kind>/<slug>.md in the target repo (cd there first)"
  dont = "work around an upstream gap locally instead of filing it · file in the wrong repo"
