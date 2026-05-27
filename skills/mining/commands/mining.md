---
description: /mining — lens-driven DIVERGENCE + connect-driven CONVERGENCE + tidy-driven ORGANIZE workflow. Sibling 3rd pillar to /domain (snapshot · log · MINING). 0.4.0 — **auto-saturate by default**: `<lens>` and `connect` auto-loop until depletion (no per-round confirmation; cap 5 inner rounds per invocation, re-run hint when not yet depleted). New verb `auto` = full pipeline (drain divergence → convergence → tidy in one shot). Verbs — bare (status) · `<lens>` (divergence saturate-loop) · `append <text>` · `cycle new <title>` · `depletion` · `tree` · `connect`/`edges` (convergence saturate-loop) · `connect <a> <b>` · `graph` · `saturate` (alias of connect-loop) · `auto` (full pipeline to depletion) · `tidy`/`consolidate` [`--depth=light|full`] · `squash`. Bundled lenses — same-formula · ouroboros · dimensional · tension · combinatorial · custom (extensible `~/.sidecar/lens/<name>.md`).
argument-hint: "[<lens> | append <text> | cycle new <title> | depletion | tree | connect [<a> <b>] | edges | graph | saturate | auto | tidy [--depth=light|full] | consolidate | squash | (bare = status)]"
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
| `saturate` | **saturate** (alias of `connect`) | identical to `connect`/`edges` since 0.4.0 (auto-saturate by default); kept as discoverable alias |
| `auto` | **auto pipeline** (0.4.0) | one-shot full drain: divergence saturate (all undepleted lenses round-robin) → convergence saturate → tidy `--depth=light` → done |
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

### `<lens-name>` — apply lens (AUTO-SATURATE LOOP, 0.4.0)

For the **bundled lens catalogue** (see below) or a `~/.sidecar/lens/<name>.md`
custom file, read the lens prompt + apply it to the current branch frontier
(the most-recent N leaves not yet expanded under this lens). Produce new leaves
inline. Append to current cycle under a `### lens: <name>` subheading with a
timestamp, each new leaf as a `- ` bullet.

**0.4.0 — auto-saturate (default behavior, no per-round user gate)**: after a
round, if it produced ≥1 new leaf, **immediately run another round** under the
same lens (newly-surfaced leaves may unlock further branches). Stop when a round
yields **0 new leaves** (de-dup by surface form OR by claimed mechanism) — at
that point append `@depleted: <lens-name> @ <ISO-date>` to the cycle and report
the saturation summary (rounds_run · total_new_leaves).

Safety cap: **5 inner rounds per single invocation**. If the cap is hit while
still finding leaves, emit `🔄 still saturating — re-run /mining <lens-name>` so
the user can continue (no auto-ScheduleWakeup — mining is interactive-pace, not
background-loop like /cycle).

No user confirmation between rounds. The only halt path inside one invocation
is depletion or cap-5 reached.

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

### `connect` (or `edges`) — convergence (AUTO-SATURATE LOOP, 0.4.0)

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
`@lens: <none>` (connect cycles have no lens).

**0.4.0 — auto-saturate (default behavior, identical to `saturate` verb)**:
after a pass, if it found ≥1 new edge, **immediately run another pass** (new
edges may unlock further meaningful links). Stop when a full pass yields **0
new edges** → append `@depleted: connect @ <ISO-date>` to the cycle and report
saturation summary (passes_run · total_new_edges).

Safety cap: **5 inner passes per invocation**. If still finding edges at cap,
emit `🔄 still saturating — re-run /mining connect`.

No user confirmation between passes. `connect` and `saturate` verbs are now
functionally identical (`saturate` kept as a discoverable alias).

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

### `auto` — full pipeline to depletion (0.4.0, one-shot drain)

Single-invocation full mining pipeline. Runs in order until the whole graph is
drained:

1. **divergence saturate** — walk the bundled lens catalogue (same-formula →
   ouroboros → dimensional → tension → combinatorial) in order; for each
   undepleted lens, run the auto-saturate loop above (cap 5 inner rounds);
   when a lens hits 0 new leaves, mark it depleted and advance to the next
   lens. Stop the divergence phase when ALL bundled lenses are depleted under
   the current frontier (one full catalogue pass with 0 new leaves anywhere).
2. **convergence saturate** — run `connect` saturate loop until 0 new edges in
   a full pass.
3. **tidy `--depth=light`** — write the cycle-index table + stats + closure
   block (light depth = no body regroup, preserves chronological body for
   future deep tidy if needed).
4. Report `🏁 mining drained — divergence depleted (N lenses) · convergence
   depleted (M edges) · tidy applied`.

Cap per phase = 5 inner rounds (same as individual lens/connect verbs). **Total invocation cap = 25 round-equivalents** (5 lens × 5 rounds OR 5 connect passes) — if hit before depletion, emit `🔄 auto cap-25 reached, NOT depleted — re-run /mining auto` and preserve progress.

**Checkpoint discipline (0.5.0)** — agents running `/mining auto` MUST write `<NAME>.mining.md` to disk after EACH inner round (not at the end of the whole pipeline). On rate-limit / SIGTERM mid-flight, the partial mining graph remains intact and `re-run /mining auto` picks up from the last committed state via the `@depleted:` markers.

Custom lenses (`~/.sidecar/lens/*.md`) — included in the auto pass after the
bundled catalogue, alphabetical order.

This is the "사이클마다 물어보지 않고 고갈시까지" path — one user invocation,
zero per-round confirmation, terminates only at full depletion or cap.

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

Each lens has (1) a short rule, (2) a **procedure** (steps the agent must follow), and
(3) a **leaf shape** (canonical form the produced leaf must match).

### same-formula
- **Rule**: "Two systems sharing the same math likely share an equivalent mechanism beneath the surface domain difference."
- **Procedure**:
  1. Pick the current frontier leaf or `@goal:` if frontier empty.
  2. Extract its core equation / inequality / invariant in symbolic form.
  3. Scan ≥2 disjoint domains (math · physics · biology · economics · …) for the same form.
  4. For each domain hit, emit ONE leaf with shape below — the hit's mechanism is the new content, NOT the source.
- **Leaf shape**: `[<target-domain>] <equation> ≅ <source-domain> <equation> → mechanism: <one-line claim>`

### ouroboros
- **Rule**: "X referencing itself → fixed-point / self-closure surfaces."
- **Procedure**:
  1. For each existing leaf, ask "can this leaf be applied to itself?".
  2. If yes, the fixed-point IS the leaf — surface as a closure signal.
  3. If the `@goal:` itself becomes a fixed-point (the lens captures the goal under its own rule), declare goal-closure and stop the cycle.
- **Leaf shape**: `[ouroboros] <leaf-X> applied to itself ⇒ fixed-point: <claim>` (and if goal-closure: append `@goal-closure: yes`)

### dimensional
- **Rule**: "Dimensional ladder — quantities of the same dimension are convertible across abstraction levels."
- **Procedure**:
  1. For each leaf, identify its abstraction level (micro · meso · macro) or layer (component · system · ecosystem · symbol · implementation).
  2. Enumerate adjacent rungs (≥1 up, ≥1 down).
  3. Surface an analog at each adjacent rung — the dimension-preserving translation.
- **Leaf shape**: `[<from-level> → <to-level>] <original-leaf> ≡ <translated-claim>`

### tension
- **Rule**: "Two premises in conflict → branch fork."
- **Procedure**:
  1. Find pairs of leaves whose claims are in active tension (not merely orthogonal).
  2. For each pair, fork TWO child leaves: one resolving via premise A, one via premise B.
  3. Mark the pair-of-origin: `(from L<a> ⊥ L<b>)`.
- **Leaf shape**: `[tension-A] <resolution-A> (from L<a> ⊥ L<b>)` + `[tension-B] <resolution-B> (from L<a> ⊥ L<b>)`

### combinatorial
- **Rule**: "A × B orthogonal product set exploration."
- **Procedure**:
  1. Identify two orthogonal axes from current leaves (e.g. {strategies} × {domains}).
  2. Enumerate the |A|×|B| product cells.
  3. Skip trivial cells (the diagonal or self-product if both axes coincide).
  4. Each non-trivial cell becomes a leaf candidate.
- **Leaf shape**: `[<A-value> × <B-value>] <product-claim>`

### custom
Free-form. Pass `/mining custom <description>` and apply the inline lens text to the frontier. Custom lens MUST include a procedure (≥2 steps) and a leaf shape; otherwise refuse with `🛑 custom lens needs procedure + leaf-shape (g32: surface ambiguity)`.

**Extension**: drop `~/.sidecar/lens/<name>.md` (a markdown file with the rule
in the body) — `/mining <name>` will load + apply it identically. Catalogue
auto-includes anything in `~/.sidecar/lens/`. Custom lens files SHOULD follow the same
**rule + procedure + leaf-shape** schema for cross-domain reproducibility.

## Depletion criteria (objective · 0.5.0)

A new round under lens L is **non-productive** when ALL three hold:

1. **Surface dedup** — every candidate leaf's `[<bracket-tag>]` + first 8 words matches an existing leaf.
2. **Mechanism dedup** — every candidate's mechanism-clause (after `→ mechanism:` / `⇒` / `≡`) reduces to an already-recorded mechanism (case-insensitive substring match counts).
3. **No new bracket-tag** — every candidate's `[<bracket-tag>]` already appears in `## leaves`.

Mark the cycle `@depleted: <lens> @ <ISO-date>` ONLY when a round produces 0 leaves OR all candidates fail the three-test above. Do NOT declare depletion on cap-5 hit — that's `🔄 cap-5 reached, NOT depleted` (different signal).

## Leaf ID + edge "meaningful" criteria (0.5.0)

**Leaf ID assignment** — when writing to `## leaves`, ID is `L<next-int>` where `next-int = max(existing L#) + 1`. Cycle-local sub-IDs (L1a · L1b) FORBIDDEN — flatten across cycles. ID never reused on edit.

**Edge "meaningful" positive criteria** — at least ONE of:
- **Causal**: L<a> as cause implies L<b> as effect (or vice versa) under a stated mechanism.
- **Equivalence**: L<a> and L<b> reduce to the same closed-form under a stated reduction.
- **Dependency**: L<a> requires L<b> as a precondition (or vice versa).
- **Inversion**: L<a> and L<b> are conjugate pair (e.g. position ↔ momentum, divergence ↔ convergence).

Edge `E<n>: L<a> ↔ L<b> · <criterion>: <one-line mechanism>` — the criterion label is mandatory.

Negative-edge (`(no-edge) L<a> ⊥ L<b>`) — record only when a suspected pair was investigated and found to fail all four criteria above.

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

### Promotion procedure (0.5.0) — leaf → milestone / atlas atom

For each leaf the user (or `bare /mining` next-actions) selects for promotion:

1. **classify**: identify which `<DOMAIN>.md` the leaf belongs to (default = active domain; explicit reroute allowed).
2. **shape check**: leaf must have a concrete actionable verb (`add X`, `implement Y`, `verify Z`, `register N`) — pure observations route to `/atlas register --from-drill` instead.
3. **dispatch**:
   - `actionable` → `/domain milestone <leaf-text-truncated-to-100ch>` then append `[promoted → <DOMAIN>:M<n>]` to the `.tape` `@X` line.
   - `verifiable closed-form` → `/atlas register --from-drill --seed "<leaf-text>"` then append `[promoted → atlas:<atom-id>]`.
   - `cross-domain handoff` → file to target repo's `INBOX.log.md` then append `[promoted → <repo>:INBOX/<slug>]`.
4. **dedup**: before append, grep `<DOMAIN>.md` for the same text to avoid duplicate milestones.

`bare /mining` should surface up to 3 highest-value undepoted leaves (by lens-novelty + cross-domain coverage) as `🎯 next promotion candidates: L<n> · L<m> · L<k>` so the user can drive the leaf→milestone flow without inspecting the whole file.

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
`mining graph`, `mining saturate`, `mining auto`, `점잇기`, `선들 연결`,
`edge 발견`, `mining tidy`, `mining consolidate`, `mining squash`, `정리`,
`phase 그룹`, `마이닝 정리`, `consolidate cycles`, `reorganize mining`,
`고갈시까지`, `한번에 끝까지`, `사이클마다 물어보지 말고`, `auto drain`.
