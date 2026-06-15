// harness pool {list|add|rm|on|status} — host roster + remote exec (sidecar pool
// parity). The host roster is machine-level, so it lives GLOBALLY at
// ~/.harness/pool.json (shared across repos), not per-repo.
//   list                 show roster
//   add <name> [target]  add host (target = ssh alias or user@host; default = name)
//   rm <name>            remove host
//   on <name> <cmd...>   run a command on a host over ssh
//   status               reachability check across all hosts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { execShell, pmap } from "../lib/exec.ts";
import { info, ok, loudFail, warn } from "../lib/log.ts";

interface Host {
  name: string;
  target: string;
  // restricted hosts: shared:false means NOT a shared pool compute resource.
  // `allow` lists project markers (path segments, e.g. repo dir name) that may
  // use the host; empty/absent = usable by NO project (personal system).
  shared?: boolean;
  allow?: string[];
  note?: string;
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

const SSH = `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=yes`;

export async function runPool(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";
  const r = load();

  if (sub === "list") {
    if (!r.hosts.length) {
      info("pool: no hosts. add one: harness pool add <name> [user@host]");
      return 0;
    }
    info(`pool hosts (${rosterPath()}):`);
    for (const h of r.hosts) {
      if (!isRestricted(h)) {
        info(`  • ${h.name}  →  ${h.target}`);
        continue;
      }
      const g = guard(h);
      const tag = g.ok ? `🔓 허용(${g.via})` : "🔒 차단";
      const who = h.allow && h.allow.length ? ` · 허용: ${h.allow.join(", ")}` : " · 공용 아님";
      info(`  • ${h.name}  →  ${h.target}   [${tag}${who}]${h.note ? `  — ${h.note}` : ""}`);
    }
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
    const res = await execShell(`${SSH} ${JSON.stringify(h.target)} ${JSON.stringify(cmd)}`, { timeoutMs: 120_000 });
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
      if (!guard(h).ok) return { h, blocked: true, up: false };
      const res = await execShell(`${SSH} ${JSON.stringify(h.target)} 'echo ok'`, { timeoutMs: 15_000 });
      return { h, blocked: false, up: res.code === 0 && res.stdout.includes("ok") };
    });
    for (const { h, blocked, up } of out) {
      const dot = blocked ? "🔒" : up ? "🟢" : "🔴";
      info(`  ${dot} ${h.name}  (${h.target})${blocked ? "  — 차단(공용 아님)" : ""}`);
    }
    return 0;
  }
  info("usage: harness pool {list|add <name> [target]|rm <name>|on <name> <cmd>|status}");
  return 1;
}
