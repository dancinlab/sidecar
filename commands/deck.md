---
description: /deck <domain> <slug> '<spec-json>' — passthrough to `hexa deck` (generic 6-domain input-deck generator · 빵틀 — emits the deck file-set into exports/<domain>/decks/<slug>/). `deck prototypes [<domain>]` · `deck domains` list known ones. Triggers — "인풋덱 만들어", "input deck", "hexa deck", "덱 생성", "시뮬 입력덱", "/deck".
argument-hint: "<domain> <slug> '<spec-json>' | prototypes [<domain>] | domains"
allowed-tools: Bash
---

!`command -v hexa >/dev/null 2>&1 && hexa deck $ARGUMENTS || echo "hexa CLI not found — install dancinlab/hexa-lang (~/.hx/bin/hexa on PATH)"`
