// git-context — SessionStart inject that surfaces the working git position so a
// session never silently starts on a STALE branch and reads outdated code. The
// recurring failure (stale-branch trap): a session began on an old feature branch
// (HEAD behind origin/<default> after a merge), the agent read the pre-merge code,
// believed it was current, and re-implemented already-merged work. Nothing flagged
// that HEAD ≠ the merged tip.
//
// This guard computes HEAD vs origin/<default> (main|master) from LOCAL refs (no
// network) and emits an additionalContext block at SessionStart. When HEAD is
// BEHIND the default tip — or detached on an unknown commit — it emits a loud ⚠️
// with the exact remedy: `git log origin/<default> -- <file>` before trusting any
// file's contents. On the up-to-date default branch it stays a one-line OK.
//
// @convergence state=in_flight id=STALE_BRANCH_TRAP value="SessionStart surfaces HEAD vs origin/<default> (behind/ahead/detached); BEHIND or detached → loud ⚠️ stale-branch warning so the agent re-checks origin before trusting code (and doesn't duplicate already-merged work)" threshold="a session started on a stale feature branch behind origin/main, read pre-merge code as current, and rebuilt an already-merged fix (#3736 dup of #3734); no guard flagged HEAD≠merged-tip"

import { execArgs, readStdin } from "../lib/exec.ts";
import { REPO_ROOT } from "../lib/paths.ts";

async function git(args: string[]): Promise<string> {
  const r = await execArgs("git", args, { cwd: REPO_ROOT, timeoutMs: 8000 });
  return r.code === 0 ? r.stdout.trim() : "";
}

// Resolve the default branch ref that exists locally: prefer origin/main, then
// origin/master, then a bare local main/master. Empty when none resolve.
async function defaultRef(): Promise<string> {
  for (const ref of ["origin/main", "origin/master", "main", "master"]) {
    if (await git(["rev-parse", "--verify", "--quiet", ref])) return ref;
  }
  return "";
}

export interface GitContext {
  branch: string; // branch name, or "(detached)"
  detached: boolean;
  ref: string; // the default ref compared against (e.g. origin/main)
  behind: number; // commits on ref not in HEAD (HEAD is missing these = stale)
  ahead: number; // commits on HEAD not in ref
}

// Pure-ish probe of the working git position (LOCAL refs only, no fetch).
export async function probeGitContext(): Promise<GitContext | null> {
  if (!(await git(["rev-parse", "--is-inside-work-tree"]))) return null;
  const branch = (await git(["rev-parse", "--abbrev-ref", "HEAD"])) || "HEAD";
  const detached = branch === "HEAD";
  const ref = await defaultRef();
  let behind = 0;
  let ahead = 0;
  if (ref) {
    // left-right count: "<behind>\t<ahead>" for ref...HEAD (left=ref-only commits).
    const counts = await git(["rev-list", "--left-right", "--count", `${ref}...HEAD`]);
    const m = counts.split(/\s+/);
    behind = parseInt(m[0] ?? "0", 10) || 0;
    ahead = parseInt(m[1] ?? "0", 10) || 0;
  }
  return { branch, detached, ref, behind, ahead };
}

// Render the additionalContext block. Loud ⚠️ when stale (behind>0 or detached
// off the default tip); compact OK line otherwise.
export function renderGitContext(c: GitContext): string {
  const onDefault = !c.detached && (c.ref === `origin/${c.branch}` || c.ref === c.branch);
  const stale = c.behind > 0 || (c.detached && c.behind > 0);
  if (!c.ref) {
    return `🌿 git-context — branch \`${c.branch}\`${c.detached ? " (detached)" : ""} · no origin/main|master ref to compare.`;
  }
  if (!stale && onDefault) {
    return `🌿 git-context — on \`${c.branch}\` ≡ ${c.ref}${c.ahead ? ` (+${c.ahead} ahead)` : ""} (up to date).`;
  }
  if (!stale) {
    return (
      `🌿 git-context — branch \`${c.branch}\`${c.detached ? " (detached)" : ""} vs ${c.ref}: ` +
      `+${c.ahead} ahead, 0 behind (not stale).`
    );
  }
  // STALE — loud warning + exact remedy.
  return (
    `⚠️ git-context — STALE WORKING POSITION (재발방지: stale-branch 함정)\n` +
    `  현재 HEAD: \`${c.branch}\`${c.detached ? " (detached)" : ""} — ${c.ref} 보다 **${c.behind} commit 뒤처짐**` +
    (c.ahead ? ` (+${c.ahead} ahead)` : "") +
    `.\n` +
    `  → 이 위치의 파일은 ${c.ref} 의 최신 상태가 **아닐 수 있습니다**. 코드를 "현재 상태"로 믿기 전에:\n` +
    `     1) \`git log ${c.ref} -- <file>\` 로 그 파일이 이미 머지/변경됐는지 확인 (이미 된 작업 중복 구현 방지)\n` +
    `     2) 새 작업이면 \`git checkout <default>\` 또는 \`git rebase ${c.ref}\` 로 최신 위에서 시작\n` +
    `  (지난 사고: stale feature 브랜치에서 옛 코드를 보고 이미 머지된 fix 를 #3736 으로 중복 구현 — #3734.)`
  );
}

export async function runGitContext(args: string[]): Promise<number> {
  const sub = args[0] ?? "inject";

  if (sub === "show") {
    const c = await probeGitContext();
    if (!c) {
      process.stdout.write("git-context: not a git work tree\n");
      return 0;
    }
    process.stdout.write(renderGitContext(c) + "\n");
    return 0;
  }

  if (sub === "inject") {
    const c = await probeGitContext();
    if (!c) return 0; // not a git repo → silent
    // Only inject when there is something worth surfacing — a stale position is
    // always worth it; on the clean default branch stay silent (no context noise).
    const stale = c.behind > 0;
    const onDefault = !c.detached && (c.ref === `origin/${c.branch}` || c.ref === c.branch);
    if (!stale && onDefault) return 0; // clean + on default → silent (no nag)
    const ctx = renderGitContext(c);
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: ctx } }) + "\n");
    } catch {
      return 0;
    }
    return 0;
  }

  process.stdout.write("usage: harness git-context {inject|show}\n");
  return 1;
}
