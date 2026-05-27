---
description: /mining — lens-driven DIVERGENCE (add leaves) + CONVERGENCE (add edges) + ORGANIZE (tidy) workflow. Sibling 3rd pillar to /domain (snapshot · log · MINING). Verbs — bare (status) · `<lens>` (divergence round) · `append <text>` · `cycle new <title>` · `depletion` · `tree` · `connect`/`edges` (find meaningful leaf↔leaf edges) · `connect <a> <b>` (justify one edge) · `graph` (ASCII graph + stats) · `saturate` (auto-edge until depletion) · `tidy`/`consolidate` [`--depth=light|full`] (lossless phase-group reorganize) · `squash` (dedup trivial headers). Bundled lenses — same-formula · ouroboros · dimensional · tension · combinatorial · custom (extensible `~/.sidecar/lens/<name>.md`). Mining = three workflows: lens (divergence) + connect (convergence) + tidy (organize).
argument-hint: "[<lens> | append <text> | cycle new <title> | depletion | tree | connect [<a> <b>] | edges | graph | saturate | tidy [--depth=light|full] | consolidate | squash | (bare = status)]"
allowed-tools: Bash, Read, Edit, Write
---

# /mining — lens-driven divergence + pruning

Input: `$ARGUMENTS`

`/mining` is the THIRD pillar of `/domain` — alongside `<NAME>.md` (snapshot) +
`<NAME>.log.md` (step log), it accumulates the **(leaves, edges) graph** for the
active domain:

- `<NAME>.mining.md` — cycle-by-cycle, lens-driven analysis (the tree of
  leaves) + an `## edges` section (the convergence half). Append-only across
  cycles.
- `<NAME>.mining.tape` — idea cart of surfaced candidates (`@X = <claim>` entries,
  promoted later to milestones or atlas registrations as warranted).

Mining has THREE complementary workflows (0.3.0):

- **Divergence (lens rounds)** — apply a lens to the current frontier and
  record new **leaves** (sub-claims · branches). 0 new leaves under the current
  lens = lens depletion.
- **Convergence (connect rounds)** — find meaningful direct **edges** between
  accumulated leaves (transitive / re-packaging excluded). 0 new edges in a
  full pass = connect depletion. Together: divergence + convergence make
  mining a (leaves, edges) graph — divergence builds the node set;
  convergence builds the topology that compresses leaves into the underlying
  truth.
- **Organize (tidy / consolidate)** — once the (leaves, edges) graph is large
  (≥10 cycles · ≥500 log lines), reorganize chronological raw form into
  PHASE groups (divergence / analysis / convergence / external) with a cycle-
  index table that preserves chronology losslessly. Optional `squash` collapses
  trivial repeated headers (cosmetic, no regroup).

A **cycle** = one round (lens or connect). Cycles are chronological + append-only;
depletion closes a cycle, NOT the file. `tidy` rearranges the cycles into phase
groups but does NOT discard any leaf/edge — the index table preserves the
original chronological order so anything can be re-derived.

## Step 0 — active domain check (RUN FIRST)

Read the `/domain` skill's active-domain pointer (`~/.sidecar/active-domain`).
If none set: stop with `🛑 no active domain — run /domain set <NAME> first
(off-domain mining is forbidden per commons @D g58)`. Do not fabricate a target.

Resolve the active domain's file location from `DOMAINS.tape` (or current dir)
→ `<DIR>/<NAME>.mining.md` + `<DIR>/<NAME>.mining.tape`. Create them if missing
(scaffold `# <NAME> — mining (divergence)` header + empty `## cycles` + empty
`## leaves` for `.md`; `@goal: idea cart` + empty body for `.tape`).

## Step 1 — parse verb

| First token | Verb | What it does |
|---|---|---|
| (empty) | **status** | render mining status — cycle count · leaf count · **edge count** · undepleted lenses · current cycle title |
| `<lens-name>` (one of bundled or custom) | **lens round (divergence)** | apply that lens to the current frontier — add new **leaves** this cycle |
| `append <text>` | **append** | append a timestamped bullet to the current cycle |
| `cycle new <title>` | **cycle new** | close current cycle (if open) + open new `## cycle N — <title>` skeleton |
| `depletion` | **depletion** | mark current lens / connect cycle depleted, close it |
| `tree` | **tree** | render cumulative ASCII branch tree from all cycles |
| `connect` or `edges` | **connect round (convergence)** | find meaningful direct edges between accumulated leaves — add new **edges** this cycle |
| `connect <a> <b>` | **connect-pair** | justify or refute the edge between two specific leaves (L#·E# or text) |
| `graph` | **graph** | ASCII (leaves, edges) graph + stats (n leaf · m edge · n(n-1)/2 possible · meaningful ratio) |
| `saturate` | **saturate** | auto-loop `connect` rounds until a full pass finds 0 new edges (depletion analog for convergence) |
| `tidy` or `consolidate` [`--depth=light\|full`] | **tidy (organize)** | reorganize accumulated cycles into PHASE groups (divergence / analysis / convergence / external) + cycle-index table + stats + single closure box · LOSSLESS (chronological info preserved in the index) |
| `squash` | **squash dup headers** | dedup repeated trivial headers (e.g. "next cycle pending" repeated N times) — cosmetic only, no phase regrouping |

## Verb behaviors

### bare — `status`

Read the `.mining.md`. Print:

```
🧪 mining: <NAME>
  cycles: <N>   leaves: <N>   edges: <M>   .tape entries: <N>
  current cycle: #<N> · kind: <lens|connect> <name> · since: <date>
  undepleted lenses: <list>
  recent leaves (last 3): · <leaf> · <leaf> · <leaf>
```

If cycles ≥ 10 AND `.mining.md` line count ≥ 500, append the advisory:
`💡 consider /mining tidy (≥10 cycles · ≥500 lines)`. Non-blocking.

### `<lens-name>` — apply lens round

For the **bundled lens catalogue** (see below) or a `~/.sidecar/lens/<name>.md`
custom file, read the lens prompt + apply it to the current branch frontier
(the most-recent N leaves not yet expanded under this lens). Produce new leaves
inline. Append to current cycle under a `### lens: <name>` subheading with a
timestamp, each new leaf as a `- ` bullet.

If applying this lens produces **0 new leaves** that aren't already on the tree
(de-dup by surface form OR by claimed mechanism), automatically suggest
`/mining depletion` for this lens.

### `append <text>` — timestamped entry

Append `- <ISO-timestamp> · <text>` to the current cycle body. Use when surfacing
a finding mid-thought that doesn't fit a single lens.

### `cycle new <title>` — new cycle header

If a cycle is currently open (last cycle has no depletion marker), suggest
declaring its depletion first (offer `/mining depletion` before continuing). Then
append:

```
## cycle <N+1> — <title>
@started: <ISO-date>
@lens: <pending>

(skeleton)
```

### `depletion` — close current lens

Append `@depleted: <lens-name> @ <ISO-date>` to the current cycle. State which
other lenses on the current frontier remain undepleted (suggest the next).

### `tree` — ASCII visualization

Walk the cumulative leaves across all cycles, render as ASCII tree:

```
<NAME> root
├── cycle 1: <title>
│   ├── (lens: same-formula)
│   │   ├── leaf-A
│   │   └── leaf-B
│   └── (lens: ouroboros) [DEPLETED]
│       └── leaf-C
└── cycle 2: <title>
    └── (lens: tension)
        ├── leaf-D
        └── leaf-E
```

Indent by cycle → lens → leaf. Mark `[DEPLETED]` after depleted lenses.

### `connect` (or `edges`) — convergence round

Scan the accumulated leaves (`## leaves` flat index) and surface **direct
meaningful edges** — pairs whose claims, when juxtaposed, reveal a non-trivial
shared mechanism / equivalence / dependency. **NOT trivial** = exclude (a)
trivial transitive (if A↔B + B↔C already, A↔C is redundant unless it adds new
info), (b) re-packaging (same claim in different words), (c) generic-ancestor
("both are about X" with X too broad). Each new edge is recorded under a
`## edges` section as:

```
- E<n>: L<a> ↔ L<b> · <one-line justification of the meaningful link>
```

Open or continue an `## cycle N — <title>` with `@kind: connect` and append
`@lens: <none>` (connect cycles have no lens). 0 new meaningful edges in a full
frontier pass → suggest `/mining depletion` for this connect cycle.

### `connect <a> <b>` — justify one specific pair

Take two leaf identifiers (`L<n>` or substring text match) and surface the
edge justification — or, if no meaningful link exists, record an explicit
NEGATIVE under the cycle (`- (no-edge) L<a> ⊥ L<b> · <why unrelated>`). Useful
for shoring up the "0 new edges" depletion claim by walking specific suspect
pairs.

### `graph` — ASCII graph + stats

Render the cumulative (leaves, edges) graph + stats:

```
n leaves = N    m edges = M    possible = N(N-1)/2 = P
meaningful ratio = M/P = X.XX

[ASCII adjacency or node-edge sketch — small graphs draw fully, large graphs
 show top-degree nodes + edge-count histogram]

  L1 ─── L3
  L1 ─── L7
  L3 ─── L7    (triangle L1-L3-L7)
  L4 ─── L9
  ...
```

For large graphs (N > 30), show a degree-ranked top-15 node list + a
`degree-distribution` mini-histogram instead of the full adjacency.

### `saturate` — auto-edge until convergence-depletion

Auto-loop `connect` rounds: run a connect pass; if it found ≥1 new edge,
immediately run another pass (the new edges may unlock further meaningful
links); stop when a full pass yields 0 new edges. Cap at 5 inner passes per
invocation (safety) — if still finding edges, report `🔄 still saturating —
re-run /mining saturate` for the user to continue. Each inner pass appends its
edges + cycle ends with `@depleted: connect @ <date>` when the loop terminates.

### `tidy` (or `consolidate`) — phase-group reorganize (LOSSLESS)

Reorganize accumulated cycles into PHASE groups + add a cycle-index table.
Default depth = `full`. Phase groups (in order):

1. **divergence** — all `@kind: lens` cycles (lens rounds; leaves)
2. **analysis** — non-lens/non-connect commentary cycles (mid-stream reviews ·
   appended `/mining append` notes that aren't part of a lens pass)
3. **convergence** — all `@kind: connect` cycles (connect rounds; edges)
4. **external** — links to outside repos / atlas / verify outcomes referenced
   by leaves (extracted into a single tail section so the body stays focused)

The output replaces the chronological `## cycles` body with:

```
## cycles (reorganized 2026-MM-DD · tidy v<N>)

### index (chronological — preserves original order losslessly)
| cycle | kind   | title                | leaves | edges | depleted | phase       |
|------:|--------|----------------------|-------:|------:|:--------:|-------------|
|     1 | lens   | <title>              |     12 |     — | ✓ same-formula | divergence |
|     2 | lens   | <title>              |      8 |     — | ✓ ouroboros    | divergence |
|     3 | connect| <title>              |     — |    14 | ✓ connect      | convergence|
| ...   | ...    | ...                  |   ... |   ... | ...      | ...         |

### stats
n leaves = N · m edges = M · cycles = K (divergence D · analysis A · convergence C)
covered axes: <list>   uncovered axes: <list>
meaningful ratio = M / (N(N-1)/2) = X.XX

## divergence
(grouped lens cycles — each cycle as a `### cycle N — <title>` subsection)

## analysis
(grouped mid-stream commentary cycles)

## convergence
(grouped connect cycles)

## external
(extracted external references)

## closure
@status: <open | depleted-divergence | depleted-convergence | depleted-both>
@last-action: tidy @ <ISO-date>
@next: <suggested next move — new lens · new connect pass · saturate · etc>
```

**Lossless guarantee** — every leaf, edge, and note from the chronological body
must reappear under exactly one phase group; the `index` table holds the
original chronological order so `/mining tree` and `/mining graph` remain
deterministic across tidy operations. If unable to map a cycle to a phase
(unknown `@kind:` or ambiguous), emit `🛑 tidy: cycle <N> phase ambiguous —
re-run after declaring '@kind: <lens|connect|analysis>'` rather than guess.

**Depth flag** —

- `--depth=light` — header + cycle-index table + stats only; body stays
  chronological. Safe at smaller scales (cycles < ~10) where regrouping adds
  no clarity.
- `--depth=full` (DEFAULT) — full phase regrouping per the schema above.

**Auto-suggest** — when `mining status` detects cycles ≥ 10 AND log lines ≥
500, append a single-line nudge `💡 consider /mining tidy (≥10 cycles ·
≥500 lines)` to the status block. Non-blocking — purely advisory.

### `squash` — dedup repeated trivial headers (cosmetic)

Walk the current `.mining.md` and collapse exact-duplicate trivial headers
(canonical examples: repeated empty `### 다음 사이클 예정` / `### TBD` /
`### scratch` headers between bona-fide cycle sections). Body content stays;
only the duplicate headers themselves merge. No phase regrouping (use `tidy`
for that). Useful as a low-risk pre-step before `tidy --depth=full`.

## Bundled lens catalogue

Each lens is a short rule for HOW to generate the next round of leaves from the
current frontier.

| Lens | Rule |
|---|---|
| **same-formula** | "If two systems share the same math, an equivalent mechanism likely lurks beneath the surface domain difference." Look across domains (math ↔ physics, physics ↔ economics, …) for identical equations; each match is a leaf candidate. |
| **ouroboros** | "X referencing itself → fixed-point / self-closure surfaces." When a leaf can be applied to itself (a meta-level recursion), surface that as a leaf — and treat ouroboros-style surfacing as a **goal-closure signal** (the analysis has hit its own fixed point; consider this lens's auto-completion). |
| **dimensional** | "Dimensional ladder — quantities of the same dimension are convertible across abstraction levels." For each leaf, enumerate adjacent abstraction levels (micro ↔ macro · component ↔ system · symbol ↔ implementation) and surface analogs at the next rung. |
| **tension** | "Contradiction mining — two premises in conflict → branch fork." For each pair of leaves whose claims are in tension, fork two child leaves: one resolving via premise A, one via premise B. |
| **combinatorial** | "A × B orthogonal product set exploration." For two orthogonal axes (e.g. {strategies} × {domains}), enumerate the product cells; each non-trivial cell is a candidate leaf. |
| **custom** | Free-form. Pass `/mining custom <description>` and apply the inline lens text to the frontier. |

**Extension**: drop `~/.sidecar/lens/<name>.md` (a markdown file with the rule
in the body) — `/mining <name>` will load + apply it identically. Catalogue
auto-includes anything in `~/.sidecar/lens/`.

## File structure conventions

`<NAME>.mining.md`:

```markdown
# <NAME> — mining (divergence)

@active-lens: <name | pending>
@active-cycle: <N>

## cycles

### cycle 1 — <title>
@started: <date>
@lens: same-formula
- <ISO> · <leaf>
- <ISO> · <leaf>
@depleted: same-formula @ <date>

### cycle 2 — <title>
@started: <date>
@lens: tension
- <ISO> · <leaf>
- <ISO> · <leaf>

## leaves (flattened index)

- L1 [cycle 1 · same-formula] <leaf-text>
- L2 [cycle 1 · same-formula] <leaf-text>
- ...

## edges (convergence half — 0.2.0)

- E1 [cycle 3 · connect] L1 ↔ L7 · <justification of the meaningful link>
- E2 [cycle 3 · connect] L3 ↔ L9 · <justification>
- (no-edge) L4 ⊥ L8 · <why suspected pair turned out unrelated>
- ...
```

`<NAME>.mining.tape`:

```
@goal: idea cart — promotion candidates surfaced by /mining

@X = <surfaced-claim or atom-id> · source-cycle: N · source-lens: <name>
@X = ...
```

The `.tape` `@X` entries are promotion candidates — when a leaf is verified
(`/verify`) or merits a real milestone, promote it via `/domain milestone` or
`/atlas register` and append `[promoted → <id>]` to the `.tape` entry.

## Halt rules

- No active domain → stop with the steer-options line (Step 0).
- Off-domain attempt → refuse (commons @D g58).
- `cycle new` when current cycle has 0 leaves → suggest using bare `/mining` to
  see what's open before opening another.
- `depletion` on a cycle with 0 leaves → refuse (declaring depletion of an
  empty cycle is meaningless).

## Closure

After any verb, end with one status line:
```
🧪 mining: <NAME> · cycles=<N> · leaves=<N> · edges=<M> · current: <lens|connect> <name> · status: <open | depleted>
```

Triggers — `/mining`, `/mining <lens>`, `mining cycle`, `lens 발산`, `lens 채굴`,
`divergence cycle`, `lens 적용`, `mining tree`, `mining connect`, `mining edges`,
`mining graph`, `mining saturate`, `점잇기`, `선들 연결`, `edge 발견`,
`mining tidy`, `mining consolidate`, `mining squash`, `정리`, `phase 그룹`,
`마이닝 정리`, `consolidate cycles`, `reorganize mining`.
