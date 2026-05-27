---
description: /mining — lens-driven divergence + pruning workflow as a slash command. Sibling 3rd pillar to /domain (snapshot · log · MINING). Verbs — bare (status) · `<lens>` (round) · `append <text>` · `cycle new <title>` · `depletion` · `tree`. Bundled lenses — same-formula · ouroboros · dimensional · tension · combinatorial · custom (extensible `~/.sidecar/lens/<name>.md`).
argument-hint: "[<lens> | append <text> | cycle new <title> | depletion | tree | (bare = status)]"
allowed-tools: Bash, Read, Edit, Write
---

# /mining — lens-driven divergence + pruning

Input: `$ARGUMENTS`

`/mining` is the THIRD pillar of `/domain` — alongside `<NAME>.md` (snapshot) +
`<NAME>.log.md` (step log), it adds the **divergence tree** for the active domain:

- `<NAME>.mining.md` — cycle-by-cycle, lens-driven analysis (the tree itself,
  pruned per cycle, append-only across cycles).
- `<NAME>.mining.tape` — idea cart of surfaced candidates (`@X = <claim>` entries,
  promoted later to milestones or atlas registrations as warranted).

A **cycle** = one round of applying a single **lens** to the current branch
frontier, recording new leaves (sub-claims · sub-branches · candidates), then
either continuing (`/mining append`), opening a new cycle (`/mining cycle new`),
or declaring the lens depleted (`/mining depletion` — 0 new leaves under the
current lens). Cycles are chronological + append-only; depletion closes a cycle,
NOT the file.

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
| (empty) | **status** | render mining status — cycle count · leaf count · undepleted lenses · current cycle title |
| `<lens-name>` (one of bundled or custom) | **round** | apply that lens to the current frontier this cycle |
| `append <text>` | **append** | append a timestamped bullet to the current cycle |
| `cycle new <title>` | **cycle new** | close current cycle (if open) + open new `## cycle N — <title>` skeleton |
| `depletion` | **depletion** | mark current lens depleted (0 new leaves), close cycle |
| `tree` | **tree** | render cumulative ASCII branch tree from all cycles |

## Verb behaviors

### bare — `status`

Read the `.mining.md`. Print:

```
🧪 mining: <NAME>
  cycles: <N>   leaves: <N>   .tape entries: <N>
  current cycle: #<N> · lens: <name> · since: <date>
  undepleted lenses: <list>
  recent leaves (last 3): · <leaf> · <leaf> · <leaf>
```

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
🧪 mining: <NAME> · cycles=<N> · leaves=<N> · current lens: <name> · status: <open | depleted>
```

Triggers — `/mining`, `/mining <lens>`, `mining cycle`, `lens 발산`, `lens 채굴`,
`divergence cycle`, `lens 적용`, `mining tree`.
