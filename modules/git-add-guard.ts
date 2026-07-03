// git-add-guard — detect a whole-tree `git add` (staging vector) for `pre bash`.
// The other git guards (force-push, branch-switch, main-ref-move) all defend
// HEAD/ref moves; this covers the INDEX-staging vector: an all-form `git add`
// (`-A` / `--all` / `.` / `:/` / `*`, or a bare `-u` with no path) run in the
// SHARED main worktree captures a parallel session's untracked WIP — and any
// embedded git repos (sibling linked worktrees) as gitlinks — into one index.
// The 2026-07-04 incident: a `cd <linked-worktree>` that failed (the worktree
// was already removed) left the shell in the shared main checkout, and the next
// `git add -A && git commit` swept up foreign WIP + `.worktrees/*`.
//
// This module ONLY parses; the caller (pre.ts) gates on config, confirms the
// effective dir is the main worktree, and that sibling worktrees exist, then
// blocks. An explicit-file add (`git add foo.ts`) or a scoped `git add -u src/`
// is NOT an all-form and passes.

function stripQuotes(s: string): string {
  let out = "";
  for (const c of s) if (c !== "'" && c !== '"') out += c;
  return out;
}

function tokens(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

// shell command separator — an all-form `add` only counts inside its own segment
function isSep(t: string): boolean {
  return t === "&&" || t === "||" || t === ";" || t === "|" || t === "&" || t === "|&";
}

export interface AddAllHit {
  label: string; // human label for the block message
  dir: string | null; // a git-level `-C <path>`, else null (cwd)
}

// Scan ONE already-separated command segment for an all-form `git add`.
function detectInSegment(toks: string[]): AddAllHit | null {
  const n = toks.length;

  // find `git … add`, allowing git-level opts (`-c k=v`, `-C <path>`, `--flag`)
  // between `git` and the `add` subcommand. Capture a `-C <path>` for effDir.
  let ap = -1;
  let dir: string | null = null;
  for (let i = 0; i < n; i++) {
    if (toks[i] !== "git") continue;
    let j = i + 1;
    while (j < n && toks[j].startsWith("-")) {
      if (toks[j] === "-C" || toks[j] === "--git-dir" || toks[j] === "--work-tree") {
        if (toks[j] === "-C" && j + 1 < n) dir = toks[j + 1];
        j++; // this git-level option takes a value
      } else if (toks[j] === "-c" || toks[j] === "--config") {
        j++; // -c takes a value
      }
      j++;
    }
    if (j < n && toks[j] === "add") {
      ap = j;
      break;
    }
  }
  if (ap < 0) return null;

  // scan `add` args: classify flags vs positional paths.
  let sawAllFlag = false; // -A / --all / --no-ignore-removal (all-form flags)
  let sawUpdate = false; // -u / --update (all-form ONLY when no path follows)
  let sawWildPath = false; // `.` / `:/` / `*` — whole-tree pathspecs
  let positionals = 0; // explicit file/dir args
  for (let j = ap + 1; j < n; j++) {
    const t = toks[j];
    if (t === "--help" || t === "-h") return null; // help, not a real add
    if (t === "--") continue; // end-of-options marker
    if (t === "-A" || t === "--all" || t === "--no-ignore-removal") {
      sawAllFlag = true;
      continue;
    }
    if (t === "-u" || t === "--update") {
      sawUpdate = true;
      continue;
    }
    if (t.startsWith("-")) continue; // some other add flag (-n, -v, -f, -p, -e…)
    // a positional pathspec
    if (t === "." || t === ":/" || t === "*" || t === "./" || t === ":/*") {
      sawWildPath = true;
    } else {
      positionals++;
    }
  }

  if (sawAllFlag) return { label: "git add -A/--all", dir };
  if (sawWildPath) return { label: "git add . (whole-tree pathspec)", dir };
  // bare `-u` (update ALL tracked) with no path narrows to whole tree; `-u src/`
  // is scoped and passes.
  if (sawUpdate && positionals === 0 && !sawWildPath) return { label: "git add -u (update all tracked)", dir };
  return null;
}

// Public: detect a whole-tree `git add` anywhere in a (possibly compound) command.
export function detectAddAll(rawCmd: string): AddAllHit | null {
  const toks = tokens(stripQuotes(rawCmd));
  let seg: string[] = [];
  for (const t of toks) {
    if (isSep(t)) {
      const hit = detectInSegment(seg);
      if (hit) return hit;
      seg = [];
    } else {
      seg.push(t);
    }
  }
  return detectInSegment(seg);
}
