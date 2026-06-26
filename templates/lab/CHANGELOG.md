# Changelog

All notable changes to {{NAME}}. Append-only; newest on top.

## {{DATE}} — repo scaffold

- Initialized `{{NAME}}` from the sidecar `lab init` skeleton: `src/`, `state/`,
  `ARCHITECTURE.json` + `architecture.html` viewer + `serve.py`, `CLAUDE.md`,
  `README.md`, `CHANGELOG.md`, `.gitignore`, `.harness/`.
- Scaffolded the hypothesis-verification system `HYPOTHESES/` (`CLAUDE.md`, empty
  `REGISTRY.jsonl`, `cards/_TEMPLATE.md`) + the repo-root shared harness
  `tool/{{SLUG_SNAKE}}.py` (stdlib-only `Falsifier`/`evaluate` ledger).
- Authored a placeholder `ARCHITECTURE.json` SSOT (overview / components / data-flow /
  verification) — fill the tree from the campaign's design.
