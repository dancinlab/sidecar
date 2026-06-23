// mem-guard — OOM (out-of-memory) prevention for memory-constrained Macs. Two layers:
//
//   (1) PreToolUse preflight (always-on, config memGuard.enabled): before a
//       background-SPAWN bash command (`… &` / nohup / disown / setsid) launches
//       yet another DETACHED process, read system available RAM. Below warnPct →
//       WARN; below blockPct (default 0 = never) → BLOCK. The in-session fan-out
//       (cycle-all / all-bg-go / fleet) spike that piles up N detached `claude`
//       agents and trips macOS jetsam is the documented root cause on a 16GB Mac.
//
//   (2) launchd watchdog (OPT-IN via `sidecar mem-guard install`): a LaunchAgent
//       runs `sidecar mem-guard tick` every intervalSec; when available RAM drops
//       below warnPct it posts a macOS notification. NOTIFY-ONLY — it never kills a
//       process or changes a system setting. This is the only layer that sees
//       ACROSS separate Claude sessions (each session's PreToolUse guard is blind
//       to the other sessions' processes — the actual accumulation that OOMs).
//
// Verbs: status (default · snapshot) · check (exit 1 if low · scriptable) ·
//        tick (watchdog body) · install / uninstall (launchd LaunchAgent).
//
// @convergence state=in_flight id=MAC_OOM_FANOUT_JETSAM value="a 16GB Mac OOM-dies (jetsam kills apps + kernel panic) because parallel fan-out (cycle-all/all-bg-go) accumulates 6+ detached `claude` processes (~400-490MB each) across sessions until macOS jetsams — mem-guard adds a free-RAM preflight before background-spawn + an opt-in launchd notify watchdog" threshold="JetsamEvent reports 6/13-6/18 + panic 6/17 showed six `2.1.179` (claude) procs as top memory holders at OOM time; preflight warns/blocks spawn when available RAM < warnPct"

import { execFileSync, execSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { LOG_DIR } from "../lib/paths.ts";
import { config } from "../lib/config.ts";
import { info, ok, warn } from "../lib/log.ts";

export interface MemInfo {
  totalMB: number;
  availableMB: number;       // reclaimable: free + inactive + speculative + purgeable
  availablePct: number;      // availableMB / totalMB * 100
  usedMB: number;
  swapUsedMB: number;
  pressure: "normal" | "warn" | "critical";
}

// Read macOS memory state from vm_stat + sysctl. Available memory ≈ the pages the
// kernel can reclaim without paging out: free + inactive + speculative + purgeable.
// Cheap (~5ms) — safe to call per background-spawn bash command.
export function memInfo(): MemInfo | null {
  try {
    const totalBytes = Number(execFileSync("sysctl", ["-n", "hw.memsize"]).toString().trim());
    const vm = execFileSync("vm_stat").toString();
    const pageSize = Number(/page size of (\d+)/.exec(vm)?.[1] ?? 16384);
    const pg = (label: string): number => {
      const m = new RegExp(`${label}:\\s+(\\d+)`).exec(vm);
      return m ? Number(m[1]) : 0;
    };
    const free = pg("Pages free");
    const inactive = pg("Pages inactive");
    const speculative = pg("Pages speculative");
    const purgeable = pg("Pages purgeable");
    const availBytes = (free + inactive + speculative + purgeable) * pageSize;
    const totalMB = totalBytes / 1024 / 1024;
    const availableMB = availBytes / 1024 / 1024;
    const availablePct = (availableMB / totalMB) * 100;

    let swapUsedMB = 0;
    try {
      const sw = execFileSync("sysctl", ["-n", "vm.swapusage"]).toString();
      const m = /used = ([\d.]+)M/.exec(sw);
      if (m) swapUsedMB = Number(m[1]);
    } catch { /* swap info optional */ }

    const cfg = config().memGuard;
    const pressure: MemInfo["pressure"] =
      availablePct < cfg.blockPct ? "critical" : availablePct < cfg.warnPct ? "warn" : "normal";

    return {
      totalMB,
      availableMB,
      availablePct,
      usedMB: totalMB - availableMB,
      swapUsedMB,
      pressure,
    };
  } catch {
    return null; // non-macOS or sysctl/vm_stat unavailable → guard is a silent no-op
  }
}

// Detect a command that DETACHES a new process (the thing that accumulates and
// OOMs). Trailing `&` (not `&&`/`||`), nohup, disown, setsid. A backgrounded build
// or a single bg job is fine in isolation — the guard only bites under low RAM.
const SPAWN_RE = /(^|[^&])&\s*$|(^|[\s;|&(])(nohup|disown|setsid)\b/;

export function detectBackgroundSpawn(cmd: string): boolean {
  if (!cmd) return false;
  // strip trailing whitespace/newlines so a final `&` is seen
  const c = cmd.replace(/\s+$/, "");
  return SPAWN_RE.test(c) || /&\s*$/.test(c.split("\n").pop() ?? "");
}

// Preflight used by pre.ts. Returns null when the command is not a spawn, RAM is
// healthy, or memInfo is unavailable. Otherwise an advisory (warn) or a hard stop
// (block) keyed off the configured thresholds.
export function memPreflight(cmd: string): { action: "warn" | "block"; reason: string } | null {
  if (!config().memGuard.enabled) return null;
  if (!detectBackgroundSpawn(cmd)) return null;
  const m = memInfo();
  if (!m || m.pressure === "normal") return null;
  const head = `system RAM is low — available ${m.availablePct.toFixed(0)}% (${m.availableMB.toFixed(0)}MB of ${(m.totalMB / 1024).toFixed(0)}GB)${m.swapUsedMB > 0 ? `, swap ${m.swapUsedMB.toFixed(0)}MB in use` : ""}`;
  const tail = `launching another detached process (\`&\`/nohup) now risks an OOM jetsam kill (macOS force-quits apps when memory runs out). Throttle the fan-out: run fewer parallel agents, await the in-flight ones, or close idle Claude/browser windows first. (\`sidecar mem-guard status\` for the snapshot.)`;
  return { action: m.pressure === "critical" ? "block" : "warn", reason: `${head} — ${tail}` };
}

// ── CLI ────────────────────────────────────────────────────────────────────────

const PLIST_LABEL = "com.sidecar.mem-guard";
const PLIST_PATH = resolve(homedir(), "Library", "LaunchAgents", `${PLIST_LABEL}.plist`);
const NOTIFY_MARKER = resolve(LOG_DIR, ".mem-guard-last-notify");

function bar(pct: number, width = 20): string {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function topConsumers(n: number): string[] {
  try {
    const out = execSync(`ps -axo rss,comm -m | head -${n + 1}`).toString().trim().split("\n").slice(1);
    return out.map((l) => {
      const m = /^\s*(\d+)\s+(.*)$/.exec(l);
      if (!m) return l.trim();
      const mb = (Number(m[1]) / 1024).toFixed(0);
      const name = m[2].replace(/^.*\//, "");
      return `${mb.padStart(6)}MB  ${name}`;
    });
  } catch {
    return [];
  }
}

function printStatus(): number {
  const m = memInfo();
  if (!m) {
    info("mem-guard: memory stats unavailable (non-macOS or restricted).");
    return 0;
  }
  const cfg = config().memGuard;
  const icon = m.pressure === "critical" ? "🔴" : m.pressure === "warn" ? "🟡" : "🟢";
  const lines = [
    `${icon} mem-guard — ${m.pressure.toUpperCase()}`,
    ``,
    `  available  ${bar(m.availablePct)} ${m.availablePct.toFixed(0)}%  (${m.availableMB.toFixed(0)}MB / ${(m.totalMB / 1024).toFixed(0)}GB)`,
    `  swap used  ${m.swapUsedMB.toFixed(0)}MB`,
    `  thresholds warn<${cfg.warnPct}%  block-spawn<${cfg.blockPct}%`,
    ``,
    `  top memory holders:`,
    ...topConsumers(8).map((l) => `    ${l}`),
  ];
  process.stdout.write(lines.join("\n") + "\n");
  return 0;
}

// Watchdog body — invoked by the LaunchAgent every intervalSec. Posts a macOS
// notification when RAM is low, throttled to once per 5 min so it can't spam. Never
// kills anything. Always exits 0 (a failing LaunchAgent would relaunch-loop).
function tick(): number {
  const m = memInfo();
  if (!m || m.pressure === "normal") return 0;
  try {
    const now = Date.now();
    if (existsSync(NOTIFY_MARKER)) {
      const last = Number(readFileSync(NOTIFY_MARKER, "utf8").trim());
      if (Number.isFinite(last) && now - last < 5 * 60 * 1000) return 0; // throttle
    }
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(NOTIFY_MARKER, String(now));
    const title = m.pressure === "critical" ? "메모리 위험 — OOM 임박" : "메모리 부족 경고";
    const body = `사용 가능 RAM ${m.availablePct.toFixed(0)}% (${m.availableMB.toFixed(0)}MB). 병렬 작업/창을 줄이세요.`;
    execFileSync("osascript", ["-e", `display notification "${body}" with title "${title}" sound name "Funk"`]);
  } catch { /* notification best-effort */ }
  return 0;
}

function plistBody(sidecarBin: string): string {
  const interval = config().memGuard.watchdogIntervalSec;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${sidecarBin}</string>
    <string>mem-guard</string>
    <string>tick</string>
  </array>
  <key>StartInterval</key><integer>${interval}</integer>
  <key>RunAtLoad</key><true/>
  <key>ProcessType</key><string>Background</string>
</dict>
</plist>
`;
}

function install(): number {
  let sidecarBin = "";
  try {
    sidecarBin = execSync("command -v sidecar").toString().trim();
  } catch { /* fall through */ }
  if (!sidecarBin) sidecarBin = resolve(homedir(), ".local", "bin", "sidecar");
  if (!existsSync(sidecarBin)) {
    warn(`mem-guard install: \`sidecar\` binary not found at ${sidecarBin}. Run \`sidecar install\` first.`);
    return 1;
  }
  mkdirSync(resolve(homedir(), "Library", "LaunchAgents"), { recursive: true });
  writeFileSync(PLIST_PATH, plistBody(sidecarBin));
  try {
    execSync(`launchctl unload "${PLIST_PATH}" 2>/dev/null; launchctl load "${PLIST_PATH}"`);
  } catch (e) {
    warn(`mem-guard: plist written but launchctl load failed — ${(e as Error).message}`);
    return 1;
  }
  const cfg = config().memGuard;
  ok(`mem-guard watchdog installed — checks memory every ${cfg.watchdogIntervalSec}s, notifies when available RAM < ${cfg.warnPct}% (notify-only, never kills). plist: ${PLIST_PATH}`);
  return 0;
}

function uninstall(): number {
  if (!existsSync(PLIST_PATH)) {
    info("mem-guard watchdog not installed.");
    return 0;
  }
  try {
    execSync(`launchctl unload "${PLIST_PATH}" 2>/dev/null || true`);
  } catch { /* best-effort */ }
  try {
    unlinkSync(PLIST_PATH);
  } catch { /* already gone */ }
  ok("mem-guard watchdog uninstalled.");
  return 0;
}

export async function runMemGuard(args: string[]): Promise<number> {
  const verb = (args[0] ?? "status").toLowerCase();
  switch (verb) {
    case "status":
    case "":
      return printStatus();
    case "check": {
      const m = memInfo();
      if (!m) return 0;
      if (m.pressure !== "normal") {
        info(`mem-guard: ${m.pressure} — available ${m.availablePct.toFixed(0)}%`);
        return 1;
      }
      return 0;
    }
    case "tick":
      return tick();
    case "install":
      return install();
    case "uninstall":
      return uninstall();
    default:
      info("usage: sidecar mem-guard {status|check|tick|install|uninstall}");
      return 1;
  }
}
