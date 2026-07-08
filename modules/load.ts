// sidecar load {show|inject}
// Per-turn macOS resource pressure readout, injected as a UserPromptSubmit
// additionalContext line so the agent surfaces it every reply.
//
// Why both CPU AND memory: a Mac that "keeps dying" is almost always memory
// pressure (compressor + swap blowup) rather than CPU saturation — so we report
// the load average AND the kernel memory-pressure level + RAM-used% + swap-used,
// flagging ⚠️ when any axis enters a danger band.
//
// Cost: only sysctl + vm_stat (cheap, instant). We deliberately avoid the
// `memory_pressure` CLI — it does a full system scan and can take seconds, which
// is unacceptable for a hook that fires on every prompt. The open-PR count is
// the one network-backed axis, so it goes through a TTL cache (git common dir)
// and a hard subprocess timeout — a cold fetch happens at most once per TTL.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { emitInject } from "../lib/inject.ts";
import { info } from "../lib/log.ts";
import { readStdin } from "../lib/exec.ts";

interface Snapshot {
  load1: number;
  cores: number;
  cpuLight: string;
  ramUsedPct: number;
  pressure: number; // 1 normal · 2 warn · 4 critical
  pressureLabel: string;
  ramLight: string;
  swapUsedGiB: number;
  swapLight: string;
  worktrees: number; // extra git worktrees (main checkout excluded) — hygiene at-a-glance
  strandedWt: number; // of those, how many are STRANDED (dirty OR unpushed) — abandoned work · TTL-cached
  openPRs: number | null; // open PRs on this repo (gh · TTL-cached) — null = unknown (no repo/gh)
  danger: boolean;
}

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function light(value: number, warn: number, crit: number): string {
  if (value >= crit) return "🔴";
  if (value >= warn) return "🟡";
  return "🟢";
}

export function readSnapshot(): Snapshot | null {
  // load average — "{ 1m 5m 15m }"
  const la = sh("sysctl -n vm.loadavg");
  const m = la.match(/([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) return null; // non-macOS or sysctl missing → caller skips injection
  const load1 = parseFloat(m[1]);
  const cores = parseInt(sh("sysctl -n hw.ncpu") || "1", 10) || 1;
  const cpuLight = light(load1 / cores, 0.7, 1.0);

  // memory — parse vm_stat pages; used ≈ active + wired + compressor (the pages
  // apps actually hold and the kernel can't cheaply reclaim).
  const total = parseInt(sh("sysctl -n hw.memsize") || "0", 10);
  const vm = sh("vm_stat");
  const pg = (re: RegExp): number => {
    const x = vm.match(re);
    return x ? parseInt(x[1], 10) : 0;
  };
  const pageSize = (() => {
    const x = vm.match(/page size of (\d+) bytes/);
    return x ? parseInt(x[1], 10) : 16384;
  })();
  const active = pg(/Pages active:\s+(\d+)/);
  const wired = pg(/Pages wired down:\s+(\d+)/);
  const compressor = pg(/Pages occupied by compressor:\s+(\d+)/);
  const usedBytes = (active + wired + compressor) * pageSize;
  const ramUsedPct = total > 0 ? Math.round((usedBytes / total) * 100) : 0;

  const pressure = parseInt(sh("sysctl -n kern.memorystatus_vm_pressure_level") || "1", 10) || 1;
  const pressureLabel = pressure >= 4 ? "critical" : pressure >= 2 ? "warn" : "normal";
  // RAM light: the worse of used% band and kernel pressure level.
  const ramByPct = light(ramUsedPct, 80, 90);
  const ramByPressure = pressure >= 4 ? "🔴" : pressure >= 2 ? "🟡" : "🟢";
  const ramLight = ["🔴", "🟡", "🟢"].find((l) => l === ramByPct || l === ramByPressure) ?? "🟢";

  // swap — "total = X used = Y free = Z"
  const sw = sh("sysctl -n vm.swapusage");
  const su = sw.match(/used\s*=\s*([\d.]+)([MG])/);
  let swapUsedGiB = 0;
  if (su) {
    const n = parseFloat(su[1]);
    swapUsedGiB = su[2] === "G" ? n : n / 1024;
  }
  const swapLight = light(swapUsedGiB, 2, 6);

  // extra git worktrees in the current repo (main checkout excluded) — a quick
  // hygiene gauge so stranded worktrees from isolated agents are visible every turn.
  const wtRaw = sh("git worktree list --porcelain 2>/dev/null");
  const worktrees = Math.max(0, (wtRaw.match(/^worktree /gm) || []).length - 1);

  const danger = cpuLight === "🔴" || ramLight === "🔴" || swapLight === "🔴" || pressure >= 2;
  return {
    load1, cores, cpuLight,
    ramUsedPct, pressure, pressureLabel, ramLight,
    swapUsedGiB, swapLight, worktrees, strandedWt: readStrandedWt(wtRaw), openPRs: readOpenPRs(), danger,
  };
}

// STRANDED worktree count for the wt gauge — TTL-cached like readOpenPRs so the per-prompt
// hook stays instant. classify() (modules/worktree.ts) is async + shells ~4 git calls PER
// worktree, too heavy for the every-turn sync load path; this is a cheap SYNC proxy of the
// SAME "stranded = non-main worktree with dirty OR unpushed work" definition, reusing the
// porcelain list load already fetched. Only a cold (past-TTL) turn pays the git calls.
const WT_CACHE_TTL_MS = 60_000;
function readStrandedWt(wtRaw: string): number {
  const commonDir = sh("git rev-parse --git-common-dir 2>/dev/null");
  if (!commonDir) return 0;
  const cachePath = `${commonDir}/sidecar-stranded-wt.json`;
  try {
    const c = JSON.parse(readFileSync(cachePath, "utf8"));
    if (Number.isFinite(c?.count) && Number.isFinite(c?.ts) && Date.now() - c.ts < WT_CACHE_TTL_MS) return c.count;
  } catch { /* no/corrupt cache → recompute */ }
  // paths from the porcelain blocks; the FIRST is the main checkout (excluded).
  const paths = (wtRaw.match(/^worktree (.+)$/gm) || []).map((l) => l.replace(/^worktree /, "")).slice(1);
  let count = 0;
  for (const p of paths) {
    const q = p.replace(/'/g, "'\\''");
    const dirty = sh(`git -C '${q}' status --porcelain 2>/dev/null`).length > 0;
    const base = sh(`git -C '${q}' rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null`) || "origin/main";
    const ahead = parseInt(sh(`git -C '${q}' rev-list --count '${base.replace(/'/g, "'\\''")}'..HEAD 2>/dev/null`) || "0", 10) || 0;
    if (dirty || ahead > 0) count++;
  }
  try { writeFileSync(cachePath, JSON.stringify({ count, ts: Date.now() })); } catch { /* best-effort */ }
  return count;
}

// Open-PR count for the current repo, TTL-cached in the git common dir so the
// per-prompt hook stays instant: `gh pr list` is a network call, so a cold
// fetch (capped at 4s) runs at most once per TTL; within the TTL every turn is
// a local file read. Stale cache beats no data on fetch failure; null (segment
// omitted) only when there is no repo, no gh, and no prior cache.
const PR_CACHE_TTL_MS = 300_000;

function readOpenPRs(): number | null {
  const commonDir = sh("git rev-parse --git-common-dir 2>/dev/null");
  if (!commonDir) return null;
  const cachePath = `${commonDir}/sidecar-pr-count.json`;
  let cached: { count: number; ts: number } | null = null;
  try {
    const c = JSON.parse(readFileSync(cachePath, "utf8"));
    if (Number.isFinite(c?.count) && Number.isFinite(c?.ts)) cached = c;
  } catch { /* no/corrupt cache → cold fetch */ }
  if (cached && Date.now() - cached.ts < PR_CACHE_TTL_MS) return cached.count;
  try {
    const out = execSync("gh pr list --state open --limit 100 --json number --jq length", {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 4000,
    }).trim();
    const count = parseInt(out, 10);
    if (!Number.isFinite(count)) return cached?.count ?? null;
    try { writeFileSync(cachePath, JSON.stringify({ count, ts: Date.now() })); } catch { /* cache write is best-effort */ }
    return count;
  } catch {
    return cached?.count ?? null; // offline/no-gh/timeout → last known, else unknown
  }
}

// Local-clock stamp appended to the readout — the agent has no real-time clock
// otherwise (the session date in context is fixed at start), so surfacing the
// actual current date+time every turn keeps time-sensitive reasoning honest.
function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}(${dow}) ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function line(s: Snapshot): string {
  const swap = s.swapUsedGiB >= 1 ? `${s.swapUsedGiB.toFixed(1)}G` : `${Math.round(s.swapUsedGiB * 1024)}M`;
  const head = s.danger ? "⚠️ " : "";
  return (
    `${head}CPU ${s.load1.toFixed(2)}/${s.cores} ${s.cpuLight} · ` +
    `RAM ${s.ramUsedPct}%(${s.pressureLabel}) ${s.ramLight} · ` +
    `swap ${swap} ${s.swapLight} · ` +
    `wt ${s.worktrees}${s.strandedWt > 0 ? `(${s.strandedWt}⚠)` : ""} ${s.strandedWt > 0 ? "🔴" : light(s.worktrees, 3, 10)} · ` +
    (s.openPRs === null ? "" : `PR ${s.openPRs} ${light(s.openPRs, 3, 10)} · `) +
    `🕐 ${nowStamp()}`
  );
}

function body(s: Snapshot): string {
  const warn = s.danger
    ? "\n# ⚠️ 자원 위험 — 사용자에게 무거운 작업(대량 빌드·병렬 agent·GPU) 자제 또는 정리를 권하고, 필요시 메모리 점유 프로세스 정리를 제안하라."
    : "";
  return (
    "# mac load (report this one line at the TOP of every user-facing reply — hard rule)\n" +
    line(s) + "\n" +
    "- CPU = load1/cores (🟢<0.7 🟡<1.0 🔴≥1.0) · RAM = active+wired+compressor used% + kernel pressure(normal/warn/critical) · swap used (🟢<2G 🟡<6G 🔴≥6G).\n" +
    "- A Mac that dies under load fails on MEMORY (compressor+swap), not CPU — when RAM/swap light is 🔴 or pressure≥warn, say so loudly.\n" +
    "- wt = extra git worktrees (main excluded · 🟢0-2 🟡3-9 🔴≥10). `wt N(M⚠)` = M개가 STRANDED(dirty/unpushed=방치작업) → 무조건 🔴; `sidecar worktree inject` 로 항목 확인 후 이어서(pr-cycle)/폐기.\n" +
    "- PR = this repo's open PRs (gh · 5min cache · 🟢0-2 🟡3-9 🔴≥10) — 쌓이면 머지/정리 (`cycle-docs-pr`) · 저장소/gh 없으면 생략.\n" +
    "- 🕐 = the machine's REAL current local date+time (the session-start date in context is fixed; trust this line for 'now')." +
    warn + "\n"
  );
}

function eventName(): string {
  try {
    const j = JSON.parse(readStdin());
    return String(j.hook_event_name ?? j.hookEventName ?? "UserPromptSubmit");
  } catch {
    return "UserPromptSubmit";
  }
}

export async function runLoad(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  const snap = readSnapshot();

  if (sub === "inject") {
    if (!snap) return 0; // non-macOS: silently no-op
    const ev = eventName();
    emitInject("load", ev, body(snap));
    return 0;
  }
  if (sub === "show") {
    if (!snap) {
      info("load: unavailable (non-macOS or sysctl missing)");
      return 0;
    }
    info(line(snap));
    return 0;
  }
  info("usage: sidecar load {show|inject}");
  return 1;
}
