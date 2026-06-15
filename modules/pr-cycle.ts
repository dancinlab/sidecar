// harness pr-cycle [extra gh flags]
// One-shot PR cycle: push current branch → open PR → self-merge (admin · delete-
// branch; squash→merge→rebase fallback if a method is disallowed; retries while
// CI is pending) → VERIFY the merge commit actually landed on origin/<base> and
// print an unambiguous "✅ MERGED → <base> @ <sha> · verified" block → post-merge
// worktree sweep. Refuses on main/master. Extra args pass through to gh pr create.
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

  // 3. self-merge — retry while CI is pending; fall back if a merge method is disallowed
  const b = JSON.stringify(branch);
  const methods = ["--squash", "--merge", "--rebase"];
  let mi = 0;
  let merged = false;
  let lastOut = "";
  for (let attempt = 0; attempt < 12 && !merged; attempt++) {
    const m = await git(`gh pr merge ${b} ${methods[mi]} --admin --delete-branch`);
    lastOut = m.out;
    if (m.code === 0) {
      merged = true;
      break;
    }
    if (/not allowed|are not allowed on this repository/i.test(m.out) && mi < methods.length - 1) {
      info(`  ↪ ${methods[mi]} disallowed — trying ${methods[mi + 1]}`);
      mi++;
      attempt--; // method swap doesn't count as a wait-retry
      continue;
    }
    if (/required status|expected|pending|UNSTABLE|in progress|not in the correct state|checks/i.test(m.out)) {
      info(`  ⏳ CI not ready — retrying in 20s (${attempt + 1}/12)`);
      await execShell("sleep 20");
      continue;
    }
    break; // a real, non-transient failure
  }
  if (!merged) {
    loudFail("pr-cycle: merge failed (admin? CI? merge-method?)");
    info(lastOut);
    return 1;
  }

  // 4. VERIFY the merge actually landed on origin/<base> — the unambiguous confirmation
  const view = await git(`gh pr view ${b} --json state,mergeCommit,baseRefName,number,url`);
  let state = "", sha = "", base = "main", num = "", url = "";
  try {
    const j = JSON.parse(view.out);
    state = j.state ?? "";
    sha = j.mergeCommit?.oid ?? "";
    base = j.baseRefName ?? "main";
    num = String(j.number ?? "");
    url = j.url ?? "";
  } catch {
    /* fall through to a softer report */
  }
  await git(`git fetch -q origin ${JSON.stringify(base)}`);
  // verified = the merge commit is an ancestor of the remote base tip
  const onBase =
    !!sha &&
    (await execShell(`git merge-base --is-ancestor ${JSON.stringify(sha)} origin/${base}`, { cwd: repoPath(".") })).code === 0;
  const baseTip = (await git(`git log --oneline -1 origin/${base}`)).out;

  // Final REPORT block — relay this to the user VERBATIM (the merge-to-base confirmation).
  const shortSha = sha.slice(0, 9) || "?";
  if (onBase) {
    ok(`✅ ${base} 머지 완료 — 검증됨`);
    info(`   - 상태: ${state || "MERGED"}`);
    info(`   - 머지 커밋: ${shortSha} → origin/${base} 에 포함 확인됨 (✔ verified)`);
    info(`   - origin/${base} 최신: ${baseTip || "?"}`);
    info(`   - PR: #${num || "?"}${url ? ` · ${url}` : ""}`);
  } else {
    loudFail(`⚠ ${base} 머지 미검증 — 수동 확인 필요`);
    info(`   - 상태: ${state || "?"}`);
    info(`   - 머지 커밋: ${shortSha} → origin/${base} 에서 확인 안 됨`);
    info(`   - origin/${base} 최신: ${baseTip || "?"}`);
    info(`   - PR: #${num || "?"}${url ? ` · ${url}` : ""}`);
  }

  // 5. post-merge worktree sweep — remove merged agent worktrees + local branches
  await sweepMergedWorktrees();
  return merged && onBase ? 0 : (merged ? 0 : 1);
}
