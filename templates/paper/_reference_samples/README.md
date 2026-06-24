# PAPERS/_reference_samples — quality target reference PDFs

> Third-party arxiv papers stored here as **quality targets** for our own
> `PAPERS/<slug>/` outputs. We do NOT modify these. We DO inspect them
> for figure density, section structure, citation style, LaTeX class
> hints, and overall academic polish.
>
> Each entry: original arxiv PDF (read-only) + a short note on what
> aspect of it we are targeting.

---

## Entries

### `2409.00101_neurolm.pdf` (NeuroLM, Jiang et al. 2024)

- **arxiv**: <https://arxiv.org/abs/2409.00101> · PDF <https://arxiv.org/pdf/2409.00101>
- **Title**: *NeuroLM: A Universal Multi-task Foundation Model for Bridging the Gap between Language and EEG Signals*
- **Venue**: ICLR 2025
- **Pages**: 22 · 1.8 MB · single-column
- **Why preserved**: this is the *quality bar* for our publication-style
  papers under `PAPERS/`. Reference points we mirror:
  - **Figure density** — 9+ embedded figures (radar plots, VQ visualizations,
    architectural diagrams, ablation tables). Mix of matplotlib data plots,
    technical TikZ-style block diagrams, and conceptual schematics.
  - **Section structure** — Introduction · Background · Method · Experiments
    · Ablation · Discussion · References. Heavy on quantitative results.
  - **LaTeX class** — NeurIPS/ICLR-like single-column 11pt with hyperref +
    natbib. arxiv-default-style preamble.
  - **Provenance discipline** — every figure has a clear caption tying it
    to a specific experimental result; no decorative cover art.
- **Anti-pattern to avoid**: the `sample-nb-bcs-absorbed/` first draft used
  fal.ai marketing teaser images (cover, abstract schematic, condensation
  illustration). NeuroLM doesn't have any. Lesson: papers have *result*
  figures, not promotional figures. See
  `../sample-nb-bcs-absorbed/figures/_archive_marketing/` for what was
  rejected and why.

---

## How to add a new reference

```bash
SLUG=2410.12345_paper-shortname
curl -sSL "https://arxiv.org/pdf/$ARXIV_ID" \
  -o PAPERS/_reference_samples/$SLUG.pdf
# Then append a section to this README.md describing:
#   - arxiv URL + venue
#   - page count + format
#   - what aspect we're targeting (figures? section structure? style?)
#   - any anti-patterns visible in our drafts that this paper avoids
```

g3 honest: these PDFs are downloaded for *private quality-comparison*.
They are NOT modified, redistributed, or used as training data. arxiv
preprints carry their authors' chosen license (typically arxiv non-
exclusive); for direct citation we use the published DOI / arxiv ID in
our own papers' `references.bib`, not the PDF itself.
