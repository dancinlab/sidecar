# paper

Arxiv-style LaTeX paper scaffolder. Bundles a generic single-column 11pt
template + the demiurge `sample-nb-bcs-absorbed` reference exhibit
verbatim, plus a fal.ai gpt-image-2 figure generator.

## Verbs

```
/paper new <slug>                          scaffold ./<slug>/ from template
/paper sample <slug>                       copy the bundled demiurge sample verbatim
/paper fig <image_size> <prompt> <out.png> delegates to /imagine → fal.ai openai/gpt-image-2
/paper compile [dir]                       pdflatex × 3 + bibtex
/paper list                                list bundled samples
/paper help                                show usage
```

`<image_size>`: `square_hd` (1024×1024) · `landscape_16_9` (1792×1024) ·
`portrait_16_9` (1024×1792) · `square` (512×512).

`fig` requires the sister [`imagine`](../imagine/) plugin (sidecar
marketplace).

## Examples

```bash
/paper new mp-cache-roadmap
cd mp-cache-roadmap
# edit main.tex, references.bib …
/paper compile

# generate an AI cover via the sister imagine plugin (fal.ai openai/gpt-image-2)
# requires: `secret set fal.api_key` once
echo "abstract cover for ..." > figures/_prompts/cover.txt
/paper fig square_hd figures/_prompts/cover.txt figures/cover.png

# study the reference exhibit
/paper sample ref-bcs
cd ref-bcs && /paper compile   # ~14-page demiurge sample, builds standalone
```

## Layout

```
skills/paper/
├── SKILL.md
├── commands/paper.md         # /paper slash command
├── bin/paper.sh              # verb dispatcher (delegates `fig` to sister imagine plugin)
├── template/                 # what `/paper new` copies
│   ├── main.tex              # single-column 11pt arxiv preamble
│   ├── references.bib        # placeholder bib entry
│   ├── Makefile              # pdflatex × 3 + bibtex
│   ├── README.md
│   └── figures/_prompts/     # AI-figure prompt provenance
└── samples/
    └── sample-nb-bcs-absorbed/   # demiurge sample verbatim (source-only,
                                  # main.tex + references.bib + Makefile +
                                  # README.md + figures/*.pdf + _prompts/ +
                                  # _scripts/. `make check` prereq dropped
                                  # so the bundle is standalone-buildable.)
```

## Provenance discipline

Carried over from the demiurge PAPERS repo:

- BibTeX entries must carry a DOI · arxiv id · or stable URL — untraceable
  claims don't enter the paper.
- AI-generated figure prompts live verbatim under
  `figures/_prompts/<name>.txt` so the input is reproducible.
- Caption AI-generated figures with a provenance marker:
  `% generated via fal.ai gpt-image-2 (prompt: figures/_prompts/<name>.txt)`.

## Requirements

| Verb | Requires |
|---|---|
| `new`, `sample` | a writable cwd and an unused slug |
| `compile` | `pdflatex` + `bibtex` (BasicTeX / TeX Live) |
| `fig` | sister [`imagine`](../imagine/) plugin installed + `secret` CLI on PATH + `fal.api_key` set (`secret set fal.api_key`) |
