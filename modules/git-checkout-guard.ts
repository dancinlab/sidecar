// git-checkout-guard — branch-switch detection for `pre bash` (layer-1 code guard).
// DENIES a command that moves the MAIN worktree's HEAD to a different branch /
// commit, because switching the primary checkout out from under a parallel
// session or the user clobbers their untracked work and lands later commits on
// the wrong branch (the [[feedback_parallel_agents_isolated_worktree]] incident,
// #3559). The canonical pattern in a sidecar-managed repo is to do parallel work
// in an ISOLATED worktree — never to flip the shared main checkout's branch.
//
// This module is the PURE PARSER only — it classifies the command and, for the
// ambiguous `git checkout <ref>` form, defers the "is it really a branch?" call
// to the caller (which has `cwd` + git available). The caller also restricts the
// block to the MAIN worktree (a linked/temp worktree is MEANT to switch branches,
// so it is exempt). HEAD-moving forms detected:
//   git switch <branch>            git switch -c/-C <branch>   git switch -
//   git switch --detach <commit>   git checkout -b/-B <branch>
//   git checkout --orphan <branch> git checkout -              (previous branch)
//   git checkout --detach <commit> git checkout <ref>          (needsVerify)
// EXPLICITLY NOT a switch (left alone — these only touch the working tree, never
// move HEAD; the destructive `git checkout -- .` form is danger-guard's job):
//   git checkout -- <paths>        git checkout <tree-ish> -- <paths>
//   git checkout <tree-ish> <path> git checkout <file>         (rev fails → allow)
// Quotes are stripped before tokenizing (parity with git-guard.ts). No inline
// override — like the force-push guard, this protects shared state with teeth;
// the `git.guardBranchSwitch` config flag is the legitimate off switch.

function stripQuotes(s: string): string {
  let out = "";
  for (const c of s) if (c !== "'" && c !== '"') out += c;
  return out;
}

function tokens(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

export interface BranchSwitch {
  // needsVerify=false → block outright; true → caller runs `git rev-parse` on
  // `target` in cwd and blocks only if it resolves to a real ref/commit (so a
  // file-restore like `git checkout README.md` falls through to allow).
  needsVerify: boolean;
  target?: string;
  label: string;
}

export function detectBranchSwitch(rawCmd: string): BranchSwitch | null {
  const toks = tokens(stripQuotes(rawCmd));
  const n = toks.length;

  // find `git … (checkout|switch)`, allowing git-level options (`-c key=val`,
  // `--flag`) between `git` and the subcommand — parity with detectForcePush.
  let sc = -1;
  let sub = "";
  for (let i = 0; i < n; i++) {
    if (toks[i] !== "git") continue;
    let j = i + 1;
    while (j < n && toks[j].startsWith("-")) {
      if (toks[j] === "-c" || toks[j] === "--config") j++; // -c takes a value
      j++;
    }
    if (j < n && (toks[j] === "checkout" || toks[j] === "switch")) {
      sc = j;
      sub = toks[j];
      break;
    }
  }
  if (sc < 0) return null;

  const args = toks.slice(sc + 1);
  if (args.includes("--help") || args.includes("-h")) return null; // help, harmless
  const positionals = args.filter((t) => !t.startsWith("-"));

  if (sub === "switch") {
    // `git switch` exists ONLY to move HEAD — any real target is a branch switch.
    const hasCreate = args.some((t) => t === "-c" || t === "-C" || t === "--create" || t === "--force-create");
    const hasDetach = args.some((t) => t === "-d" || t === "--detach");
    const hasDash = args.includes("-"); // `git switch -` → previous branch
    if (positionals.length > 0 || hasCreate || hasDetach || hasDash) {
      const tgt = positionals[0] ?? (hasDash ? "-" : undefined);
      return { needsVerify: false, target: tgt, label: `git switch${tgt ? ` ${tgt}` : ""}` };
    }
    return null; // bare `git switch` with no target → git errors, harmless
  }

  // sub === "checkout" — ambiguous (branch switch vs file restore). Block only
  // the HEAD-moving forms; never the working-tree-only restore forms.
  if (args.includes("--")) return null; // `… -- <paths>` is a restore, HEAD stays
  const hasCreate = args.some((t) => t === "-b" || t === "-B" || t === "--orphan");
  if (hasCreate) {
    const tgt = positionals[0];
    return { needsVerify: false, target: tgt, label: `git checkout -b ${tgt ?? "<branch>"} (create+switch)` };
  }
  const hasDetach = args.some((t) => t === "--detach");
  if (hasDetach) {
    const tgt = positionals[0];
    return { needsVerify: false, target: tgt, label: `git checkout --detach${tgt ? ` ${tgt}` : ""}` };
  }
  if (args.includes("-")) return { needsVerify: false, target: "-", label: "git checkout - (previous branch)" }; // prev branch

  // A LONE positional with no `--` is the ambiguous `git checkout <ref>` form:
  // a branch name (switch) or a single filename (restore). Two+ positionals are
  // the `<tree-ish> <pathspec>` restore form — never a switch. Defer to the
  // caller to disambiguate the lone case via `git rev-parse`.
  if (positionals.length === 1) return { needsVerify: true, target: positionals[0], label: `git checkout ${positionals[0]}` };
  return null;
}
