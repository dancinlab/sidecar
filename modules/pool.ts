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
}
interface Roster {
  hosts: Host[];
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
    for (const h of r.hosts) info(`  • ${h.name}  →  ${h.target}`);
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
      const res = await execShell(`${SSH} ${JSON.stringify(h.target)} 'echo ok'`, { timeoutMs: 15_000 });
      return { h, up: res.code === 0 && res.stdout.includes("ok") };
    });
    for (const { h, up } of out) info(`  ${up ? "🟢" : "🔴"} ${h.name}  (${h.target})`);
    return 0;
  }
  info("usage: harness pool {list|add <name> [target]|rm <name>|on <name> <cmd>|status}");
  return 1;
}
