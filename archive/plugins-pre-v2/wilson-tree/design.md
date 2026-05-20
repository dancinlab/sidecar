# wilson-tree design

## Problem (named)

A research repository that has fired N experiments accumulates a flat
`state/<§N_…>/` tree plus an ever-growing inline progress log. An agent
that re-enters the repo has to re-grep the whole world on every fresh
session to figure out which §N lives where and what its verdict was.
The Augment Code team calls this the *junk drawer* failure mode: the
context is technically present in the repo, but the cost of finding it
on every turn dominates the value of having it at all.

## Three habits, three hooks

| habit | trigger | effect |
|---|---|---|
| **P1 inject** | SessionStart / PostCompact / UserPromptSubmit | Read `REGISTRY.md` + walk-up `AGENTS.md`, emit a compact summary into the agent's context. The agent walks in with the map. |
| **P2 register** | PostToolUse(Write) on `state/**/result.json` | Auto-classify the new directory by filename keyword (substring match against the configured topic list, ambiguous → `UNCLASSIFIED`), append a `REGISTRY.md` row. |
| **P3 guard** | PreToolUse(Write\|Edit\|MultiEdit) on `state/**` | Warn (default) when the write targets `state/...` outside `<tree_root>/<topic>/<state_subdir>/`. `SIDECAR_TREE_GUARD_STRICT=1` upgrades to deny. |

## Inertness

Hooks exit 0 with no output unless the repo has either:

- a `REGISTRY.md` at the repo root, OR
- a `.wilson-tree.json` at the repo root.

This matches the wilson-pool convention (routing armed only when the
roster + workdir are both set). A repo that the user has not opted in
to sees zero side effects.

## Config

Project-local `<repo-root>/.wilson-tree.json` (optional):

```json
{
  "tree_root":   "HEXAD",
  "state_subdir": "state",
  "topics":      ["LEGO", "NEUROMORPHIC", "EEG", "DATA-REGIME", "CARVING"],
  "strict":      false,
  "inject_short_max": 800
}
```

Defaults are baked into `_tree.py::DEFAULT_CONFIG`. Missing file →
defaults. `SIDECAR_TREE_GUARD_STRICT=1` env var overrides `strict`.

## REGISTRY.md format

```
# REGISTRY

One row per §N. SSOT for `/wilson-tree status` and the wilson-tree
plugin's session-start context injection.

| §N | topic | status | path | verdict |
| --- | --- | --- | --- | --- |
| §107 | DATA-REGIME | landed | HEXAD/DATA-REGIME/state/s107_… | THRESHOLD-NOT-CROSSED |
```

Parser is permissive: any pipe-delimited line whose first cell matches
`^§?\d+[a-zA-Z]?$` is a row; everything else is ignored (so the header
and separator lines pass through unharmed). Renderer overwrites the
file with a normalised version on every register — the file is plain
markdown, git-mergeable, hand-editable.

## Slash command

```
/wilson-tree status              full table dump + config
/wilson-tree init                scaffold an empty REGISTRY.md
/wilson-tree audit               list state/* dirs missing from REGISTRY
/wilson-tree topics              show configured topics
/wilson-tree register §N TOPIC   add/replace a row
/wilson-tree path                show registry + config paths
/wilson-tree off                 advisory — set SIDECAR_NO_TREE=1
```

## Honest caveats

1. **Topic classification is substring-match only.** No NLP, no
   embeddings. A directory whose name omits its topic slug lands in
   `UNCLASSIFIED` — the agent (or the user) fixes it via
   `/wilson-tree register`. Mis-classification is silent; the audit
   command surfaces it.
2. **P3 guard defaults to warn, not block.** A repo that already has
   100+ flat `state/<§N_…>/` dirs would be hostile if the guard denied
   every new write outside the per-topic tree. Strict mode is an
   explicit opt-in for repos that have completed their migration.
3. **The auto-register row carries `status=landed verdict=TBD`.** The
   plugin does not infer a verdict from `result.json` (every project's
   schema differs); the agent or the user fills it in.
4. **REGISTRY.md is the SSOT, not the per-plugin data dir.** This is
   deliberate — the registry is project-visible, git-tracked,
   hand-editable. The plugin-data dir is empty by design.
