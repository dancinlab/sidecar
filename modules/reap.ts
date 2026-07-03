// sidecar reap [--max-refresh N] [--no-close] [--dry-run] [--artifact <regex>]...
// Stale-PR reaper engine — drains the open-PR backlog that pr-cycle's happy path
// never touches. pr-cycle merges its OWN PR in-turn; any PR whose session died
// before that merge rots to CONFLICTING within hours (every PR touches the same
// doc-SSOT hotspot files: CHANGELOG/ARCHITECTURE/ING), and a conflicting PR has
// zero automated outflow → the backlog grows monotonically. This module gives it
// an outflow, in order of preference:
//   1. MERGEABLE → squash-merge WITHOUT --admin (stale work must pass checks —
//      only the in-turn pr-cycle merge, just tested by its author session, earns
//      the --admin bypass).
//   2. CONFLICTING → refresh-merge: in a throwaway worktree, merge base INTO the
//      PR branch (squash-merge makes the merge commit vanish, so NO force-push is
//      ever needed), auto-resolving ONLY non-code files:
//        · CHANGELOG.jsonl / CHANGELOG.md / ING.jsonl → line-union (keep BOTH sides
//          — append-only logs, order-insensitive, lossless)
//        · ARCHITECTURE.json/.md → take base side (update-in-place SSOT; branch side
//          is stale vs everything merged since). LOSSLESS: the pre-refresh head sha
//          is posted as a PR comment so the dropped doc edit stays recoverable.
//        · configured artifact paths (reap.artifactPaths) → take branch side (new data)
//      ANY code-file conflict aborts the refresh untouched — never auto-resolve code.
//   3. Refresh-blocked (code conflicts) + stale ≥ reap.closeAfterDays → close the PR
//      with an explanatory comment, BRANCH PRESERVED (never deleted) → one-click
//      reopen, work intact. Reversibility is what makes auto-close agent-safe.
//   4. External-author PRs are NEVER touched — surfaced as a count for a human.
// GitHub ignores .gitattributes merge drivers (incl. union) server-side — that is
// WHY the refresh happens locally in a worktree; a union attribute alone can never
// clear a PR's CONFLICTING state.
// Shared by `sidecar pr-cycle` (post-merge pass, --no-reap to skip) and the
// standalone `sidecar reap` (cron-able — a repo that goes quiet still drains).
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execShell } from "../lib/exec.ts";
import { info, ok, loudFail } from "../lib/log.ts";
import { config, repoPath } from "../lib/config.ts";

async function git(cmd: string, cwd?: string): Promise<{ code: number; out: string }> {
  const r = await execShell(cmd, { cwd: cwd ?? repoPath(".") });
  return { code: r.code, out: (r.stdout + r.stderr).trim() };
}

// stdout-only variant for reading blob CONTENT (git() merges stderr into out,
// which would corrupt file bytes).
async function gitOut(cmd: string, cwd: string): Promise<{ code: number; stdout: string }> {
  const r = await execShell(cmd, { cwd });
  return { code: r.code, stdout: r.stdout };
}

const UNION_RE = /(^|\/)(CHANGELOG\.(jsonl|md)|ING\.jsonl)$/;
const ARCH_RE = /(^|\/)ARCHITECTURE\.(json|md)$/;

interface StalePr {
  number: number;
  title: string;
  headRefName: string;
  mergeable: string;
  isDraft: boolean;
  updatedAt: string;
}

interface ReapOpts {
  currentBranch?: string; // pr-cycle's own branch — never touched
  maxRefresh?: number;
  allowClose?: boolean;
  dryRun?: boolean;
  extraArtifacts?: string[];
  extraUnions?: string[];
}

interface RefreshResult {
  status: "merged" | "waiting-ci" | "blocked" | "error";
  blockedFiles?: string[];
  detail?: string;
}

// All of a PR's checks concluded green (SUCCESS/NEUTRAL/SKIPPED — or no checks at
// all)? Gates the --admin fallback below: --admin may bypass a required-review
// policy an own-PR can never satisfy (you cannot approve your own PR), but ONLY
// after CI has validated the code — stale work never lands unverified.
async function checksGreen(prNumber: number): Promise<boolean> {
  const r = await git(
    `gh pr view ${prNumber} --json statusCheckRollup --jq '[.statusCheckRollup[]? | .conclusion // "PENDING"] | join(",")'`,
  );
  if (r.code !== 0) return false;
  const cs = r.out.split(",").filter(Boolean);
  return cs.every((c) => c === "SUCCESS" || c === "NEUTRAL" || c === "SKIPPED");
}

// Merge a stale PR: plain no-admin first (respects every policy). If the ONLY
// obstacle is a base-branch policy (e.g. anima requires 1 approving review —
// unsatisfiable on own PRs) and the checks are green, retry with --admin: the
// review policy is bypassed, the CI validation is not.
async function mergeStale(prNumber: number): Promise<{ ok: boolean; detail: string }> {
  const mr = await git(`gh pr merge ${prNumber} --squash --delete-branch`);
  if (mr.code === 0) return { ok: true, detail: "" };
  if (/policy|review|not mergeable/i.test(mr.out) && (await checksGreen(prNumber))) {
    const ad = await git(`gh pr merge ${prNumber} --squash --admin --delete-branch`);
    if (ad.code === 0) return { ok: true, detail: "checks-green · admin(리뷰정책만 우회)" };
    return { ok: false, detail: ad.out.split("\n")[0] };
  }
  return { ok: false, detail: mr.out.split("\n")[0] };
}

function reapCfg() {
  const c = config().reap ?? ({} as Partial<ReturnType<typeof config>["reap"]>);
  return {
    maxRefreshPerRun: c.maxRefreshPerRun ?? 3,
    closeAfterDays: c.closeAfterDays ?? 7,
    artifactPaths: c.artifactPaths ?? ["(^|/)state/"],
    unionPaths: c.unionPaths ?? [],
  };
}

function compileRes(patterns: string[]): RegExp[] {
  return patterns
    .map((p) => {
      try {
        return new RegExp(p);
      } catch {
        return null;
      }
    })
    .filter((r): r is RegExp => r !== null);
}

async function defaultBase(): Promise<string> {
  const headRef = (await git("git rev-parse --abbrev-ref origin/HEAD 2>/dev/null")).out.replace(/^origin\//, "");
  return headRef && headRef !== "HEAD" ? headRef : "main";
}

// Union-resolve one conflicted append-only log file inside the refresh worktree:
// stage 2 = PR side ("ours"), stage 3 = base side ("theirs"), stage 1 = ancestor
// (absent on add/add). `git merge-file --union` keeps BOTH sides' lines — lossless.
async function unionResolve(
  wt: string,
  f: string,
  scratch: string,
): Promise<"union" | "took-base" | "took-base-delete" | null> {
  const q = JSON.stringify(f);
  const ours = await gitOut(`git show :2:${q}`, wt);
  const theirs = await gitOut(`git show :3:${q}`, wt);
  // delete/modify: the base side removed the file (e.g. CHANGELOG.md migrated to
  // .jsonl) or the branch did. Follow the base side — it reflects every merge since
  // — and report as "dropped" so the caller posts the lossless pre-refresh pointer.
  if (ours.code === 0 && theirs.code !== 0) {
    const rm = await git(`git rm -q -- ${q}`, wt);
    return rm.code === 0 ? "took-base-delete" : null;
  }
  if (ours.code !== 0 && theirs.code === 0) {
    const r = await git(`git checkout --theirs -- ${q} && git add ${q}`, wt);
    return r.code === 0 ? "took-base" : null;
  }
  if (ours.code !== 0) return null;
  const base = await gitOut(`git show :1:${q}`, wt); // may not exist (add/add)
  const fo = join(scratch, "ours"), fb = join(scratch, "base"), ft = join(scratch, "theirs");
  writeFileSync(fo, ours.stdout);
  writeFileSync(fb, base.code === 0 ? base.stdout : "");
  writeFileSync(ft, theirs.stdout);
  const m = await git(`git merge-file --union ${JSON.stringify(fo)} ${JSON.stringify(fb)} ${JSON.stringify(ft)}`, wt);
  if (m.code < 0) return null; // >0 = conflict count, still written with union
  const cp = await git(`cp ${JSON.stringify(fo)} ${q} && git add ${q}`, wt);
  return cp.code === 0 ? "union" : null;
}

// Refresh one CONFLICTING own-PR: merge base into the branch in a throwaway
// worktree, auto-resolve doc/artifact files only, plain push (never force), then
// try a NO-ADMIN merge. dryRun stops after classification (nothing pushed).
async function refreshPr(pr: StalePr, base: string, artifactRes: RegExp[], unionRes: RegExp[], dryRun: boolean): Promise<RefreshResult> {
  const head = pr.headRefName;
  const fetch = await git(`git fetch -q origin ${JSON.stringify(head)} ${JSON.stringify(base)}`);
  if (fetch.code !== 0) return { status: "error", detail: `fetch: ${fetch.out.split("\n")[0]}` };
  const preSha = (await git(`git rev-parse ${JSON.stringify("origin/" + head)}`)).out.slice(0, 12);
  const tmp = mkdtempSync(join(tmpdir(), `sidecar-reap-${pr.number}-`));
  const wt = join(tmp, "wt");
  const scratch = join(tmp, "stage");
  await git(`mkdir -p ${JSON.stringify(scratch)}`);
  try {
    const add = await git(`git worktree add --detach ${JSON.stringify(wt)} ${JSON.stringify("origin/" + head)}`);
    if (add.code !== 0) return { status: "error", detail: `worktree: ${add.out.split("\n")[0]}` };
    let merge = await git(`git merge --no-edit ${JSON.stringify("origin/" + base)}`, wt);
    // Shallow clone: an old PR branch's merge-base can sit OUTSIDE the shallow
    // boundary, so git sees "unrelated histories". Deepen to full history once
    // (is-shallow flips false afterwards) and retry — the refusal happens before
    // any merge state is created, so a straight retry is safe.
    if (merge.code !== 0 && /unrelated histories|no merge base/i.test(merge.out)) {
      const shallow = (await git("git rev-parse --is-shallow-repository")).out === "true";
      if (shallow) {
        info("     ℹ shallow clone — git fetch --unshallow (merge-base 확보, 1회)");
        const us = await git("git fetch -q --unshallow origin");
        if (us.code === 0) merge = await git(`git merge --no-edit ${JSON.stringify("origin/" + base)}`, wt);
      }
    }
    const dropped: string[] = [];
    if (merge.code !== 0) {
      const unresolved = (await git("git diff --name-only --diff-filter=U", wt)).out.split("\n").filter(Boolean);
      if (!unresolved.length) return { status: "error", detail: merge.out.split("\n")[0] };
      const blocked: string[] = [];
      for (const f of unresolved) {
        const q = JSON.stringify(f);
        if (UNION_RE.test(f) || unionRes.some((re) => re.test(f))) {
          const u = await unionResolve(wt, f, scratch);
          if (u === null) blocked.push(f);
          else if (u !== "union") dropped.push(f); // base-side delete/version won — comment preserves pointer
        } else if (ARCH_RE.test(f)) {
          const r = await git(`git checkout --theirs -- ${q} && git add ${q}`, wt);
          if (r.code === 0) dropped.push(f);
          else blocked.push(f);
        } else if (artifactRes.some((re) => re.test(f))) {
          const r = await git(`git checkout --ours -- ${q} && git add ${q}`, wt);
          if (r.code !== 0) blocked.push(f);
        } else {
          blocked.push(f); // code conflict — never auto-resolved
        }
      }
      if (dryRun || blocked.length) {
        await git("git merge --abort", wt);
        return { status: "blocked", blockedFiles: blocked, detail: dryRun ? "dry-run" : undefined };
      }
      const commit = await git("git commit --no-edit --no-verify", wt);
      if (commit.code !== 0) return { status: "error", detail: `commit: ${commit.out.split("\n")[0]}` };
    } else if (dryRun) {
      return { status: "blocked", blockedFiles: [], detail: "dry-run" };
    }
    // plain fast-forward push of the refreshed branch — head was fetched moments
    // ago, so a non-ff rejection here means a concurrent writer: skip, next pass.
    const push = await git(`git push --no-verify origin ${JSON.stringify("HEAD:refs/heads/" + head)}`, wt);
    if (push.code !== 0) return { status: "error", detail: `push: ${push.out.split("\n")[0]}` };
    if (dropped.length) {
      const body =
        `auto-refresh (sidecar reap): merged \`${base}\` into this branch to clear doc-file conflicts. ` +
        `Branch-side edits to ${dropped.map((d) => `\`${d}\``).join(", ")} were superseded by \`${base}\` ` +
        `(update-in-place SSOT). Nothing is lost: the pre-refresh head is ${preSha} — re-apply from there if needed.`;
      await git(`gh pr comment ${pr.number} --body ${JSON.stringify(body)}`);
      info(`     ℹ #${pr.number}: ${dropped.join(", ")} → ${base} 측 채택 (pre-refresh head ${preSha} 코멘트로 보존)`);
    }
    for (let i = 0; i < 5; i++) {
      await execShell("sleep 4");
      const m = (await git(`gh pr view ${pr.number} --json mergeable -q .mergeable`)).out;
      if (m === "MERGEABLE") {
        const mr = await mergeStale(pr.number);
        if (mr.ok) return { status: "merged", detail: mr.detail };
        return { status: "waiting-ci", detail: mr.detail };
      }
      if (m === "CONFLICTING") return { status: "error", detail: "still conflicting after refresh" };
    }
    return { status: "waiting-ci" };
  } finally {
    await git(`git worktree remove --force ${JSON.stringify(wt)}`);
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* best-effort scratch cleanup */
    }
  }
}

// Main engine — shared by pr-cycle's post-merge pass and the standalone command.
// Never throws; every failure is a reported line, never a crashed cycle.
export async function reapStale(opts: ReapOpts = {}): Promise<void> {
  const cfg = reapCfg();
  const maxRefresh = opts.maxRefresh ?? cfg.maxRefreshPerRun;
  const allowClose = opts.allowClose ?? true;
  const dryRun = opts.dryRun ?? false;
  const artifactRes = compileRes([...cfg.artifactPaths, ...(opts.extraArtifacts ?? [])]);
  const unionRes = compileRes([...cfg.unionPaths, ...(opts.extraUnions ?? [])]);

  const list = await git(
    `gh pr list --author @me --state open --json number,title,headRefName,mergeable,isDraft,updatedAt --limit 200`,
  );
  if (list.code !== 0) return; // no gh / no repo / offline — silent, non-fatal
  let prs: StalePr[] = [];
  try {
    prs = JSON.parse(list.out);
  } catch {
    return;
  }
  // external-author PRs are invisible to every automated path — surface them.
  const allNums = (await git(`gh pr list --state open --json number --jq '[.[].number]' --limit 200`)).out;
  try {
    const externals = (JSON.parse(allNums) as number[]).filter((n) => !prs.some((p) => p.number === n));
    if (externals.length) info(`reap: 외부 저자 PR ${externals.length}건은 자동화 제외 (사람 검토): #${externals.join(" #")}`);
  } catch {
    /* count is advisory only */
  }

  const stale = prs.filter((p) => p.headRefName !== opts.currentBranch);
  if (!stale.length) return;
  // oldest-first: each landed merge moves base under the rest, so drain the
  // longest-rotting ones while they still classify the same way.
  stale.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const base = await defaultBase();
  info(`reap: ♻ 방치 PR 점검 — 내 열린 PR ${stale.length}건${dryRun ? " (dry-run · 변경 없음)" : ""}`);
  let refreshUsed = 0;
  const tally = { merged: 0, refreshed: 0, waiting: 0, blocked: 0, closed: 0, skipped: 0 };
  for (const p of stale) {
    let m = p.mergeable;
    for (let i = 0; i < 3 && m === "UNKNOWN"; i++) {
      await execShell("sleep 2");
      m = (await git(`gh pr view ${p.number} --json mergeable -q .mergeable`)).out;
    }
    const tag = `#${p.number} ${p.title.slice(0, 48)}`;
    if (p.isDraft) {
      info(`  ✏️ draft 제외: ${tag}`);
      tally.skipped++;
      continue;
    }
    if (m === "MERGEABLE") {
      if (dryRun) {
        info(`  ✓ (dry-run) 머지 가능: ${tag}`);
        tally.merged++;
        continue;
      }
      const mr = await mergeStale(p.number);
      if (mr.ok) {
        ok(`  ✓ 수확 머지: ${tag}${mr.detail ? ` (${mr.detail})` : ""}`);
        tally.merged++;
      } else {
        info(`  ⏳ ${tag} — 머지 보류(checks?): ${mr.detail}`);
        tally.waiting++;
      }
    } else if (m === "CONFLICTING") {
      if (refreshUsed >= maxRefresh) {
        info(`  ⏭ ${tag} — refresh 한도(${maxRefresh}/run) 도달, 다음 pass 에서`);
        tally.skipped++;
        continue;
      }
      refreshUsed++;
      const r = await refreshPr(p, base, artifactRes, unionRes, dryRun);
      if (r.status === "merged") {
        ok(`  ✓ refresh 머지: ${tag}`);
        tally.refreshed++;
      } else if (r.status === "waiting-ci") {
        info(`  ⏳ ${tag} — refresh 푸시 완료, CI 대기 (다음 pass 에서 머지)${r.detail ? ` · ${r.detail}` : ""}`);
        tally.waiting++;
      } else if (r.status === "blocked") {
        const files = r.blockedFiles ?? [];
        if (files.length) loudFail(`  🧱 코드 충돌: ${tag} — ${files.slice(0, 4).join(", ")}${files.length > 4 ? " …" : ""}`);
        else info(`  🧪 (dry-run) 문서충돌만 — refresh 로 해소 가능: ${tag}`);
        tally.blocked++;
        const ageDays = (Date.now() - Date.parse(p.updatedAt)) / 86400000;
        if (!dryRun && files.length && allowClose && ageDays >= cfg.closeAfterDays) {
          const body =
            `Auto-closed by sidecar reap: code-file conflicts (${files.join(", ")}) blocked the automated ` +
            `refresh and this PR has been inactive ${Math.floor(ageDays)}d. The branch \`${p.headRefName}\` is ` +
            `PRESERVED — rebase on \`${base}\` and reopen to continue; nothing was deleted.`;
          const cl = await git(`gh pr close ${p.number} --comment ${JSON.stringify(body)}`);
          if (cl.code === 0) {
            info(`     🗃 close(브랜치 보존 · ${Math.floor(ageDays)}d 무활동): ${tag}`);
            tally.closed++;
          }
        } else if (files.length) {
          info(`     → 수동 해소: \`git fetch origin && git merge origin/${base}\` 후 pr-cycle, 폐기면 \`gh pr close ${p.number}\``);
        }
      } else {
        info(`  ⚠ ${tag} — refresh 실패: ${r.detail ?? "?"}`);
        tally.skipped++;
      }
    } else {
      info(`  ⏳ ${tag} — 상태 ${m || "?"} — gh pr view ${p.number} 확인`);
      tally.skipped++;
    }
  }
  info(
    `reap: 결과 — 머지 ${tally.merged} · refresh머지 ${tally.refreshed} · CI대기 ${tally.waiting} · ` +
      `코드충돌 ${tally.blocked} (close ${tally.closed}) · 보류 ${tally.skipped}`,
  );
}

export async function runReap(args: string[]): Promise<number> {
  if (args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
    info("usage: sidecar reap [--max-refresh N] [--no-close] [--dry-run] [--artifact <regex>]... [--union <regex>]...");
    return 0;
  }
  const opts: ReapOpts = { extraArtifacts: [], extraUnions: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max-refresh") opts.maxRefresh = parseInt(args[++i] ?? "", 10) || undefined;
    else if (args[i] === "--no-close") opts.allowClose = false;
    else if (args[i] === "--dry-run") opts.dryRun = true;
    else if (args[i] === "--artifact") opts.extraArtifacts!.push(args[++i] ?? "");
    else if (args[i] === "--union") opts.extraUnions!.push(args[++i] ?? "");
    else {
      loudFail(`reap: unknown flag ${args[i]}`);
      return 1;
    }
  }
  await reapStale(opts);
  return 0;
}
