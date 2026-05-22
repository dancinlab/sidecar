# imagine

Generic AI image generator. Backend-agnostic dispatcher with two
backends out of the box (fal · openai); add another by dropping a
`_backends/<name>.sh` into the plugin.

## Verbs

```
/imagine <prompt-file> <out.png> [-s size] [-b backend] [-m model]
/imagine list           # backends + size catalogue
/imagine help
```

## Backends

| Backend | Pattern | Endpoint | Key |
|---|---|---|---|
| `fal` (default) | queue + poll | `queue.fal.run/<model>` | `secret get fal.api_key` |
| `openai` | sync | `api.openai.com/v1/images/generations` | `secret get openai.api_key` |

Default models — fal: `openai/gpt-image-2`; openai: `gpt-image-1`.
Override with `-m`.

## Canonical sizes

| Token | Pixels | OpenAI map |
|---|---|---|
| `square_hd` (default) | 1024×1024 | `1024x1024` |
| `square` | 512×512 | `1024x1024` (floor) |
| `landscape_16_9` | 1792×1024 | `1536x1024` |
| `portrait_16_9` | 1024×1792 | `1024x1536` |

## Examples

```bash
echo "An abstract physics cover …" > prompts/cover.txt

# default — fal.ai, square_hd, openai/gpt-image-2
/imagine prompts/cover.txt figures/cover.png

# landscape banner via fal.ai (still default backend)
/imagine prompts/cover.txt figures/cover.png -s landscape_16_9

# OpenAI direct
/imagine prompts/cover.txt figures/cover.png -b openai

# Different fal-hosted model
/imagine prompts/cover.txt figures/flux.png -b fal -m fal-ai/flux/dev
```

## Layout

```
skills/imagine/
├── SKILL.md
├── commands/imagine.md   # /imagine slash command
├── bin/imagine.sh        # arg parse + dispatch to backend
└── _backends/
    ├── fal.sh            # queue+poll
    └── openai.sh         # sync /v1/images/generations
```

## Adding a backend

Drop a new `_backends/<name>.sh` that:

1. Reads its API key via `secret get <name>.api_key`.
2. Accepts argv `<prompt_abs> <out_abs> <size_token> <model_id_or_empty>`.
3. Routes prompt + payload through a `mktemp` JSON file (no argv leak).
4. Writes the resulting PNG to `<out_abs>`.

The dispatcher discovers it automatically — `/imagine list` will
pick up its name and the file's line-2 comment as the description.

## Provenance + security discipline (commons g28)

- Prompts read from a **file**, never inline argv — verbatim text
  stays on disk for reproducibility.
- API keys flow through `secret get …` only.
- Payload JSON via `mktemp` — prompt never appears on argv.

## Companion: paper plugin

The [`paper`](../paper/) plugin's `figures/_prompts/<name>.txt`
provenance convention pairs directly with this generator:

```bash
/paper new mp-cache-roadmap
echo "cover prompt …" > mp-cache-roadmap/figures/_prompts/cover.txt
/imagine mp-cache-roadmap/figures/_prompts/cover.txt \
         mp-cache-roadmap/figures/cover.png \
         -s landscape_16_9
```
