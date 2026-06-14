// harness pr-cycle [extra gh flags]
// One-shot PR cycle (sidecar pr-cycle parity): push current branch → open PR →
// self-merge (squash · admin · delete-branch into the base, default main) →
// post-merge worktree sweep (remove merged agent worktrees + local branches).
// Refuses on main/master. Extra args pass through to `gh pr create`.
import { execShell } from "../lib/exec.ts";
import { info, ok, loudFail } from "../lib/log.ts";
import { repoPath } from "../lib/config.ts";

async function git(cmd: string, cwd?: string): Promise<{ code: number; out: string }> {
  const r = await execShell(cmd, { cwd: cwd ?? repoPath(".") });
  return { code: r.code, out: (r.stdout + r.stderr).trim() };
}

// Post-merge worktree sweep (sidecar pr-cycle 0.5.0 parity). After a squash-merge
// with --delete-branch, the merged branch's upstream becomes [gone] (squash-safe:
// --is-ancestor can't detect a squash, but a deleted upstream reliably can). cd to
// the MAIN worktree first so even the just-merged CURRENT worktree (if pr-cycle ran
// inside one) becomes sweepable, then remove every LINKED worktree whose branch is
// [gone]. NEVER touches the main checkout, locked worktrees, or a branch with a
// live/absent upstream (may hold un-pushed work).
async function sweepMergedWorktrees(): Promise<void> {
  // first `worktree <path>` line is always the main worktree (git invariant)
  const list = (await git("git worktree list --porcelain")).out;
  const main = (list.match(/^worktree (.+)$/m) || [])[1];
  if (!main) {
    await git("git worktree prune");
    return;
  }
  await git("git fetch -p origin", main);

  // parse porcelain blocks → { path, branch, locked }
  const blocks = list.split(/\n\s*\n/);
  for (const b of blocks) {
    const wt = (b.match(/^worktree (.+)$/m) || [])[1];
    if (!wt || wt === main) continue;
    if (!wt.includes("/.claude/worktrees/")) continue; // only harness agent worktrees
    if (/^locked/m.test(b)) continue; // never another live checkout
    const br = (b.match(/^branch refs\/heads\/(.+)$/m) || [])[1];
    if (!br) continue;
    const track = (await git(`git for-each-ref --format='%(upstream:track)' refs/heads/${JSON.stringify(br)}`, main)).out;
    if (track !== "[gone]") continue; // only merged + deleted (squash-safe)
    const rm = await git(`git worktree remove --force ${JSON.stringify(wt)}`, main);
    if (rm.code === 0) {
      await git(`git branch -D ${JSON.stringify(br)}`, main);
      info(`  🧹 swept merged worktree: ${wt}`);
    }
  }
  await git("git worktree prune", main);
}

export async function runPrCycle(args: string[]): Promise<number> {
  const branch = (await git("git symbolic-ref --short -q HEAD || git rev-parse --abbrev-ref HEAD")).out;
  if (!branch || branch === "main" || branch === "master") {
    loudFail(`pr-cycle: refuses on '${branch || "?"}' — switch to a feature branch first.`);
    return 1;
  }
  info(`pr-cycle: branch '${branch}'`);

  // 1. push
  const push = await git(`git push --no-verify -u origin ${JSON.stringify(branch)}`);
  if (push.code !== 0) {
    loudFail("pr-cycle: push failed");
    info(push.out);
    return 1;
  }
  info("  ✓ pushed");

  // 2. open PR (--fill + any extra flags). If one already exists, continue.
  const extra = args.map((a) => JSON.stringify(a)).join(" ");
  const create = await git(`gh pr create --fill ${extra}`.trim());
  if (create.code !== 0 && !/already exists/i.test(create.out)) {
    loudFail("pr-cycle: gh pr create failed");
    info(create.out);
    return 1;
  }
  info(`  ✓ PR ready ${(create.out.match(/https:\/\/\S+/) || [""])[0]}`);

  // 3. self-merge
  const merge = await git(`gh pr merge ${JSON.stringify(branch)} --squash --admin --delete-branch`);
  if (merge.code !== 0) {
    loudFail("pr-cycle: merge failed (need admin? checks pending?)");
    info(merge.out);
    return 1;
  }
  ok(`pr-cycle: merged '${branch}' (squash · branch deleted).`);

  // 4. post-merge worktree sweep — remove merged agent worktrees + local branches
  await sweepMergedWorktrees();
  return 0;
}
