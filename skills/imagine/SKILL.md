---
name: imagine
description: |
  Generic AI image generator. Invoke when the user wants to generate
  an image from a text prompt — covers, schematics, teasers, concept
  art, social-media assets, paper figures. Triggers on phrases like
  "이미지 생성", "이미지 만들어", "그림 그려줘", "generate an image",
  "draw a cover", "make a teaser", "fal.ai image", "openai image".
  Backend-agnostic: `fal` (default · fal.ai queue+poll · gpt-image-2
  default model) or `openai` (direct /v1/images/generations sync ·
  gpt-image-1 default). Both pull API keys via `secret get
  {fal,openai}.api_key` — no env-var leak. Canonical size names
  translate per-backend (square_hd · landscape_16_9 · portrait_16_9 ·
  square). Prompt always read from a file so the verbatim text stays
  on disk for provenance.
allowed-tools: Bash
---

# imagine — generic AI image generator

## When to use

- *"이미지 만들어 줘"* / *"generate an image of …"* → `/imagine <prompt> <out.png>`
- *"표지 그려"* / *"draw a cover"* → `/imagine <prompt> cover.png -s square_hd`
- *"가로 이미지"* / *"landscape banner"* → `/imagine <prompt> banner.png -s landscape_16_9`
- *"OpenAI 직접"* / *"use OpenAI"* → `/imagine <prompt> out.png -b openai`

The slash command writes the resulting PNG to the path you give and
echoes byte size to stdout.

## Verbs

```
/imagine <prompt-file> <out.png> [-s <size>] [-b <backend>] [-m <model>]
/imagine list                          # backends + size catalogue
/imagine help
```

## Backends

| Backend | Endpoint | Pattern | Key | Default model |
|---|---|---|---|---|
| `fal` (default) | `queue.fal.run/openai/gpt-image-2` | queue (3s × 80 poll) | `secret get fal.api_key` | **`openai/gpt-image-2`** |
| `openai` | `api.openai.com/v1/images/generations` | sync | `secret get openai.api_key` | `gpt-image-1` |

**`gpt-image-2` is the firm default and the recommended model.** Do not
silently substitute another model — `-m <model>` is the only way to opt
out (e.g. `-b fal -m fal-ai/flux/dev`, `-b openai -m dall-e-3`), and you
should pick the override deliberately, not as a fallback.

## Canonical sizes

| Token | Pixels | OpenAI map |
|---|---|---|
| `square_hd` (default) | 1024×1024 | `1024x1024` |
| `square` | 512×512 | `1024x1024` (OpenAI floor) |
| `landscape_16_9` | 1792×1024 | `1536x1024` |
| `portrait_16_9` | 1024×1792 | `1024x1536` |

fal.ai uses the tokens directly; OpenAI uses the pixel form.

## Provenance discipline

The prompt **must** be in a file — `/imagine inline prompts no good`.
This is intentional: it keeps the verbatim text on disk so the figure
is reproducible later, and so the prompt never appears on argv (no
`ps aux` / shell-history leak, no log dump). Pair with the `paper`
plugin convention of storing prompts under `figures/_prompts/<name>.txt`.

Caption AI-generated figures with a provenance marker:

```latex
% generated via imagine -b fal -m openai/gpt-image-2
%   (prompt: figures/_prompts/cover.txt)
```

## Guardrails (commons g28 alignment)

- API keys flow through `secret get …` only — never argv, never env-leak,
  never echoed.
- Payload JSON (which includes the prompt) is routed via `mktemp` so
  the prompt does not appear on argv either.
- The script `set -euo pipefail`s and aborts loudly if the key is empty.

## Examples

```bash
echo "An abstract physics cover, deep blue gradient, …" > prompts/cover.txt
/imagine prompts/cover.txt figures/cover.png
/imagine prompts/cover.txt figures/cover.png -s landscape_16_9
/imagine prompts/cover.txt figures/cover.png -b openai -m gpt-image-1
```

Parallel fan-out (5 figures, fal.ai queue is concurrency-safe):

```bash
( /imagine prompts/01.txt figures/01.png -s square_hd ) &
( /imagine prompts/02.txt figures/02.png -s landscape_16_9 ) &
( /imagine prompts/03.txt figures/03.png -s landscape_16_9 ) &
wait
```
