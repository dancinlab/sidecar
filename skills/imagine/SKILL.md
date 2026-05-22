---
name: imagine
description: Generic AI image generator — backends fal (default, gpt-image-2) and openai (gpt-image-1); API keys via `secret get`. Triggers — "이미지 생성", "이미지 만들어", "그림 그려줘", "generate an image", "draw a cover", "make a teaser", "fal.ai image", "openai image".
allowed-tools: Bash
---

@D imagine := "generic AI image generator (fal · openai)" :: skill
  do   = "`/imagine <prompt-file> <out.png> [-s size] [-b backend]` · prompt from file · key via `secret`"
  dont = "inline prompt on argv · echo/leak API keys · silently swap off the gpt-image-2 default"
