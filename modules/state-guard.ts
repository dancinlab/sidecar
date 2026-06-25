// state-guard — steer all work output into the single git-tracked `state/` root and
// away from scattered scratch/result directories. The recurring anti-pattern
// (commons preserve-state): a session spins up `.verdicts/`, `bench/`,
// `experiments/`, or `scripts/scratch/` at the repo root, and that output either
// rots untracked or fragments the tree. The rule: ONE flat `state/` folder, committed
// (so GitHub preserves it). Regenerable `build/` is gitignored; machine logs live in
// `.harness/`. BLOCKS both on Write/Edit (`detectBannedStateDir`) and on a bash dir-
// creating command (mkdir/touch/mv/cp dest, `detectBannedStateDirBash`).
//

// top-level directory names that are the scatter anti-pattern (commons preserve-state).
const BANNED = new Set([".verdicts", "verdicts", "experiments", "bench", ".bench", "scratch"]);
// sanctioned / ignorable roots — if the path is anchored under one of these, allow
// (e.g. `state/bench/…` is fine — `state/` IS the target; `build/` is gitignored).
const ALLOWED_ROOTS = new Set(["state", "build", "dist", "node_modules", ".git", ".harness"]);
const STATE_OK_BASH = /#\s*state-ok\b/i;
const STATE_OK_CONTENT = /@state-ok\b/;

function segs(path: string): string[] {
  return path.split("/").filter((s) => s && s !== "." && s !== "..");
}

// Return the offending banned segment for a path, or null. A path anchored under a
// sanctioned root (`state/`, `build/`, …) is always allowed. `scratch` only offends
// when it is NOT itself under `state/` (caught by the allowed-root check first).
function offendingSegment(path: string): string | null {
  const parts = segs(path);
  if (parts.some((s) => ALLOWED_ROOTS.has(s))) return null;
  for (const s of parts) if (BANNED.has(s)) return s;
  return null;
}

const ADVICE =
  "work output belongs in the single git-tracked `state/` root (committed → preserved on GitHub), " +
  "not a scattered scratch/result dir. Regenerable artifacts → `build/` (gitignored); machine logs → `.harness/`. " +
  "If this dir is genuinely needed outside `state/`, ";

// Write/Edit target inside a banned scatter dir → block (honors `@state-ok` in content).
export function detectBannedStateDir(filePath: string, content = ""): string | null {
  if (STATE_OK_CONTENT.test(content)) return null;
  const off = offendingSegment(filePath);
  if (!off) return null;
  return `'${off}/' is a scatter directory (commons preserve-state) — ${ADVICE}add a '@state-ok' marker in the file.`;
}

// file-creating / dir-making commands. Same shape as naming-guard's bash detector:
// mv/cp/ln dest = last non-flag arg; touch/mkdir = every arg (each a created path).
const DEST_LAST = new Set(["mv", "cp", "ln", "rename"]);
const ALL_ARGS = new Set(["touch", "mkdir", "install"]);

// Bash command that CREATES a path inside a banned scatter dir → block. Returns the
// offending segment, or null. Honors an inline `# state-ok` marker.
export function detectBannedStateDirBash(rawCmd: string): string | null {
  if (STATE_OK_BASH.test(rawCmd)) return null;
  for (const seg of rawCmd.split(/[\n;|&()]+/)) {
    let toks = seg.trim().split(/\s+/).filter(Boolean);
    if (toks[0] === "sudo") toks = toks.slice(1);
    if (toks[0] === "git" && toks[1] === "mv") toks = toks.slice(1);
    const head = toks[0] ?? "";
    const args = toks.slice(1).filter((t) => !t.startsWith("-"));
    if (!head || args.length === 0) continue;

    let created: string[] = [];
    if (DEST_LAST.has(head)) created = args.length >= 2 ? [args[args.length - 1]] : [];
    else if (ALL_ARGS.has(head)) created = args;
    else continue;

    for (const path of created) {
      const off = offendingSegment(path.replace(/\/+$/, ""));
      if (off) return off;
    }
  }
  return null;
}
