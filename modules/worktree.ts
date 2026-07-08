// sidecar worktree {scan|gc|inject|guard <cmd>}
// Enforces the no-pileup / no-stranded-work principle:
//   inject       SessionStart/Compact WARN inject — surface stranded worktrees +
//                stranded no-worktree branches + refs/reaped tips from prior sessions
//                the moment a new one begins (0 bytes when clean · reuses classify()).
//   scan         classify every linked worktree (clean/dirty/unpushed/[gone]) and
//                LOUDLY flag STRANDED ones — uncommitted or unpushed work left in a
//                worktree. Exit 1 when any are stranded (usable as a gate).
//   gc           eagerly sweep merged + dangling AGENT worktrees/branches. Reaps on
//                EITHER [gone] upstream (squash-safe merged signal) OR HEAD-age >
//                worktree.maxAgeDays (default 3) — the age backstop catches squash-
//                merge / no-push agent worktrees that never get [gone] and used to
//                pile up. An aged tip with un-pushed commits is first preserved under
//                refs/reaped/<branch> (fully recoverable). UNCONDITIONAL live-work
//                guards skip dirty / recently-touched (<1h) / locked worktrees, so an
//                active task is NEVER wiped. Always exits 0 (non-blocking).
//   guard <cmd>  advisory for `git worktree add`: if stranded work already exists,
//                steer to finish/clean it BEFORE starting new work (principle 3);
//                plus the branch-reuse stale-base warning.
import { execShell, readStdin } from "../lib/exec.ts";
import { repoPath, config } from "../lib/config.ts";
import { info, ok, warn, loudFail } from "../lib/log.ts";
import { emitInject } from "../lib/inject.ts";

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

// Days since the worktree's HEAD commit (Infinity if unknown → treated as old).
async function headAgeDays(path: string): Promise<number> {
  const ct = parseInt((await git("git log -1 --format=%ct 2>/dev/null", path)).out || "0", 10);
  if (!ct) return Infinity;
  return (Date.now() / 1000 - ct) / 86400;
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
    loudFail(`worktree: ${stranded.length} STRANDED — finish via 'sidecar pr-cycle' or clean (commit+push / git worktree remove) before new work.`);
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

  const maxAgeDays = config().worktree?.maxAgeDays ?? 3;
  for (const w of fresh) {
    if (w.isMain || !w.isAgent) continue; // only agent worktrees, conservative
    if (w.locked) continue; // another live checkout
    if (w.dirty) { info(`  ⏭ skip (dirty): ${w.path}`); continue; }
    if (await recentlyTouched(w.path)) { info(`  ⏭ skip (recent <1h): ${w.path}`); continue; }
    const gone = w.track === "[gone]"; // pushed + remote-deleted (squash-safe)
    const aged = maxAgeDays > 0 && (await headAgeDays(w.path)) > maxAgeDays;
    if (!gone && !aged) continue; // live/recent work → leave it
    // Aged reap may carry un-pushed commits (the [gone] path is already merged).
    // Preserve the tip under refs/reaped/ so the work stays fully recoverable.
    if (aged && !gone && w.ahead > 0 && w.branch) {
      const sha = (await git("git rev-parse --short HEAD", w.path)).out;
      await git(`git update-ref refs/reaped/${w.branch} HEAD`, w.path);
      info(`  🔖 preserved aged tip → refs/reaped/${w.branch} (${sha}, unpushed:${w.ahead})`);
    }
    const rm = await git(`git worktree remove --force ${JSON.stringify(w.path)}`);
    if (rm.code === 0) {
      if (w.branch) await git(`git branch -D ${JSON.stringify(w.branch)}`);
      info(`  🧹 swept ${gone ? "merged[gone]" : `aged(>${maxAgeDays}d)`} worktree: ${w.path}`);
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
  if (stranded.length) warn(`worktree gc: ${stranded.length} stranded worktree(s) left untouched (active work) — finish via 'sidecar pr-cycle'.`);
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
      `⚠ ${stranded.length} stranded worktree(s) already exist (uncommitted/unpushed work). 원칙: 방치된 작업을 먼저 완료(sidecar pr-cycle)/정리한 뒤 새 작업을 시작하세요:`
    );
    for (const w of stranded) lines.push(`    • ${w.path} [${w.branch}] ${w.dirty ? "dirty " : ""}${w.ahead ? "unpushed:" + w.ahead : ""}`);
  }
  // branch-reuse stale-base warning (anima #1105)
  const m = cmd.match(/git\s+worktree\s+add\b.*?-b\s+(\S+)/);
  if (m) {
    const br = m[1].replace(/['"]/g, "");
    const exists = (await git(`git rev-parse --verify -q ${JSON.stringify(br)}`)).code === 0;
    if (exists) lines.push(`⚠ branch '${br}' already exists — reusing a stale local branch carries stale-base revert risk; cut a fresh per-PR branch from origin/main (e.g. ${br}-<ts>).`);
  }
  return lines.join("\n");
}

// A stranded LOCAL BRANCH with NO worktree — the blind spot classify() (worktree-only)
// can't see: a feature branch left behind by a prior session, carrying its own commits,
// never pushed/merged. Deterministic: local branch, not main/master, not checked out in
// any worktree, has commits beyond origin/main (rev-list>0), HEAD age > 1h (skip in-flight),
// not in the config allowlist (worktree.branchAllow — intentional long-lived branches).
export interface StrandedBranch {
  branch: string;
  ahead: number; // commits beyond origin/main
  upstream: boolean; // has a tracking upstream (pushed) or not
  ageDays: number;
}
export async function strandedBranches(): Promise<StrandedBranch[]> {
  const allow = new Set((config().worktree?.branchAllow ?? []) as string[]);
  const defaults = new Set(["main", "master"]);
  // branches currently checked out in a worktree are NOT stranded-without-worktree
  const inWt = new Set((await classify()).map((w) => w.branch).filter(Boolean));
  const raw = (await git("git for-each-ref --format='%(refname:short)|%(upstream:short)|%(committerdate:unix)' refs/heads/")).out;
  if (!raw) return [];
  const out: StrandedBranch[] = [];
  for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const [branch, up, ct] = line.split("|");
    if (!branch || defaults.has(branch) || allow.has(branch) || inWt.has(branch)) continue;
    const ahead = parseInt((await git(`git rev-list --count origin/main..${JSON.stringify(branch)} 2>/dev/null`)).out || "0", 10) || 0;
    if (ahead <= 0) continue; // no own commits beyond main → nothing abandoned
    const ageDays = ct ? (Date.now() / 1000 - parseInt(ct, 10)) / 86400 : Infinity;
    if (ageDays * 24 < 1) continue; // touched < 1h ago → likely in-flight
    out.push({ branch, ahead, upstream: !!up, ageDays });
  }
  return out;
}

// SessionStart/Compact WARN inject — surface abandoned work from prior sessions the
// moment a new one begins, so it isn't silently piled onto. Reuses strandedWorktrees()
// + strandedBranches() (canonical-cli — no new detection). Emits 0 bytes when clean
// (self-limiting: no per-session context cost unless something genuinely needs a decision).
async function worktreeInject(): Promise<number> {
  let ev = "";
  try {
    const j = JSON.parse(readStdin());
    ev = String(j.hook_event_name ?? j.hookEventName ?? "");
  } catch {
    /* no payload → still emit under a default event below */
  }
  if (!ev) ev = "SessionStart";
  const [wts, brs, reaped] = await Promise.all([strandedWorktrees(), strandedBranches(), countReaped()]);
  if (wts.length === 0 && brs.length === 0 && reaped === 0) return 0; // clean → silent

  const lines: string[] = ["⚠️ stranded-work — 이전 세션의 방치 작업 감지 (새 작업 시작 전 항목별 처리 결정 필수)"];
  const CAP = 5;
  for (const w of wts.slice(0, CAP)) {
    const state = `${w.dirty ? "dirty " : ""}${w.ahead ? "unpushed:" + w.ahead : ""}`.trim();
    lines.push(`  • wt ${w.path} [${w.branch}] ${state}  → 이어서: \`cd ${w.path} && sidecar pr-cycle\``);
  }
  if (wts.length > CAP) lines.push(`  • … +${wts.length - CAP} more worktree(s)`);
  for (const b of brs.slice(0, CAP)) {
    lines.push(`  • br ${b.branch} — unpushed:${b.ahead}${b.upstream ? "" : " · upstream 없음"} · ${b.ageDays.toFixed(0)}d전  → 보존: \`git push -u origin ${b.branch}\` / 폐기: \`git branch -D ${b.branch}\``);
  }
  if (brs.length > CAP) lines.push(`  • … +${brs.length - CAP} more branch(es)`);
  if (reaped) lines.push(`  (refs/reaped ${reaped}건 — 복구 가능한 보존 tip · \`git branch <name> refs/reaped/<name>\`)`);
  emitInject("worktree-stranded", ev, lines.join("\n"));
  return 0;
}

async function countReaped(): Promise<number> {
  const raw = (await git("git for-each-ref --format='%(refname)' refs/reaped/")).out;
  return raw ? raw.split("\n").filter(Boolean).length : 0;
}

export async function runWorktree(args: string[]): Promise<number> {
  const sub = args[0] ?? "scan";
  if (sub === "scan" || sub === "status") return scan();
  if (sub === "gc") return gc();
  if (sub === "inject") return worktreeInject();
  if (sub === "guard") {
    const adv = await worktreeAddAdvisory(args.slice(1).join(" "));
    if (adv) process.stderr.write(adv + "\n");
    return 0;
  }
  info("usage: sidecar worktree {scan|gc|inject|guard <cmd>}");
  return 1;
}
