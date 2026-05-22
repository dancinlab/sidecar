---
name: kick
description: Wrap `hexa kick --seed "<expr>"` — the hexa-lang gap-breakthrough / discovery engine (aliased to `hexa drill`). Triggers — "kick this", "gap breakthrough on", "discover for", "발산", "돌파해줘", "이거 hexa kick 해", "hexa drill <X>". The natural-language arg passes straight to --seed.
allowed-tools: Bash
---

@D kick := "wrap `hexa kick` — gap-breakthrough / discovery engine" :: skill
  do   = "`/kick <seed>` joins all args into `hexa kick --seed <seed>` · paste output verbatim"
  dont = "LLM-only ideation when an engine-driven gap traversal is what's wanted"
