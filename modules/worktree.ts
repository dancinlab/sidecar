// harness worktree {scan|gc|guard <cmd>}
// Enforces the no-pileup / no-stranded-work principle (sidecar worktree-gc +
// worktree-guard parity):
//   scan         classify every linked worktree (clean/dirty/unpushed/[gone]) and
//                LOUDLY flag STRANDED ones — uncommitted or unpushed work left in a
//                worktree. Exit 1 when any are stranded (usable as a gate).
//   gc           eagerly sweep merged + dangling AGENT worktrees/branches: an
//                upstream of [gone] (squash-safe merged signal) → git worktree
//                remove + git branch -D. UNCONDITIONAL live-work guards skip a
//                worktree that is dirty / recently touched (<1h) / locked, so an
//                active task is NEVER wiped. Always exits 0 (non-blocking).
//   guard <cmd>  advisory for `git worktree add`: if stranded work already exists,
//                steer to finish/clean it BEFORE starting new work (principle 3);
//                plus the branch-reuse stale-base warning.
import { execShell } from "../lib/exec.ts";
import { repoPath } from "../lib/config.ts";
import { info, ok, warn, loudFail } from "../lib/log.ts";

async function git(cmd: string, cwd?: string): Promise<{ code: number; out: string }> {
  const r = await execShell(cmd, { cwd: cwd ?? repoPath(".") });
  return { code: r.code, out: (r.stdout + r.stderr).trim() };
}

export interface WT {
  path: string;
  branch: string;
  locked: boolean;
  isMain: boolean;
  isAgent: boolean;
  dirty: boolean;
  ahead: number; // commits not on upstream (unpushed)
  track: string; // upstream:track, e.g. "[gone]" / "" / "[ahead 2]"
  stranded: boolean; // dirty OR unpushed → abandoned work
}

function isAgentPath(p: string): boolean {
  if (p.includes("/.claude/worktrees/")) return true;
  const base = p.split("/").pop() ?? "";
  return base.startsWith("agent-") || base.startsWith("worktree-agent-");
}

export async function classify(): Promise<WT[]> {
  const list = (await git("git worktree list --porcelain")).out;
  if (!list) return [];
  const blocks = list.split(/\n\s*\n/);
  const out: WT[] = [];
  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    const path = (b.match(/^worktree (.+)$/m) || [])[1];
    if (!path) continue;
    const branch = (b.match(/^branch refs\/heads\/(.+)$/m) || [])[1] ?? "";
    const locked = /^locked/m.test(b);
    const isMain = bi === 0;
    const dirty = !isMain && (await git("git status --porcelain", path)).out.length > 0;
    const track = branch ? (await git(`git for-each-ref --format='%(upstream:track)' refs/heads/${JSON.stringify(branch)}`, path)).out : "";
    // unpushed: commits on HEAD not on upstream; if no upstream, count commits beyond origin/main
    let ahead = 0;
    if (!isMain) {
      const up = (await git("git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null", path)).out;
      const base = up || "origin/main";
      const rl = (await git(`git rev-list --count ${JSON.stringify(base)}..HEAD 2>/dev/null`, path)).out;
      ahead = parseInt(rl || "0", 10) || 0;
      if (!up && track !== "[gone]") {
        // no upstream at all → only "unpushed" if it carries its own commits
        ahead = ahead > 0 ? ahead : 0;
      }
    }
    const stranded = !isMain && (dirty || ahead > 0);
    out.push({ path, branch, locked, isMain, isAgent: isAgentPath(path), dirty, ahead, track, stranded });
  }
  return out;
}

export async function strandedWorktrees(): Promise<WT[]> {
  return (await classify()).filter((w) => w.stranded);
}

async function recentlyTouched(path: string): Promise<boolean> {
  const ct = parseInt((await git("git log -1 --format=%ct 2>/dev/null", path)).out || "0", 10);
  if (!ct) return false;
  return Date.now() / 1000 - ct < 3600; // HEAD commit < 1h ago
}

async function scan(): Promise<number> {
  const wts = await classify();
  const linked = wts.filter((w) => !w.isMain);
  if (!linked.length) {
    info("worktree: 0 linked — clean.");
    return 0;
  }
  const stranded = linked.filter((w) => w.stranded);
  info(`worktree: ${linked.length} linked · ${stranded.length} stranded`);
  for (const w of linked) {
    const flags = [
      w.dirty ? "dirty" : "",
      w.ahead > 0 ? `unpushed:${w.ahead}` : "",
      w.track === "[gone]" ? "merged[gone]" : "",
      w.locked ? "locked" : "",
    ].filter(Boolean).join(" ");
    const mark = w.stranded ? "⚠" : w.track === "[gone]" ? "🧹" : "✓";
    info(`  ${mark} ${w.path}  [${w.branch || "detached"}]  ${flags || "clean"}`);
  }
  if (stranded.length) {
    loudFail(`worktree: ${stranded.length} STRANDED — finish via 'harness pr-cycle' or clean (commit+push / git worktree remove) before new work.`);
    return 1;
  }
  return 0;
}

async function gc(): Promise<number> {
  const wts = await classify();
  const main = wts.find((w) => w.isMain)?.path;
  if (main) await git("git fetch -p origin", main);
  // re-classify after fetch so [gone] is fresh
  const fresh = await classify();
  let swept = 0;

  for (const w of fresh) {
    if (w.isMain || !w.isAgent) continue; // only agent worktrees, conservative
    if (w.locked) continue; // another live checkout
    if (w.track !== "[gone]") continue; // only merged + deleted (squash-safe)
    if (w.dirty) { info(`  ⏭ skip (dirty): ${w.path}`); continue; }
    if (await recentlyTouched(w.path)) { info(`  ⏭ skip (recent <1h): ${w.path}`); continue; }
    const rm = await git(`git worktree remove --force ${JSON.stringify(w.path)}`);
    if (rm.code === 0) {
      if (w.branch) await git(`git branch -D ${JSON.stringify(w.branch)}`);
      info(`  🧹 swept merged worktree: ${w.path}`);
      swept++;
    }
  }
  await git("git worktree prune");

  // dangling AGENT branches (no worktree) whose upstream is [gone]
  const branches = (await git("git for-each-ref --format='%(refname:short) %(upstream:track)' refs/heads")).out.split("\n");
  const wtBranches = new Set(fresh.map((w) => w.branch).filter(Boolean));
  for (const line of branches) {
    const [br, ...rest] = line.trim().split(/\s+/);
    if (!br) continue;
    if (!(br.startsWith("agent-") || br.startsWith("worktree-agent-"))) continue;
    if (wtBranches.has(br)) continue; // still has a worktree
    if (rest.join(" ") !== "[gone]") continue;
    if ((await git(`git branch -D ${JSON.stringify(br)}`)).code === 0) {
      info(`  🧹 deleted dangling branch: ${br}`);
      swept++;
    }
  }

  const stranded = (await strandedWorktrees());
  if (stranded.length) warn(`worktree gc: ${stranded.length} stranded worktree(s) left untouched (active work) — finish via 'harness pr-cycle'.`);
  if (swept === 0 && !stranded.length) ok("worktree gc: nothing to sweep — clean.");
  else if (swept > 0) ok(`worktree gc: swept ${swept} merged/dangling item(s).`);
  return 0;
}

// Advisory for `git worktree add` — non-blocking. Returns the advisory text or "".
export async function worktreeAddAdvisory(cmd: string): Promise<string> {
  if (!/\bgit\s+worktree\s+add\b/.test(cmd)) return "";
  const lines: string[] = [];
  const stranded = await strandedWorktrees();
  if (stranded.length) {
    lines.push(
      `⚠ ${stranded.length} stranded worktree(s) already exist (uncommitted/unpushed work). 원칙: 방치된 작업을 먼저 완료(harness pr-cycle)/정리한 뒤 새 작업을 시작하세요:`
    );
    for (const w of stranded) lines.push(`    • ${w.path} [${w.branch}] ${w.dirty ? "dirty " : ""}${w.ahead ? "unpushed:" + w.ahead : ""}`);
  }
  // branch-reuse stale-base warning (anima #1105)
  const m = cmd.match(/git\s+worktree\s+add\s+(?:--\S+\s+)*-b\s+(\S+)/);
  if (m) {
    const br = m[1].replace(/['"]/g, "");
    const exists = (await git(`git rev-parse --verify -q ${JSON.stringify(br)}`)).code === 0;
    if (exists) lines.push(`⚠ branch '${br}' already exists — reusing a stale local branch carries stale-base revert risk; cut a fresh per-PR branch from origin/main (e.g. ${br}-<ts>).`);
  }
  return lines.join("\n");
}

export async function runWorktree(args: string[]): Promise<number> {
  const sub = args[0] ?? "scan";
  if (sub === "scan" || sub === "status") return scan();
  if (sub === "gc") return gc();
  if (sub === "guard") {
    const adv = await worktreeAddAdvisory(args.slice(1).join(" "));
    if (adv) process.stderr.write(adv + "\n");
    return 0;
  }
  info("usage: harness worktree {scan|gc|guard <cmd>}");
  return 1;
}
