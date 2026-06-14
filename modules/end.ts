// harness end — session-closure safety check (sidecar /end parity). Read-only
// dashboard of dangling residue in the current repo with per-item ✓/⚠/○ marks +
// recommended actions, and a closing ✅/⚠ verdict. Never mutates anything.
import { execShell } from "../lib/exec.ts";
import { repoPath } from "../lib/config.ts";

async function git(cmd: string): Promise<string> {
  return (await execShell(cmd, { cwd: repoPath(".") })).stdout.trim();
}
const out = (s: string) => process.stdout.write(s + "\n");

export async function runEnd(_args: string[]): Promise<number> {
  out("═══ harness end — closure safety check ═══\n");
  let warn = 0;

  // 1. uncommitted
  const unc = (await git("git status -s")).split("\n").filter(Boolean);
  if (!unc.length) out("✓ uncommitted     0");
  else {
    warn++;
    out(`⚠ uncommitted     ${unc.length} file(s)`);
    out(unc.slice(0, 8).map((l) => "    " + l).join("\n"));
    out('  → harness pr-cycle  ·  or git stash push -m "<msg>"');
  }

  // 2. unpushed
  const up = await git("git rev-parse --abbrev-ref @{u} 2>/dev/null");
  if (up) {
    const ahead = (await git(`git rev-list ${up}..HEAD`)).split("\n").filter(Boolean).length;
    if (!ahead) out(`✓ unpushed        0  (↔ ${up})`);
    else {
      warn++;
      out(`⚠ unpushed        ${ahead} commit(s) ahead of ${up}`);
      out("  → git push");
    }
  } else out("○ unpushed        (no upstream tracking)");

  // 3. stash
  const stash = (await git("git stash list")).split("\n").filter(Boolean);
  if (!stash.length) out("✓ stash           0");
  else {
    warn++;
    out(`⚠ stash           ${stash.length} entrie(s)`);
    out("  → git stash show stash@{N} -p  ·  then drop/pop");
  }

  // 4. open PRs by me
  const prRaw = await git(`gh pr list -A '@me' -s open --json number,title,url 2>/dev/null`);
  if (prRaw) {
    let n = 0;
    try {
      n = JSON.parse(prRaw).length;
    } catch {
      n = 0;
    }
    if (!n) out("✓ open PRs (mine) 0");
    else {
      warn++;
      out(`⚠ open PRs (mine) ${n}`);
      out((await git(`gh pr list -A '@me' -s open 2>/dev/null`)).split("\n").slice(0, 5).map((l) => "    " + l).join("\n"));
      out("  → gh pr merge <N> --squash --delete-branch  ·  or gh pr close <N>");
    }
  } else out("○ open PRs (mine) (gh not auth / not a GitHub repo)");

  // 5. merged-but-undeleted local branches
  const cur = await git("git symbolic-ref --short -q HEAD || git rev-parse --abbrev-ref HEAD");
  const base = (await git("git rev-parse --verify -q main")) ? "main" : (await git("git rev-parse --verify -q master")) ? "master" : "";
  if (base) {
    const merged = (await git(`git branch --merged ${base}`))
      .split("\n")
      .map((l) => l.replace("*", "").trim())
      .filter((b) => b && b !== base && b !== cur);
    if (!merged.length) out("✓ merged branches 0 stale");
    else {
      warn++;
      out(`⚠ merged branches ${merged.length} merged but undeleted: ${merged.slice(0, 6).join(", ")}`);
      out(`  → git branch -d <name>`);
    }
  }

  // 6. linked worktrees
  const wt = (await git("git worktree list")).split("\n").filter(Boolean);
  if (wt.length <= 1) out("✓ worktrees       0 linked");
  else {
    out(`○ worktrees       ${wt.length - 1} linked (review if stale)`);
    out("  → git worktree list  ·  git worktree remove <path>");
  }

  out("");
  out(warn === 0 ? "✅ clean — safe to close." : `⚠ ${warn} item(s) need attention before closing.`);
  return 0;
}
