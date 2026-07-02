// sidecar pr-cycle [--no-doc] [--no-reap] [extra gh flags]
// One-shot PR cycle: doc-update gate (CHANGELOG required, ARCHITECTURE advised;
// --no-doc to skip) → push current branch → open PR → self-merge (admin · delete-
// branch; squash→merge→rebase fallback if a method is disallowed; retries while
// CI is pending) → VERIFY the merge commit actually landed on origin/<base> and
// print an unambiguous "✅ MERGED → <base> @ <sha> · verified" block → SYNC the
// local <base> branch to origin/<base> (ff, no checkout switch — keeps local main
// from falling behind) → post-merge worktree sweep → stale-PR reaper (reconcile any
// OTHER open PRs of mine: auto-merge the MERGEABLE, loudly report the CONFLICTING, so
// none rot abandoned · --no-reap to skip). Refuses on main/master.
// Extra args pass through to gh pr create.
import { execShell } from "../lib/exec.ts";
import { info, ok, loudFail } from "../lib/log.ts";
import { repoPath } from "../lib/config.ts";

async function git(cmd: string, cwd?: string): Promise<{ code: number; out: string }> {
  const r = await execShell(cmd, { cwd: cwd ?? repoPath(".") });
  return { code: r.code, out: (r.stdout + r.stderr).trim() };
}

// Post-merge worktree sweep. After a squash-merge
// with --delete-branch, the merged branch's upstream becomes [gone] (squash-safe:
// --is-ancestor can't detect a squash, but a deleted upstream reliably can). cd to
// the MAIN worktree first so even the just-merged CURRENT worktree (if pr-cycle ran
// inside one) becomes sweepable, then remove every LINKED worktree whose branch is
// [gone] — REGARDLESS of path. The old sweep only touched `.claude/worktrees/` agent
// worktrees, so a manually-added `git worktree add <path> -b <br>` (the standard
// isolated-worktree pattern) was never reaped and piled up. NEVER touches the main
// checkout, locked worktrees, or a branch with a live/absent upstream (may hold
// un-pushed work); a worktree with UNCOMMITTED changes is PRESERVED with a warning
// instead of being --force-clobbered.
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
    if (/^locked/m.test(b)) continue; // never another live checkout
    const br = (b.match(/^branch refs\/heads\/(.+)$/m) || [])[1];
    if (!br) continue;
    const track = (await git(`git for-each-ref --format='%(upstream:track)' refs/heads/${JSON.stringify(br)}`, main)).out;
    if (track !== "[gone]") continue; // only merged + deleted (squash-safe)
    // Preserve a worktree with uncommitted work rather than --force-clobbering it —
    // [gone] means the BRANCH is merged, but the tree may hold new unrelated edits.
    const dirty = (await git("git status --porcelain", wt)).out;
    if (dirty) {
      info(`  ⚠ merged worktree kept (uncommitted changes): ${wt} — commit/discard, then \`sidecar worktree gc\``);
      continue;
    }
    const rm = await git(`git worktree remove --force ${JSON.stringify(wt)}`, main);
    if (rm.code === 0) {
      await git(`git branch -D ${JSON.stringify(br)}`, main);
      info(`  🧹 swept merged worktree: ${wt}`);
    }
  }
  await git("git worktree prune", main);
}

// Stale-PR reaper — the fix for "PRs that get created but never merged, then rot".
// pr-cycle only ever handled ITS OWN branch's PR; a single interrupted/failed merge
// left a PR open forever, and over days a once-MERGEABLE PR rots into CONFLICTING.
// This runs at the END of every cycle: enumerate MY other open PRs and reconcile —
// auto squash-merge the clean (MERGEABLE) ones (same trust model as the main flow:
// own PR · admin · delete-branch), and LOUDLY report the ones a machine can't safely
// land (CONFLICTING / blocked) with the exact next step. Never silently forgotten.
// Opt-out: --no-reap. Failures here never fail the cycle (the primary merge is done).
async function reapStalePrs(currentBranch: string): Promise<void> {
  const list = await git(`gh pr list --author @me --state open --json number,title,headRefName,mergeable --limit 50`);
  if (list.code !== 0) return; // no gh / no repo / offline — silent, non-fatal
  let prs: Array<{ number: number; title: string; headRefName: string; mergeable: string }> = [];
  try {
    prs = JSON.parse(list.out);
  } catch {
    return;
  }
  const stale = prs.filter((p) => p.headRefName !== currentBranch);
  if (!stale.length) return;
  info(`pr-cycle: ♻ 방치 PR 수확 — 내 열린 PR ${stale.length}개 점검`);
  for (const p of stale) {
    // mergeable is async on GitHub's side — UNKNOWN means "not computed yet", re-poll.
    let m = p.mergeable;
    for (let i = 0; i < 3 && m === "UNKNOWN"; i++) {
      await execShell("sleep 2");
      m = (await git(`gh pr view ${p.number} --json mergeable -q .mergeable`)).out;
    }
    const tag = `#${p.number} ${p.title.slice(0, 48)}`;
    if (m === "MERGEABLE") {
      const mr = await git(`gh pr merge ${p.number} --squash --admin --delete-branch`);
      if (mr.code === 0) ok(`  ✓ 수확 머지: ${tag}`);
      else info(`  ⚠ ${tag} — 머지 시도 실패(권한/방법?): ${mr.out.split("\n")[0]}`);
    } else if (m === "CONFLICTING") {
      loudFail(`  🧱 충돌로 방치: ${tag}`);
      info(`     → 자동 머지 불가. \`git fetch origin && git rebase origin/main\` 로 충돌 해소 후 다시 pr-cycle, 또는 폐기면 \`gh pr close ${p.number}\``);
    } else {
      info(`  ⏳ ${tag} — 상태 ${m} (blocked/draft?) — gh pr view ${p.number} 확인`);
    }
  }
}

export async function runPrCycle(args: string[]): Promise<number> {
  const branch = (await git("git symbolic-ref --short -q HEAD || git rev-parse --abbrev-ref HEAD")).out;
  if (!branch || branch === "main" || branch === "master") {
    loudFail(`pr-cycle: refuses on '${branch || "?"}' — switch to a feature branch first.`);
    return 1;
  }
  info(`pr-cycle: branch '${branch}'`);

  // 0. doc-update gate — every cycle MUST update docs (CHANGELOG append; ARCHITECTURE
  //    SSOT + ING when present). README is NOT force-gated (update-in-place stays
  //    advisory). Refuse to ship code without a CHANGELOG entry. Override: --no-doc.
  if (!args.includes("--no-doc")) {
    // When the remote HEAD symref is unset (repos created by scaffold rather than
    // `git clone` never get one), `rev-parse --abbrev-ref origin/HEAD` returns the
    // literal "origin/HEAD" → strips to "HEAD", which is a bogus base. Treat "HEAD"
    // (and empty) as "no default known" and fall back to main, else the doc gate
    // diffs against the wrong base and fires a misleading "docs missing" error.
    const headRef = (await git("git rev-parse --abbrev-ref origin/HEAD 2>/dev/null")).out.replace(/^origin\//, "");
    const baseGuess = headRef && headRef !== "HEAD" ? headRef : "main";
    await git(`git fetch -q origin ${JSON.stringify(baseGuess)}`);
    const changed = (await git(`git diff --name-only origin/${baseGuess}...HEAD`)).out.split("\n").filter(Boolean);
    const ignore = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[a-z]+$|(^|\/)\.harness(-engine)?\//i;
    const meaningful = changed.filter((f) => !ignore.test(f));
    const tracked = async (f: string) => (await git(`git ls-files ${f}`)).out.length > 0;
    const hasChangelog = changed.some((f) => /(^|\/)CHANGELOG\.(jsonl|md)$/.test(f));
    // ARCHITECTURE SSOT may be .json (tree) or .md (prose) — gate whichever is tracked.
    const archDoc = (await tracked("ARCHITECTURE.json"))
      ? "ARCHITECTURE.json"
      : (await tracked("ARCHITECTURE.md"))
        ? "ARCHITECTURE.md"
        : null;
    const hasArch = archDoc !== null && changed.some((f) => f === archDoc || f.endsWith("/" + archDoc));
    const ingExists = await tracked("ING.jsonl");
    const hasIng = changed.some((f) => /(^|\/)ING\.jsonl$/.test(f));
    const missing: string[] = [];
    if (meaningful.length && !hasChangelog) missing.push("CHANGELOG.jsonl (sidecar changelog add)");
    if (meaningful.length && archDoc && !hasArch) missing.push(`${archDoc} (갱신형 SSOT 현행화)`);
    if (meaningful.length && ingExists && !hasIng) missing.push("ING.jsonl (진행상황 현행화 · 완료분 sidecar ing done)");
    if (missing.length) {
      loudFail(`pr-cycle: 문서 업데이트 필수 — 이 사이클 변경(${meaningful.length}개)에 누락: ${missing.join(" · ")}`);
      info("   해당 문서를 갱신한 뒤 다시 실행하세요 (정말 문서 불필요하면 --no-doc).");
      return 1;
    }
  }

  // 1. push
  const push = await git(`git push --no-verify -u origin ${JSON.stringify(branch)}`);
  if (push.code !== 0) {
    loudFail("pr-cycle: push failed");
    info(push.out);
    return 1;
  }
  info("  ✓ pushed");

  // 2. open PR (--fill + any extra flags). If one already exists, continue.
  //    Strip pr-cycle's own flags so they don't leak into `gh pr create`.
  const OWN_FLAGS = new Set(["--no-doc", "--no-reap"]);
  const extra = args
    .filter((a) => !OWN_FLAGS.has(a))
    .map((a) => JSON.stringify(a))
    .join(" ");
  // Pass --head explicitly: `gh pr create --fill` fails to infer the head branch when run
  // from a git worktree (it reads the main checkout's HEAD), so name the branch directly.
  const create = await git(`gh pr create --fill --head ${JSON.stringify(branch)} ${extra}`.trim());
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
    if (/worktree|already used|checked out/i.test(m.out)) {
      // gh's --delete-branch post-merge step does a LOCAL `git checkout <base>`, which
      // fails in a LINKED worktree (the base is checked out in the MAIN worktree). The
      // MERGE itself + the REMOTE branch delete already succeeded on GitHub — only the
      // local checkout failed. Verify the PR actually merged, then treat it as success
      // (the local feature branch is swept below). This is the worktree-ship ff-sync
      // gotcha (convergence pr-cycle-ts-1) — fixed at the source instead of by hand.
      const st = (await git(`gh pr view ${b} --json state -q .state`)).out.trim();
      if (/MERGED/i.test(st)) {
        info(`  ✓ merged (gh local checkout skipped — base held by main worktree)`);
        merged = true;
        break;
      }
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

  // 4.5 local <base> sync — pull the just-merged commit into the LOCAL base branch so
  //   it never falls behind origin/<base> (the "로컬 main 뒤처짐" leak). pr-cycle runs
  //   on a FEATURE branch, so update the local base ref WITHOUT switching checkout:
  //   `git fetch origin <base>:<base>` fast-forwards local <base> (refuses non-ff →
  //   safe, never clobbers). Working tree untouched. Skip only if HEAD is the base.
  if (onBase) {
    const cur = (await git("git rev-parse --abbrev-ref HEAD")).out;
    if (cur === base) {
      await git("git pull --ff-only --no-verify");
      info(`  ✓ 로컬 ${base} ← origin/${base} sync (pull --ff-only)`);
    } else {
      const ff = await git(`git fetch origin ${JSON.stringify(base + ":" + base)}`);
      if (ff.code === 0) {
        info(`  ✓ 로컬 ${base} ← origin/${base} sync (ff)`);
      } else if (/worktree|checked out|is already used/i.test(ff.out)) {
        // local <base> is checked out in the MAIN worktree (we ran from a linked one). git
        // refuses to update a ref checked out elsewhere — so ff-sync it IN that worktree
        // instead of leaving local <base> stale (the "로컬 main 뒤처짐" leak · pr-cycle-ts-1).
        const list = (await git("git worktree list --porcelain")).out;
        const mainWt = (list.match(/^worktree (.+)$/m) || [])[1];
        await git(`git fetch origin ${JSON.stringify(base)}`);
        const ff2 = mainWt ? await git(`git merge --ff-only ${JSON.stringify("origin/" + base)}`, mainWt) : { code: 1, out: "" };
        if (ff2.code === 0) info(`  ✓ 로컬 ${base} ← origin/${base} sync (main worktree)`);
        else info(`  ℹ 로컬 ${base} 는 다른 worktree 가 사용 중 — 머지는 origin/${base} 에 검증됨 (그 worktree 가 pull 시 ff)`);
      } else {
        info(`  ⚠ 로컬 ${base} sync 실패(non-ff?) — 수동 확인`);
      }
    }
  }

  // 5. post-merge worktree sweep — remove merged agent worktrees + local branches
  await sweepMergedWorktrees();

  // 6. stale-PR reaper — reconcile any OTHER open PRs of mine so none rot abandoned.
  //    Runs only after a verified merge; opt-out with --no-reap.
  if (onBase && !args.includes("--no-reap")) await reapStalePrs(branch);

  return merged && onBase ? 0 : (merged ? 0 : 1);
}
