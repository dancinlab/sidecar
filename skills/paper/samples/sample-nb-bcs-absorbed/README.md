# sample-nb-bcs-absorbed — Nb BCS universal-gap-ratio attestation

> First sample paper in `PAPERS/` repo. Documents the project's first
> RTSC-domain `absorbed=true` (companion paper to the energy-domain
> solar pyranometer record).
>
> opened: 2026-05-21 KST · status: draft · target ~8-12 pages compiled

## Source

- `main.tex` — single-column arxiv-style LaTeX (article class, 11pt A4)
- `references.bib` — BibTeX, all entries with DOI/arxiv/URL
- `Makefile` — `make` builds `main.pdf` (3-pass + bibtex)

## Build

```bash
cd PAPERS/sample-nb-bcs-absorbed/
make            # → main.pdf
make clean      # remove .aux/.log/.bbl (keep PDF)
make distclean  # also remove PDF
```

## Figures

One inline TikZ figure (Fig.\,\ref{fig:consensus}, measurement panel
+ consensus + threshold band). No external image dependencies for the
sample. Future figures could include:

- TikZ: 4-tier expansion path block diagram (RTSC.md §8.7)
- matplotlib: BCS gap ratio across SC families (literature scatter)
- OpenAI DALL-E (cover/teaser only, if added)

## Companion records

The paper's main result is verifiable against:

- `exports/material_attestation/nb_bcs_v1/lts_attestation_nb_bcs_*.json`
  — **current** `absorbed=true` record (R4 Stage 1 Path B migration,
  2026-05-22 · `domain: "lts"`). Active attestation this paper documents.
- `exports/material_attestation/nb_bcs_v1/rtsc_attestation_nb_bcs_20260521T111656Z.json`
  — **historical** pre-migration record (`domain: "rtsc"`), preserved as
  Pattern 1 audit evidence. DO NOT consume from this path; see paper
  §\ref{sec:invariant} for the R4 Stage 1 namespace lock rationale.
- `exports/energy/verify/2026-05-21T03-07-39Z/...pyranometer.json`
  — the precedent (energy domain, same schema)
- `~/core/hexa-lang/stdlib/material/nb_bcs_absorbed_attestation_producer.py`
  — SSOT producer (re-run reproduces the current `lts_*` record)

## Honest g3 alignment

- All claims trace to bibtex entries with DOI/arxiv/URL
- 4 explicit `scope_caveats` in §\ref{sec:limits} match record JSON
- CSH five-source honest-negative case study (§\ref{sec:rtsc-neg})
  preserves RTSC.md §8.8 invariant verbatim (Snider et al. 2020
  Nature CSH report \cite{snider2020csh}, retracted
  \cite{snider2022retraction}, susceptibility-data analysis
  \cite{hirsch2022csh})
- `\absorbedtrue` macro typeset in green (`honestgreen`) used \emph{only}
  for the record's actual absorbed=true claim
