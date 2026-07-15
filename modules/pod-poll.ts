// sidecar pod {add|rm|list|watch|unwatch|poll} — GPU pod roster + auto-polling.
//
// ONE shared jsonl SSOT for pods: `~/.sidecar/pods.jsonl` (host-global, append-log
// jsonl — one pod object per line, last line per id wins — the same flat convention
// as pool.json/companions.json but jsonl like ING.jsonl/CHANGELOG.jsonl). Replaces
// the split of a keyed `pod-watch.json` registry + an `ing pod` roster on the `ing`
// ref: bookkeeping (provider/gpu/purpose/cost) and watch/poll config now live on the
// SAME entry. `ing` no longer stores pods — it only READS this file to surface running
// pods in its inject (store fully out of ING).
//
// Every remote op goes through `hexa cloud` (commons canonical-cli — never raw
// ssh/curl/provider-API): `cloud alive` (liveness), `cloud exec` (status probe),
// `cloud copy-from` (pull), `cloud rm` (teardown).
//
//   add <id> <provider> <gpu> <purpose> [cost]  register a running pod (roster only, no polling)
//   rm <id>                                      drop a pod from the roster (+ any cron entry)
//   list                                         show roster + watch/poll status
//   watch <id>                                   mark for ≥10-min cadence polling (cron, or agent-wakeup fallback)
//   unwatch <id>                                 stop polling (clear cadence + cron) — KEEPS the roster entry
//   poll <id>                                    one-shot, idempotent: alive → status probe → optional pull+teardown
//
// SAFE BY DEFAULT (no-escape-hatch): poll is READ-ONLY — pull/teardown happen
// ONLY with explicit --pull / --teardown-on-done. Teardown order is
// pull-THEN-destroy (a_fire_recover_complete: never drop a pod before its ckpt
// is recovered). A successful teardown removes the pod from the roster (it's gone).

import { homedir } from "node:os";
import { resolve, dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execArgs } from "../lib/exec.ts";
import { info, ok, warn, loudFail, nowIso } from "../lib/log.ts";

const PODS_FILE = resolve(homedir(), ".sidecar", "pods.jsonl");
const LEGACY_WATCH_FILE = resolve(homedir(), ".sidecar", "pod-watch.json"); // pre-jsonl keyed registry (one-time migration)
const CRON_LOG = resolve(homedir(), ".sidecar", "pod-watch.log");
const MIN_INTERVAL = 600; // commons c19: ≥10-min self-paced cadence floor
const DEFAULT_INTERVAL = 600;
const DEFAULT_DONE_AFTER = 2; // consecutive idle polls before declaring "done"

interface PollState {
  ts: string;
  alive: string;
  status: string;
  idle: boolean;
  idleStreak: number;
  done: boolean;
  action: string;
}
export interface PodEntry {
  id: string;
  // roster bookkeeping (was `ing pod` · optional so a watch-only entry omits them)
  provider?: string;
  gpu?: string;
  purpose?: string;
  cost?: string; // per-hour, free-form (e.g. "$1.9/hr")
  // watch/poll config
  watched?: boolean; // true once `pod watch` marked it for cadence polling
  interval: number;
  teardownOnDone: boolean;
  pull?: string; // "<remote> <local>" forwarded to `hexa cloud copy-from`
  sshCheck?: string; // custom probe command (else nvidia-smi util)
  doneMatch?: string; // regex over probe output → done (required for custom-check teardown)
  doneAfter: number;
  cron: boolean;
  addedAt: string;
  lastPoll?: PollState;
}
interface Registry {
  version: number;
  pods: Record<string, PodEntry>;
}

// Default skeleton for an entry created before any `pod watch` config exists.
function blankEntry(id: string): PodEntry {
  return { id, interval: DEFAULT_INTERVAL, teardownOnDone: false, doneAfter: DEFAULT_DONE_AFTER, cron: false, addedAt: nowIso() };
}

// ── registry I/O (pods.jsonl · append-log, last line per id wins) ─────────────
function load(): Registry {
  const pods: Record<string, PodEntry> = {};
  if (existsSync(PODS_FILE)) {
    try {
      for (const line of readFileSync(PODS_FILE, "utf8").split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try {
          const e = JSON.parse(t) as PodEntry;
          if (e && e.id) pods[e.id] = e; // last line wins
        } catch {
          /* skip malformed line */
        }
      }
    } catch {
      /* unreadable → empty */
    }
    return { version: 1, pods };
  }
  // one-time migration: seed from the pre-jsonl keyed `pod-watch.json` registry.
  if (existsSync(LEGACY_WATCH_FILE)) {
    try {
      const r = JSON.parse(readFileSync(LEGACY_WATCH_FILE, "utf8")) as Registry;
      if (r?.pods) return { version: 1, pods: r.pods };
    } catch {
      /* unreadable → empty */
    }
  }
  return { version: 1, pods };
}
function save(r: Registry): void {
  const dir = dirname(PODS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const body = Object.keys(r.pods)
    .map((id) => JSON.stringify(r.pods[id]))
    .join("\n");
  writeFileSync(PODS_FILE, body ? body + "\n" : "", "utf8");
}

// Read-only reader for other modules (ing inject/show) that surface running pods
// without owning the store. The pods.jsonl format-owner stays here.
export function loadPods(): PodEntry[] {
  return Object.values(load().pods);
}

// ── arg parsing (value-flags vs bool-flags vs positionals) ────────────────────
const VALUE_FLAGS = new Set(["--provider", "--interval", "--pull", "--ssh-check", "--done-match", "--done-after"]);
function parse(args: string[]): { opts: Record<string, string>; bools: Set<string>; pos: string[] } {
  const opts: Record<string, string> = {};
  const bools = new Set<string>();
  const pos: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--") && a.includes("=")) {
      const eq = a.indexOf("=");
      opts[a.slice(0, eq)] = a.slice(eq + 1);
      continue;
    }
    if (VALUE_FLAGS.has(a)) {
      opts[a] = args[++i] ?? "";
      continue;
    }
    if (a.startsWith("-")) {
      bools.add(a);
      continue;
    }
    pos.push(a);
  }
  return { opts, bools, pos };
}

// ── hexa cloud wrappers (canonical-cli; never raw ssh/curl) ───────────────────
async function cloudAlive(id: string, provider?: string): Promise<string> {
  const a = ["cloud", "alive", id, "--json"];
  if (provider) a.push("--provider", provider);
  const r = await execArgs("hexa", a, { timeoutMs: 60000 });
  try {
    const arr = JSON.parse(r.stdout.trim());
    if (Array.isArray(arr) && arr[0]?.state) return String(arr[0].state);
  } catch {
    /* fall through to exit-code mapping (cloud alive: 0/3/4/255) */
  }
  const byCode: Record<number, string> = { 0: "RUNNING", 3: "STOPPED", 4: "GONE", 255: "MISSING-CRED" };
  return byCode[r.code] ?? "UNKNOWN";
}

// `cloud exec <id>` auto-resolves the pod id → ssh and runs the command; its own
// "[cloud] …" control lines are stripped so only the remote command output remains.
async function cloudProbe(id: string, cmd: string): Promise<{ out: string; code: number }> {
  const r = await execArgs("hexa", ["cloud", "exec", id, "--", cmd], { timeoutMs: 120000 });
  const out = (r.stdout + "\n" + r.stderr)
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("[cloud]"))
    .join("\n")
    .trim();
  return { out, code: r.code };
}

async function cloudPull(id: string, spec: string): Promise<boolean> {
  const parts = spec.trim().split(/\s+/);
  if (parts.length < 2) {
    warn(`pod ${id}: --pull needs "<remote> <local>" (forwarded to hexa cloud copy-from)`);
    return false;
  }
  const remote = parts[0];
  const local = parts.slice(1).join(" ");
  const r = await execArgs("hexa", ["cloud", "copy-from", id, remote, local], { timeoutMs: 600000 });
  return r.code === 0;
}

async function cloudRm(id: string, provider?: string): Promise<boolean> {
  const a = ["cloud", "rm", id, "--force"];
  if (provider) a.push("--provider", provider);
  const r = await execArgs("hexa", a, { timeoutMs: 120000 });
  return r.code === 0;
}

// ── status interpretation ─────────────────────────────────────────────────────
function parseUtilIdle(out: string): { idle: boolean; util: string } {
  const nums = out
    .split("\n")
    .map((l) => {
      const m = l.match(/(\d+)\s*%/);
      return m ? parseInt(m[1], 10) : null;
    })
    .filter((n): n is number => n !== null);
  if (!nums.length) return { idle: false, util: out.split("\n")[0] ?? "?" };
  return { idle: nums.every((n) => n === 0), util: nums.join(",") + "%" };
}

// ── poll (one-shot, idempotent) ───────────────────────────────────────────────
async function poll(args: string[]): Promise<number> {
  const { opts, bools, pos } = parse(args);
  const id = pos[0];
  if (!id) {
    loudFail("pod poll: missing <id>", {
      usage: 'sidecar pod poll <id> [--provider P] [--ssh-check "<cmd>"] [--done-match RE] [--done-after N] [--teardown-on-done] [--pull "<remote> <local>"]',
    });
    return 1;
  }
  const reg = load();
  const entry = reg.pods[id];
  const provider = opts["--provider"] ?? entry?.provider;
  const sshCheck = opts["--ssh-check"] ?? entry?.sshCheck;
  const doneMatch = opts["--done-match"] ?? entry?.doneMatch;
  const teardown = bools.has("--teardown-on-done") || entry?.teardownOnDone || false;
  const pull = opts["--pull"] ?? entry?.pull;
  const doneAfter = parseInt(opts["--done-after"] ?? "", 10) || entry?.doneAfter || DEFAULT_DONE_AFTER;

  // 1. liveness — GONE/STOPPED is terminal for polling (idempotent: just record)
  const state = await cloudAlive(id, provider);
  if (state !== "RUNNING") {
    info(`pod ${id}: ${state} — not running, nothing to poll`);
    if (entry) {
      entry.lastPoll = { ts: nowIso(), alive: state, status: "", idle: false, idleStreak: 0, done: state === "GONE", action: "none" };
      save(reg);
    }
    return 0;
  }

  // 2. probe (default = GPU util; or a custom --ssh-check)
  const probeCmd = sshCheck ?? "nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader";
  const probe = await cloudProbe(id, probeCmd);

  // 3. idle/done判정
  let idle: boolean;
  let statusLine: string;
  if (doneMatch) {
    idle = new RegExp(doneMatch).test(probe.out);
    statusLine = probe.out.split("\n")[0] ?? "";
  } else if (sshCheck) {
    // custom check without --done-match = report-only (can't auto-decide done)
    idle = false;
    statusLine = probe.out.split("\n")[0] || "(no output)";
  } else {
    const u = parseUtilIdle(probe.out);
    idle = u.idle;
    statusLine = `util ${u.util}`;
  }

  const prevStreak = entry?.lastPoll?.idleStreak ?? 0;
  const idleStreak = idle ? prevStreak + 1 : 0;
  // done: custom-match → on match; util-idle → sustained N polls (single snapshot if unwatched);
  // custom check w/o match → never auto-done.
  const done = doneMatch ? idle : sshCheck ? false : entry ? idleStreak >= doneAfter : idle;

  // 4. teardown — pull THEN destroy (a_fire_recover_complete), only when asked
  let action = "none";
  if (done && teardown) {
    if (pull) {
      const pulled = await cloudPull(id, pull);
      if (!pulled) {
        warn(`pod ${id}: pull FAILED — refusing teardown (a_fire_recover_complete: recover ckpt first)`);
        action = "pull-FAILED";
        if (entry) {
          entry.lastPoll = { ts: nowIso(), alive: state, status: statusLine, idle, idleStreak, done, action };
          save(reg);
        }
        loudFail(`pod ${id}: pull failed, teardown skipped`);
        return 1;
      }
      const removed = await cloudRm(id, provider);
      action = removed ? "pull+torn-down" : "pulled,rm-FAILED";
    } else {
      const removed = await cloudRm(id, provider);
      action = removed ? "torn-down" : "rm-FAILED";
    }
    if (action.endsWith("torn-down") && entry) {
      // pod is gone — drop it from the watch registry (and any cron)
      delete reg.pods[id];
      save(reg);
      await removeCron(id);
    }
  }

  // 5. persist + compact 1-block report
  if (reg.pods[id]) {
    reg.pods[id].lastPoll = { ts: nowIso(), alive: state, status: statusLine, idle, idleStreak, done, action };
    save(reg);
  }
  const verdict = done
    ? teardown
      ? `DONE → ${action}`
      : "DONE (teardown not requested)"
    : idle
      ? `idle ${idleStreak}/${doneAfter}`
      : "busy";
  ok(`pod ${id} [${state}] ${statusLine} · ${verdict}`);
  return 0;
}

// ── watch / unwatch / list ────────────────────────────────────────────────────
async function watch(args: string[]): Promise<number> {
  const { opts, bools, pos } = parse(args);
  const id = pos[0];
  if (!id) {
    loudFail("pod watch: missing <id>", { usage: "sidecar pod watch <id> [--interval 600] [--cron] [--teardown-on-done] [--pull \"<remote> <local>\"] [--ssh-check \"<cmd>\"] [--done-match RE]" });
    return 1;
  }
  let interval = parseInt(opts["--interval"] ?? "", 10) || DEFAULT_INTERVAL;
  if (interval < MIN_INTERVAL) {
    warn(`pod watch: interval ${interval}s < ${MIN_INTERVAL}s floor (c19) — clamped to ${MIN_INTERVAL}s`);
    interval = MIN_INTERVAL;
  }
  const reg = load();
  const prev = reg.pods[id];
  const entry: PodEntry = {
    ...(prev ?? blankEntry(id)),
    id,
    // preserve roster bookkeeping (provider/gpu/purpose/cost) from a prior `pod add`
    provider: opts["--provider"] ?? prev?.provider,
    watched: true,
    interval,
    teardownOnDone: bools.has("--teardown-on-done"),
    pull: opts["--pull"] ?? prev?.pull,
    sshCheck: opts["--ssh-check"] ?? prev?.sshCheck,
    doneMatch: opts["--done-match"] ?? prev?.doneMatch,
    doneAfter: parseInt(opts["--done-after"] ?? "", 10) || prev?.doneAfter || DEFAULT_DONE_AFTER,
    cron: bools.has("--cron"),
    lastPoll: prev?.lastPoll,
  };
  reg.pods[id] = entry;
  save(reg);
  const mins = Math.max(1, Math.round(interval / 60));

  if (bools.has("--cron")) {
    const installed = await installCron(id, mins, entry);
    if (installed) {
      ok(`pod watch: ${id} registered + cron (every ~${mins}m → sidecar pod poll). log: ${CRON_LOG}`);
    } else {
      entry.cron = false;
      save(reg);
      warn(`pod watch: ${id} registered but cron install FAILED — falling back to agent wakeup`);
      info(`  drive it: ScheduleWakeup(${interval}s) → \`sidecar pod poll ${id}\` each wake`);
    }
  } else {
    ok(`pod watch: ${id} registered (interval ${interval}s · teardown ${entry.teardownOnDone ? "ON" : "OFF"})`);
    info("cadence: REGISTRY-only — no system cron touched (safe default). Drive it either way:");
    info(`  • agent:      ScheduleWakeup(${interval}s) → run \`sidecar pod poll ${id}\` each wake (agent-paced, honest fallback)`);
    info(`  • unattended: re-run with --cron to install a crontab (every ~${mins}m) entry`);
  }
  return 0;
}

// unwatch = stop polling but KEEP the roster entry (the pod is still running/renting).
// Use `pod rm` to drop it from the roster entirely; a successful teardown-on-done poll
// removes it automatically.
async function unwatch(args: string[]): Promise<number> {
  const { pos } = parse(args);
  const id = pos[0];
  if (!id) {
    loudFail("pod unwatch: missing <id>", { usage: "sidecar pod unwatch <id>" });
    return 1;
  }
  const reg = load();
  const entry = reg.pods[id];
  if (!entry) {
    info(`pod unwatch: ${id} not in roster`);
    await removeCron(id);
    return 0;
  }
  entry.watched = false;
  entry.cron = false;
  save(reg);
  const cronOk = await removeCron(id);
  const cronNote = cronOk ? "" : " (⚠ cron entry remove FAILED — clear it manually)";
  ok(`pod unwatch: ${id} polling stopped (still in roster — \`pod rm ${id}\` to drop)${cronNote}`);
  return 0;
}

// add = roster-only registration (bookkeeping: what am I renting + cost). No polling.
async function addRoster(args: string[]): Promise<number> {
  const { pos } = parse(args);
  const [id, provider, gpu, ...rest] = pos;
  if (!id) {
    loudFail("pod add: missing <id>", { usage: "sidecar pod add <id> <provider> <gpu> <purpose> [cost/hr]" });
    return 1;
  }
  const cost = rest.length && /^[\d.$]/.test(rest[rest.length - 1]) ? rest.pop()! : undefined;
  const purpose = rest.join(" ") || undefined;
  const reg = load();
  const prev = reg.pods[id];
  reg.pods[id] = {
    ...(prev ?? blankEntry(id)),
    id,
    provider: provider ?? prev?.provider,
    gpu: gpu ?? prev?.gpu,
    purpose: purpose ?? prev?.purpose,
    cost: cost ?? prev?.cost,
  };
  save(reg);
  ok(`pod add: ${id} (${provider ?? "-"} · ${gpu ?? "-"} · ${purpose ?? "-"}${cost ? " · " + cost : ""})`);
  return 0;
}

// rm = drop a pod from the roster entirely (+ any cron entry).
async function rmRoster(args: string[]): Promise<number> {
  const { pos } = parse(args);
  const id = pos[0];
  if (!id) {
    loudFail("pod rm: missing <id>", { usage: "sidecar pod rm <id>" });
    return 1;
  }
  const reg = load();
  const had = !!reg.pods[id];
  delete reg.pods[id];
  save(reg);
  await removeCron(id);
  if (had) ok(`pod rm: ${id} removed from roster`);
  else info(`pod rm: ${id} was not in roster`);
  return 0;
}

function list(): number {
  const reg = load();
  const ids = Object.keys(reg.pods);
  if (!ids.length) {
    info("pod list: roster empty — `sidecar pod add <id> <provider> <gpu> <purpose>` or `pod watch <id>`");
    return 0;
  }
  info(`pods (${ids.length}) · ${PODS_FILE}`);
  for (const id of ids) {
    const e = reg.pods[id];
    const lp = e.lastPoll;
    const roster = `${e.provider ?? "-"} · ${e.gpu ?? "-"} · ${e.purpose ?? "-"}${e.cost ? " · " + e.cost : ""}`;
    const watch = e.watched
      ? `watch every ${e.interval}s · teardown ${e.teardownOnDone ? "ON" : "OFF"} · cron ${e.cron ? "ON" : "OFF"}`
      : "roster-only";
    const last = lp
      ? ` · last: ${lp.alive}/${lp.idle ? `idle ${lp.idleStreak}` : "busy"}${lp.done ? " DONE" : ""}${lp.action !== "none" ? ` (${lp.action})` : ""} @${lp.ts.slice(11, 19)}`
      : "";
    info(`  • ${id} | ${roster} | ${watch}${last}`);
  }
  return 0;
}

// ── cron cadence (opt-in; default path never touches system cron) ─────────────
function cronMarker(id: string): string {
  return `# sidecar-pod-watch ${id}`;
}
// crontab minute field is 0-59 — for ≥1h cadence fall back to an hour schedule.
function cronSpec(mins: number): string {
  if (mins <= 59) return `*/${mins} * * * *`;
  const hrs = Math.max(1, Math.round(mins / 60));
  return `0 */${hrs} * * *`;
}
async function sidecarBin(): Promise<string> {
  const r = await execArgs("bash", ["-lc", "command -v sidecar"], { timeoutMs: 10000 });
  return r.stdout.trim() || process.argv[1] || "sidecar";
}
function shq(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
async function installCron(id: string, mins: number, e: PodEntry): Promise<boolean> {
  const bin = await sidecarBin();
  const flags: string[] = [];
  if (e.provider) flags.push(`--provider ${e.provider}`);
  if (e.sshCheck) flags.push(`--ssh-check ${shq(e.sshCheck)}`);
  if (e.doneMatch) flags.push(`--done-match ${shq(e.doneMatch)}`);
  if (e.teardownOnDone) flags.push("--teardown-on-done");
  if (e.pull) flags.push(`--pull ${shq(e.pull)}`);
  const cmd = `${bin} pod poll ${id} ${flags.join(" ")} >> ${CRON_LOG} 2>&1`.replace(/\s+/g, " ").trim();
  const line = `${cronSpec(mins)} ${cmd} ${cronMarker(id)}`;
  const cur = await execArgs("crontab", ["-l"], { timeoutMs: 10000 });
  const lines = (cur.code === 0 ? cur.stdout : "").split("\n").filter((l) => l.trim() && !l.includes(cronMarker(id)));
  lines.push(line);
  const w = await execArgs("crontab", ["-"], { timeoutMs: 10000, input: lines.join("\n") + "\n" });
  return w.code === 0;
}
async function removeCron(id: string): Promise<boolean> {
  const cur = await execArgs("crontab", ["-l"], { timeoutMs: 10000 });
  if (cur.code !== 0) return true; // no crontab → nothing to remove
  const all = cur.stdout.split("\n");
  if (!all.some((l) => l.includes(cronMarker(id)))) return true; // no entry for this pod → no-op
  const kept = all.filter((l) => l.trim() && !l.includes(cronMarker(id)));
  const w = await execArgs("crontab", ["-"], { timeoutMs: 10000, input: kept.length ? kept.join("\n") + "\n" : "" });
  return w.code === 0;
}

// ── dispatcher ────────────────────────────────────────────────────────────────
export async function runPodPoll(sub: string, args: string[]): Promise<number> {
  switch (sub) {
    case "add":
      return addRoster(args);
    case "rm":
      return rmRoster(args);
    case "poll":
      return poll(args);
    case "watch":
      return watch(args);
    case "unwatch":
      return unwatch(args);
    case "list":
      return list();
    default:
      loudFail(`pod: unknown subcommand '${sub}'`, { valid: "add|rm|list|watch|unwatch|poll" });
      return 1;
  }
}
