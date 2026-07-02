// sidecar pool {list|add|rm|on|status|specs|harden} — host roster + remote exec.
// The host roster is machine-level, so it lives GLOBALLY at
// ~/.sidecar/pool.json (shared across repos), not per-repo.
//   list                 show roster (cached cores/mem/GPU + LIVE CPU/RAM/GPU load)
//   add <name> [target]  add host (target = ssh alias or user@host; default = name)
//   harden [name]        install the OOM memory-fence (cgroup user-slice cap + system reserve
//                        + earlyoom prefer/avoid) so a heavy job can never OOM-reboot the box;
//                        all shared hosts (or one named) · idempotent · needs passwordless sudo
//   rm <name>            remove host
//   on <name> <cmd...>   run a command on a host over ssh
//   status               reachability + LIVE CPU/RAM/GPU load (one probe per host)
//   specs [name]         ssh-probe cores/mem/GPU + cache into roster (all or one)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { execArgs, pmap } from "../lib/exec.ts";
import { info, ok, loudFail, warn } from "../lib/log.ts";

// Cached hardware profile of a host, filled by `pool specs` (ssh probe).
interface Specs {
  cores?: number; // logical CPU cores
  mem?: number; // total RAM, GiB
  gpu?: string; // GPU model(s), or absent when none detected
  at?: string; // ISO timestamp of the probe
}
interface Host {
  name: string;
  target: string;
  // restricted hosts: shared:false means NOT a shared pool compute resource.
  // `allow` lists project markers (path segments, e.g. repo dir name) that may
  // use the host; empty/absent = usable by NO project (personal system).
  shared?: boolean;
  allow?: string[];
  note?: string;
  specs?: Specs;
}
interface Roster {
  hosts: Host[];
}

// A host is restricted when explicitly marked shared:false. Such a host is a
// private/research resource — it must NOT be reachable as common pool compute.
function isRestricted(h: Host): boolean {
  return h.shared === false;
}

// The current project context = path segments of cwd (repo dir name, etc.).
// A restricted host is permitted only when one of its `allow` markers matches a
// segment (case-insensitive, exact segment — so "anima" never matches "animation").
function projectAllows(allow: string[] | undefined): boolean {
  if (!allow || !allow.length) return false;
  const segs = new Set(process.cwd().toLowerCase().split(/[\\/]+/).filter(Boolean));
  return allow.some((a) => segs.has(a.toLowerCase()));
}

// Deliberate, loud escape hatch (never casual): SIDECAR_POOL_ALLOW="akida ghost".
function envOverrides(name: string): boolean {
  const raw = process.env.SIDECAR_POOL_ALLOW;
  if (!raw) return false;
  return raw.split(/[,\s]+/).filter(Boolean).includes(name);
}

// Gate for restricted hosts. Returns ok=true for shared hosts and for restricted
// hosts that are either in an allowed project context or env-overridden.
function guard(h: Host): { ok: boolean; via: string } {
  if (!isRestricted(h)) return { ok: true, via: "shared" };
  if (envOverrides(h.name)) return { ok: true, via: "env-override" };
  if (projectAllows(h.allow)) return { ok: true, via: "in-context" };
  return { ok: false, via: "blocked" };
}

function rosterPath(): string {
  return resolve(homedir(), ".sidecar", "pool.json");
}
function load(): Roster {
  try {
    const r = JSON.parse(readFileSync(rosterPath(), "utf8"));
    return { hosts: Array.isArray(r.hosts) ? r.hosts : [] };
  } catch {
    return { hosts: [] };
  }
}
function save(r: Roster): void {
  mkdirSync(dirname(rosterPath()), { recursive: true });
  writeFileSync(rosterPath(), JSON.stringify(r, null, 2) + "\n", "utf8");
}

// ssh options as an argv array (NOT a shell string). We spawn ssh directly via
// execArgs so the local shell never gets a chance to parse the remote command.
const SSH_ARGS = ["-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10", "-o", "BatchMode=yes"];

// Remote hardware probe. POSIX-sh, Linux + macOS aware. Emits ONE parseable line
// `CORES=<n>|MEM=<GiB>|GPU=<model|none>`. Single-quoted awk/sed protect remote
// field vars ($2) from local/remote expansion; no `${...}` so it survives being
// embedded verbatim and forwarded by ssh to the remote login shell.
const PROBE =
  `C=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null); ` +
  `if [ -r /proc/meminfo ]; then M=$(awk '/MemTotal/{printf "%.0f", $2/1048576}' /proc/meminfo); ` +
  `else M=$(( $(sysctl -n hw.memsize 2>/dev/null || echo 0) / 1073741824 )); fi; ` +
  `if command -v nvidia-smi >/dev/null 2>&1; then ` +
  `G=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | paste -sd ';' -); ` +
  `else G=$(system_profiler SPDisplaysDataType 2>/dev/null | sed -n 's/.*Chipset Model: //p' | head -1); fi; ` +
  `echo "CORES=$C|MEM=$M|GPU=$G"`;

// Live load snapshot of a host (NOT cached — load changes second-to-second).
interface Load {
  load1?: number; // 1-min loadavg
  cores?: number; // logical cores (to turn loadavg into a %)
  ram?: { usedMiB: number; totalMiB: number }; // live system RAM occupancy
  gpu?: { util: number; memUsed: number; memTotal: number; n: number }; // MiB, n = #GPUs
}

// Remote LIVE-load probe. POSIX-sh, Linux + macOS aware. Emits ONE parseable line
// `LOAD=<loadavg1>|CORES=<n>|RAM=<usedMiB,totalMiB|none>|GPU=<util,memUsedMiB,memTotalMiB,count|none>`.
// RAM occupancy = total − available (Linux /proc/meminfo MemAvailable · macOS vm_stat free+inactive).
// GPU fields are averaged util + summed memory across all visible GPUs (nvidia-smi).
const LOAD_PROBE =
  `L=$(awk '{print $1}' /proc/loadavg 2>/dev/null); ` +
  `[ -z "$L" ] && L=$(sysctl -n vm.loadavg 2>/dev/null | awk '{print $2}'); ` +
  `C=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null); ` +
  `if [ -r /proc/meminfo ]; then ` +
  `R=$(awk '/^MemTotal:/{t=$2} /^MemAvailable:/{a=$2} END{if(t>0)printf "%d,%d",(t-a)/1024,t/1024; else printf "none"}' /proc/meminfo); ` +
  `elif command -v vm_stat >/dev/null 2>&1; then ` +
  `PS=$(sysctl -n hw.pagesize 2>/dev/null || echo 4096); TT=$(sysctl -n hw.memsize 2>/dev/null); ` +
  `FI=$(vm_stat 2>/dev/null | awk '/Pages free/{gsub(/[.]/,"",$3);f=$3} /Pages inactive/{gsub(/[.]/,"",$3);i=$3} END{print f+i}'); ` +
  `R=$(awk -v t="$TT" -v fi="$FI" -v ps="$PS" 'BEGIN{if(t>0){tot=t/1048576;av=fi*ps/1048576;u=tot-av;if(u<0)u=0;printf "%d,%d",u,tot}else printf "none"}'); ` +
  `else R=none; fi; ` +
  `if command -v nvidia-smi >/dev/null 2>&1; then ` +
  `G=$(nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>/dev/null ` +
  `| awk -F', *' '{u+=$1;mu+=$2;mt+=$3;n++} END{if(n>0)printf "%d,%d,%d,%d",u/n,mu,mt,n; else printf "none"}'); ` +
  `else G=none; fi; ` +
  `echo "LOAD=$L|CORES=$C|RAM=$R|GPU=$G"`;

// ssh-probe one host's live load. Returns null when unreachable or unparsable.
async function probeLoad(h: Host): Promise<Load | null> {
  const res = await execArgs("ssh", [...SSH_ARGS, h.target, LOAD_PROBE], { timeoutMs: 15_000 });
  if (res.code !== 0) return null;
  const line = res.stdout.split(/\r?\n/).find((l) => l.includes("LOAD="));
  if (!line) return null;
  const kv: Record<string, string> = {};
  for (const part of line.trim().split("|")) {
    const i = part.indexOf("=");
    if (i > 0) kv[part.slice(0, i)] = part.slice(i + 1).trim();
  }
  const load1 = parseFloat(kv.LOAD ?? "");
  const cores = parseInt(kv.CORES ?? "", 10);
  let ram: Load["ram"];
  if (kv.RAM && kv.RAM !== "none") {
    const [u, t] = kv.RAM.split(",").map((x) => parseInt(x, 10));
    if (Number.isFinite(u) && Number.isFinite(t) && t > 0) ram = { usedMiB: u, totalMiB: t };
  }
  let gpu: Load["gpu"];
  if (kv.GPU && kv.GPU !== "none") {
    const [u, mu, mt, n] = kv.GPU.split(",").map((x) => parseInt(x, 10));
    if (Number.isFinite(u) && Number.isFinite(mt) && mt > 0) {
      gpu = { util: u, memUsed: mu, memTotal: mt, n: Number.isFinite(n) ? n : 1 };
    }
  }
  return {
    load1: Number.isFinite(load1) ? load1 : undefined,
    cores: Number.isFinite(cores) && cores > 0 ? cores : undefined,
    ram,
    gpu,
  };
}

// Compact one-line live-load badge: `CPU 45% · RAM 18%·5.4/30G · GPU 30%·2.1/24GiB`.
function fmtLoad(l?: Load | null): string {
  if (!l) return "";
  const parts: string[] = [];
  if (l.load1 != null) {
    const pct = l.cores ? ` ${Math.round((l.load1 / l.cores) * 100)}%` : "";
    parts.push(`CPU${pct}(${l.load1.toFixed(2)})`);
  }
  if (l.ram) {
    const pct = Math.round((l.ram.usedMiB / l.ram.totalMiB) * 100);
    const used = (l.ram.usedMiB / 1024).toFixed(1);
    const total = (l.ram.totalMiB / 1024).toFixed(0);
    parts.push(`RAM ${pct}%·${used}/${total}G`);
  }
  if (l.gpu) {
    const used = (l.gpu.memUsed / 1024).toFixed(1);
    const total = (l.gpu.memTotal / 1024).toFixed(0);
    parts.push(`GPU ${l.gpu.util}%·${used}/${total}GiB${l.gpu.n > 1 ? `×${l.gpu.n}` : ""}`);
  }
  return parts.join(" · ");
}

// ssh-probe one host's hardware. Returns null when unreachable or unparsable.
async function probeSpecs(h: Host): Promise<Specs | null> {
  const res = await execArgs("ssh", [...SSH_ARGS, h.target, PROBE], { timeoutMs: 20_000 });
  if (res.code !== 0) return null;
  const line = res.stdout.split(/\r?\n/).find((l) => l.includes("CORES="));
  if (!line) return null;
  const kv: Record<string, string> = {};
  for (const part of line.trim().split("|")) {
    const i = part.indexOf("=");
    if (i > 0) kv[part.slice(0, i)] = part.slice(i + 1).trim();
  }
  const cores = parseInt(kv.CORES ?? "", 10);
  const mem = parseInt(kv.MEM ?? "", 10);
  const gpu = kv.GPU ?? "";
  return {
    cores: Number.isFinite(cores) ? cores : undefined,
    mem: Number.isFinite(mem) && mem > 0 ? mem : undefined,
    gpu: gpu && gpu.toLowerCase() !== "none" ? gpu : undefined,
    at: new Date().toISOString(),
  };
}

// Compact one-line spec badge: `8c · 32G · GPU:RTX 4090`.
function fmtSpecs(s?: Specs): string {
  if (!s) return "";
  const parts: string[] = [];
  if (s.cores) parts.push(`${s.cores}c`);
  if (s.mem) parts.push(`${s.mem}G`);
  parts.push(s.gpu ? `GPU:${s.gpu}` : "GPU:없음");
  return parts.join(" · ");
}

// Remote OOM memory-fence installer (POSIX-sh, Linux systemd cgroup-v2). Percentage-of-RAM
// so it adapts to any host: caps the user slice at 75% (kernel cgroup-OOM kills the biggest
// task INSIDE the slice = the compute hog — not the desktop/system → no reboot loop), soft
// MemoryHigh at 65% (reclaim before the wall), swap at 20% (no full-swap thrash spiral),
// reserves system.slice a 1G floor (sshd/systemd survive → box stays reachable), and points
// earlyoom at compute hogs while avoiding session/system procs. Idempotent; needs passwordless
// sudo. Emits ONE parseable line `HARDEN_OK|total=..|cap=..|high=..|swap=..|live=..|earlyoom=..`.
// NOTE: authored as plain concatenated JS strings (NOT a template literal) so `${VAR}` stays
// literal for the REMOTE shell; ssh forwards it verbatim as a single argv (no local expansion).
const HARDEN =
  "set -e; " +
  "TM=$(awk '/^MemTotal:/{printf \"%d\",$2/1024}' /proc/meminfo); " +
  "[ -n \"$TM\" ] || { echo HARDEN_ERR=no_meminfo; exit 1; }; " +
  "CAP=$((TM*75/100)); HIGH=$((TM*65/100)); SWAP=$((TM*20/100)); " +
  "sudo mkdir -p /etc/systemd/system/user-.slice.d /etc/systemd/system/system.slice.d; " +
  "printf '[Slice]\\nMemoryHigh=%dM\\nMemoryMax=%dM\\nMemorySwapMax=%dM\\n' \"$HIGH\" \"$CAP\" \"$SWAP\" " +
  "| sudo tee /etc/systemd/system/user-.slice.d/50-memfence.conf >/dev/null; " +
  "printf '[Slice]\\nMemoryMin=1G\\n' | sudo tee /etc/systemd/system/system.slice.d/50-memfence.conf >/dev/null; " +
  "sudo systemctl daemon-reload; " +
  "EO=absent; " +
  "if command -v earlyoom >/dev/null 2>&1; then " +
  "sudo tee /etc/default/earlyoom >/dev/null <<'MFEOF'\n" +
  "EARLYOOM_ARGS=\"-r 3600 --prefer '^(hexa|hexad|hexat|python3|python|node|cargo|rustc|cc1plus)$' --avoid '^(sshd|systemd|systemd-.+|bash|zsh|sh|login|init|wireplumber|pipewire|pipewire-pulse|gnome-shell|Xorg|dbus-daemon|dbus-broker)$'\"\n" +
  "MFEOF\n" +
  "sudo systemctl reset-failed earlyoom 2>/dev/null || true; sudo systemctl restart earlyoom 2>/dev/null || true; " +
  "EO=$(systemctl is-active earlyoom 2>/dev/null); fi; " +
  "LIVE=$(cat /sys/fs/cgroup/user.slice/user-*.slice/memory.max 2>/dev/null | head -1 || echo NA); " +
  "echo \"HARDEN_OK|total=${TM}M|cap=${CAP}M|high=${HIGH}M|swap=${SWAP}M|live=${LIVE}|earlyoom=${EO}\"";

export async function runPool(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";
  const r = load();

  if (sub === "list") {
    if (!r.hosts.length) {
      info("pool: no hosts. add one: sidecar pool add <name> [user@host]");
      return 0;
    }
    info(`pool hosts (${rosterPath()}):`);
    // Live-load probe: NOT cached (load is second-to-second), so `list` SSH-probes
    // each non-blocked host in parallel. Blocked restricted hosts are not reached.
    info("  (라이브 부하 프로브 중…)");
    const loads = new Map<string, Load | null>();
    const probed = await pmap(
      r.hosts.filter((h) => guard(h).ok),
      8,
      async (h) => ({ name: h.name, load: await probeLoad(h) }),
    );
    for (const { name, load } of probed) loads.set(name, load);
    let anyProbed = false;
    for (const h of r.hosts) {
      if (h.specs) anyProbed = true;
      const spec = h.specs ? `   〈${fmtSpecs(h.specs)}〉` : "";
      const g = guard(h);
      // Load badge: only for hosts we actually reached (guard-ok + probe success).
      const load = g.ok ? (loads.has(h.name) ? (loads.get(h.name) ? `   ⚡${fmtLoad(loads.get(h.name))}` : "   ⚡도달 불가") : "") : "";
      if (!isRestricted(h)) {
        info(`  • ${h.name}  →  ${h.target}${spec}${load}`);
        continue;
      }
      const tag = g.ok ? `🔓 허용(${g.via})` : "🔒 차단";
      const who = h.allow && h.allow.length ? ` · 허용: ${h.allow.join(", ")}` : " · 공용 아님";
      info(`  • ${h.name}  →  ${h.target}${spec}${load}   [${tag}${who}]${h.note ? `  — ${h.note}` : ""}`);
    }
    if (!anyProbed) info("  (스펙 미수집 — `sidecar pool specs` 로 코어/메모리/GPU 프로브)");
    return 0;
  }
  if (sub === "add") {
    const name = args[1];
    if (!name) {
      info("usage: sidecar pool add <name> [ssh-target]");
      return 1;
    }
    const target = args[2] ?? name;
    r.hosts = r.hosts.filter((h) => h.name !== name);
    r.hosts.push({ name, target });
    save(r);
    ok(`pool: added ${name} → ${target}`);
    return 0;
  }
  if (sub === "rm") {
    const name = args[1];
    const before = r.hosts.length;
    r.hosts = r.hosts.filter((h) => h.name !== name);
    save(r);
    info(before === r.hosts.length ? `pool: '${name}' not found` : `pool: removed ${name}`);
    return 0;
  }
  if (sub === "on") {
    const name = args[1];
    const cmd = args.slice(2).join(" ");
    const h = r.hosts.find((x) => x.name === name);
    if (!h || !cmd) {
      info("usage: sidecar pool on <name> <cmd...>");
      return 1;
    }
    const g = guard(h);
    if (!g.ok) {
      const allowed = h.allow && h.allow.length ? h.allow.join(", ") : "(none)";
      loudFail(
        `pool on ${name}: 차단됨 — '${name}' 은 공용 pool 컴퓨트가 아닙니다` +
          (h.note ? ` (${h.note})` : "") +
          `\n  허용 프로젝트: ${allowed}  ·  현재 위치: ${process.cwd()}` +
          `\n  의도된 사용이면 해당 프로젝트(예: anima repo) 안에서 실행하거나, 일회성은 SIDECAR_POOL_ALLOW=${name} 로 명시 override.`,
      );
      return 1;
    }
    // Pass `cmd` as a SINGLE argv element to ssh via execArgs (direct spawn, no
    // local shell). This prevents the LOCAL mac shell from expanding $VAR/$(...)/
    // backticks inside the remote command — ssh forwards `cmd` verbatim to the
    // REMOTE login shell, which expands it (and pipes/redirects) correctly there.
    const res = await execArgs("ssh", [...SSH_ARGS, h.target, cmd], { timeoutMs: 120_000 });
    process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
    if (res.code !== 0) loudFail(`pool on ${name}: exit ${res.code}`);
    return res.code;
  }
  if (sub === "status") {
    if (!r.hosts.length) {
      info("pool: no hosts.");
      return 0;
    }
    const out = await pmap(r.hosts, 8, async (h) => {
      // Restricted + blocked hosts are not pinged — they are not shared compute,
      // so we don't reach out to them outside their allowed project context.
      const g = guard(h);
      if (!g.ok) return { h, blocked: true, up: false, unlocked: false, via: g.via, load: null as Load | null };
      // ONE live probe doubles as the reachability check AND the load badge, so
      // `status` surfaces live CPU/RAM/GPU occupancy too (probe success ⇒ reachable).
      // Keeps `status` a single-command "everything" view — no more typing `status`
      // and missing GPU usage that only `list` used to show.
      const load = await probeLoad(h);
      // A restricted host that passes the guard is UNLOCKED, not shared — surface
      // a 🔓 marker so `status` never conflates it with a genuinely shared host
      // (parity with `list`, which already shows `🔓 허용(via)`).
      return { h, blocked: false, up: load !== null, unlocked: isRestricted(h), via: g.via, load };
    });
    for (const { h, blocked, up, unlocked, via, load } of out) {
      const dot = blocked ? "🔒" : unlocked ? "🔓" : up ? "🟢" : "🔴";
      const spec = h.specs ? `  〈${fmtSpecs(h.specs)}〉` : "";
      const badge = up && load ? `   ⚡${fmtLoad(load)}` : "";
      const note = blocked
        ? "  — 차단(공용 아님)"
        : unlocked
          ? `  — 제한 호스트 · 현재 해제(${via})${up ? "" : " · 도달 불가"}`
          : "";
      info(`  ${dot} ${h.name}  (${h.target})${spec}${badge}${note}`);
    }
    return 0;
  }
  if (sub === "specs") {
    if (!r.hosts.length) {
      info("pool: no hosts.");
      return 0;
    }
    const only = args[1];
    const targets = only ? r.hosts.filter((h) => h.name === only) : r.hosts;
    if (only && !targets.length) {
      info(`pool: '${only}' not found`);
      return 1;
    }
    info(`pool specs — probing ${targets.length} host(s)…`);
    const out = await pmap(targets, 6, async (h) => {
      // Blocked restricted hosts are not probed — they are not shared compute.
      if (!guard(h).ok) return { h, blocked: true, specs: null as Specs | null };
      return { h, blocked: false, specs: await probeSpecs(h) };
    });
    // Cache successful probes back into the roster (persisted for `list`/`status`).
    for (const { h, specs } of out) {
      if (!specs) continue;
      const idx = r.hosts.findIndex((x) => x.name === h.name);
      if (idx >= 0) r.hosts[idx].specs = specs;
    }
    save(r);
    for (const { h, blocked, specs } of out) {
      if (blocked) {
        info(`  🔒 ${h.name}  — 차단(공용 아님 · 프로브 안 함)`);
        continue;
      }
      if (!specs) {
        warn(`  🔴 ${h.name}  — 프로브 실패(도달 불가 또는 권한 없음)`);
        continue;
      }
      info(`  🟢 ${h.name}  ${fmtSpecs(specs)}`);
    }
    return 0;
  }
  if (sub === "harden") {
    if (!r.hosts.length) {
      info("pool: no hosts.");
      return 0;
    }
    const only = args[1];
    // Named host → just that one (even if restricted, provided its guard passes).
    // No name → every SHARED host (restricted hosts are never mass-hardened — they are
    // not shared compute; harden one explicitly by name if you own it in-context).
    const targets = only ? r.hosts.filter((h) => h.name === only) : r.hosts.filter((h) => !isRestricted(h));
    if (only && !targets.length) {
      info(`pool: '${only}' not found`);
      return 1;
    }
    info(`pool harden — OOM 메모리 방화벽(cgroup user-slice 캡 + system 예약 + earlyoom) 적용 → ${targets.length} host…`);
    const out = await pmap(targets, 6, async (h) => {
      // A restricted host is only hardened when its guard passes in this context.
      if (!guard(h).ok) return { h, blocked: true, line: "", code: 0, err: "" };
      const res = await execArgs("ssh", [...SSH_ARGS, h.target, HARDEN], { timeoutMs: 90_000 });
      const line = res.stdout.split(/\r?\n/).find((l) => l.includes("HARDEN_OK")) ?? "";
      return { h, blocked: false, line, code: res.code, err: res.stderr };
    });
    let rc = 0;
    for (const o of out) {
      if (o.blocked) {
        info(`  🔒 ${o.h.name} — 차단(공용 아님 · 건너뜀 · 이름 지정하면 개별 적용)`);
        continue;
      }
      if (!o.line) {
        warn(`  🔴 ${o.h.name} — 적용 실패(도달 불가 또는 무암호 sudo 없음)${o.err ? `: ${o.err.trim().split(/\r?\n/).pop()}` : ""}`);
        rc = 1;
        continue;
      }
      const kv: Record<string, string> = {};
      for (const p of o.line.split("|")) {
        const i = p.indexOf("=");
        if (i > 0) kv[p.slice(0, i)] = p.slice(i + 1);
      }
      const eo = kv.earlyoom === "active" ? "earlyoom🟢" : kv.earlyoom === "absent" ? "earlyoom없음(cgroup캡만)" : `earlyoom:${kv.earlyoom}`;
      ok(`  🟢 ${o.h.name}  user-slice≤${kv.cap} (of ${kv.total}) · swap≤${kv.swap} · ${eo}`);
    }
    if (rc === 0) info("  ✅ 완료 — 이제 무거운 job이 한도 초과해도 그 job만 OOM-kill, 박스는 생존(재부팅 루프 종결). 롤백: rm /etc/systemd/system/{user-.slice.d,system.slice.d}/50-memfence.conf");
    return rc;
  }
  info("usage: sidecar pool {list|add <name> [target]|rm <name>|on <name> <cmd>|status|specs [name]|harden [name]}");
  return 1;
}
