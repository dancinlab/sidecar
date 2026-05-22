# <slug> — paper title placeholder

> One-line framing of the paper. Replace this block with paper-specific
> notes (status · target length · companion records / data).

## Source

- `main.tex` — single-column arxiv-style LaTeX (article class, 11pt A4)
- `references.bib` — BibTeX, all entries with DOI / arxiv / URL
- `Makefile` — `make` builds `main.pdf` (pdflatex × 3 + bibtex)

## Build

```bash
make            # → main.pdf
make clean      # remove .aux/.log/.bbl (keep PDF)
make distclean  # also remove PDF
```

## Figures

Drop figure sources under `figures/`:

- vector: `.pdf` / `.eps` (preferred for plots)
- raster: `.png` (cover / teaser / AI-generated schematics only)
- TikZ: inline in `main.tex`

For AI-generated figures, keep the verbatim prompt under
`figures/_prompts/<name>.txt` so provenance is reproducible. Mark the
caption with `% generated via <tool> (prompt: figures/_prompts/<name>.txt)`.

Generate a fal.ai cover via the sidecar plugin:

```bash
/paper fig square_hd figures/_prompts/cover.txt figures/cover.png
```

## Honest stance

- Every claim traces to a bibtex entry with DOI / arxiv / URL.
- Caveats live in `\section{Limitations and honest caveats}` and
  should word-for-word match any companion data record.
- Pre-register thresholds in the methods section — don't pick them
  after seeing results.
