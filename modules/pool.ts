// harness pool {list|add|rm|on|status|specs} — host roster + remote exec (sidecar
// pool parity). The host roster is machine-level, so it lives GLOBALLY at
// ~/.harness/pool.json (shared across repos), not per-repo.
//   list                 show roster (with cached cores/mem/GPU if probed)
//   add <name> [target]  add host (target = ssh alias or user@host; default = name)
//   rm <name>            remove host
//   on <name> <cmd...>   run a command on a host over ssh
//   status               reachability check across all hosts
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

// Deliberate, loud escape hatch (never casual): HARNESS_POOL_ALLOW="akida ghost".
function envOverrides(name: string): boolean {
  const raw = process.env.HARNESS_POOL_ALLOW;
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
  return resolve(homedir(), ".harness", "pool.json");
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

export async function runPool(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";
  const r = load();

  if (sub === "list") {
    if (!r.hosts.length) {
      info("pool: no hosts. add one: harness pool add <name> [user@host]");
      return 0;
    }
    info(`pool hosts (${rosterPath()}):`);
    let anyProbed = false;
    for (const h of r.hosts) {
      if (h.specs) anyProbed = true;
      const spec = h.specs ? `   〈${fmtSpecs(h.specs)}〉` : "";
      if (!isRestricted(h)) {
        info(`  • ${h.name}  →  ${h.target}${spec}`);
        continue;
      }
      const g = guard(h);
      const tag = g.ok ? `🔓 허용(${g.via})` : "🔒 차단";
      const who = h.allow && h.allow.length ? ` · 허용: ${h.allow.join(", ")}` : " · 공용 아님";
      info(`  • ${h.name}  →  ${h.target}${spec}   [${tag}${who}]${h.note ? `  — ${h.note}` : ""}`);
    }
    if (!anyProbed) info("  (스펙 미수집 — `harness pool specs` 로 코어/메모리/GPU 프로브)");
    return 0;
  }
  if (sub === "add") {
    const name = args[1];
    if (!name) {
      info("usage: harness pool add <name> [ssh-target]");
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
      info("usage: harness pool on <name> <cmd...>");
      return 1;
    }
    const g = guard(h);
    if (!g.ok) {
      const allowed = h.allow && h.allow.length ? h.allow.join(", ") : "(none)";
      loudFail(
        `pool on ${name}: 차단됨 — '${name}' 은 공용 pool 컴퓨트가 아닙니다` +
          (h.note ? ` (${h.note})` : "") +
          `\n  허용 프로젝트: ${allowed}  ·  현재 위치: ${process.cwd()}` +
          `\n  의도된 사용이면 해당 프로젝트(예: anima repo) 안에서 실행하거나, 일회성은 HARNESS_POOL_ALLOW=${name} 로 명시 override.`,
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
      if (!g.ok) return { h, blocked: true, up: false, unlocked: false, via: g.via };
      const res = await execArgs("ssh", [...SSH_ARGS, h.target, "echo ok"], { timeoutMs: 15_000 });
      // A restricted host that passes the guard is UNLOCKED, not shared — surface
      // a 🔓 marker so `status` never conflates it with a genuinely shared host
      // (parity with `list`, which already shows `🔓 허용(via)`).
      return { h, blocked: false, up: res.code === 0 && res.stdout.includes("ok"), unlocked: isRestricted(h), via: g.via };
    });
    for (const { h, blocked, up, unlocked, via } of out) {
      const dot = blocked ? "🔒" : unlocked ? "🔓" : up ? "🟢" : "🔴";
      const spec = h.specs ? `  〈${fmtSpecs(h.specs)}〉` : "";
      const note = blocked
        ? "  — 차단(공용 아님)"
        : unlocked
          ? `  — 제한 호스트 · 현재 해제(${via})${up ? "" : " · 도달 불가"}`
          : "";
      info(`  ${dot} ${h.name}  (${h.target})${spec}${note}`);
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
  info("usage: harness pool {list|add <name> [target]|rm <name>|on <name> <cmd>|status|specs [name]}");
  return 1;
}
