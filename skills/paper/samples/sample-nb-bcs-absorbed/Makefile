# Compile main.pdf with bibtex (3-pass cross-ref resolution).
# `make` produces main.pdf; `make clean` removes intermediates.
#
# Note: the upstream demiurge sample has a `make check` prereq that runs
# ../_tools/check_rtsc_claim.sh (RTSC-claim attestation hook, demiurge
# constitution v1.4.0 R4 Stage 2). That tool is demiurge-specific and is
# not bundled into the sidecar `paper` plugin — the `check` target is
# dropped here so the bundled sample compiles standalone.

DOC = main
LATEX = pdflatex -interaction=nonstopmode -halt-on-error
BIBTEX = bibtex

.PHONY: all clean distclean

all: $(DOC).pdf

$(DOC).pdf: $(DOC).tex references.bib
	$(LATEX) $(DOC).tex
	$(BIBTEX) $(DOC) || true
	$(LATEX) $(DOC).tex
	$(LATEX) $(DOC).tex
	@echo "[paper] $(DOC).pdf built at $$(date '+%Y-%m-%d %H:%M:%S')"

clean:
	rm -f $(DOC).aux $(DOC).bbl $(DOC).blg $(DOC).log $(DOC).out \
	      $(DOC).toc $(DOC).synctex.gz
	@echo "[paper] intermediates cleaned (PDF preserved)"

distclean: clean
	rm -f $(DOC).pdf
