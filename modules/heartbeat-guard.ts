// heartbeat-guard — c21: a LIVE long-runner (GPU pod, background agent/job) must be
// CHECKED at least every `poll.maxSilenceSec` (default 600s = 10min). This is the
// INVERSE of the c19 poll-guard: c19 caps how OFTEN you may poll (anti-cache-bust);
// c21 catches NOT polling AT ALL — firing a long job then walking away, so it
// idle-burns and its result is never harvested. Applies to ALL tracked long-runners
// (ing-board pods + ledger background agents), not just pods.
//
// We can't intercept the ABSENCE of an action, so: (a) `markPollActivity` stamps a
// `lastPoll` heartbeat whenever the agent runs a status-check command; (b) on agent
// activity (`post bash`) and session start (`ing inject`), `staleLongRunnerWarn`
// fires if a live long-runner exists and the heartbeat is older than maxSilenceSec.
// A cheap `.live-runner` marker (maintained by `ing pod add`/`done`) gates the cost
// so the per-bash check is skipped when nothing is live.
//

import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { LOG_DIR, LOGS } from "../lib/paths.ts";
import { readJsonl } from "../lib/json.ts";

const HEARTBEAT = resolve(LOG_DIR, "heartbeat.json");
const LIVE_MARKER = resolve(LOG_DIR, ".live-runner");
// auto-detected (un-registered) background long-runners — fire-and-forget jobs
// launched with `&`/nohup/disown that never went through `ing pod add` / ledger.
const AUTO_RUNNERS = resolve(LOG_DIR, "auto-runners.json");
// TTL so a finished auto-detected job stops nagging on its own (we can't observe
// its exit — a detached `&` job's PID isn't in the command string). 2h ceiling.
const AUTO_RUNNER_TTL_SEC = 7200;

// status-check commands that count as "checking a long-runner" → reset the heartbeat.
const POLL_ACTIVITY =
  /(^|[\s;&|(])(hexa\s+cloud\s+(poll|tail|list|status|alive|probe|watch|pods)|sidecar\s+ing\b|sidecar\s+ledger\s+(list|status)|sidecar\s+(check|lab|system)\b|gh\s+run\s+(watch|view)|squeue|sacct)\b/i;

// Stamp the heartbeat when the command is a status-check of a long-runner. Best-effort.
export function markPollActivity(cmd: string): void {
  if (!cmd || !POLL_ACTIVITY.test(cmd)) return;
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(HEARTBEAT, JSON.stringify({ lastPoll: new Date().toISOString() }) + "\n");
  } catch {
    /* best-effort — a missed stamp only risks a spurious nudge */
  }
}

function lastPollMs(): number | null {
  try {
    const t = Date.parse(JSON.parse(readFileSync(HEARTBEAT, "utf8")).lastPoll);
    return Number.isNaN(t) ? null : t;
  } catch {
    return null;
  }
}

// cheap perf gate: `ing pod add` sets the marker; `done`/`pod rm` clears it when no
// pods remain. `post bash` skips the (git) pod read entirely when no marker AND no
// active ledger agent — so the common no-live-job case costs one stat + one file read.
export function setLiveMarker(on: boolean): void {
  try {
    if (on) {
      mkdirSync(LOG_DIR, { recursive: true });
      writeFileSync(LIVE_MARKER, "");
    } else if (existsSync(LIVE_MARKER)) {
      unlinkSync(LIVE_MARKER);
    }
  } catch {
    /* best-effort */
  }
}
export function liveMarkerSet(): boolean {
  return existsSync(LIVE_MARKER);
}

// A fire-and-forget BACKGROUND launch of a long-runner: a detach construct
// (nohup · setsid · disown · trailing job-control `&`) over a known long-runner or
// sub-agent term. This is what `ing pod add`/ledger registration would have tracked
// — detecting it lets c21 nag even when the user skipped registration entirely.
const BG_DETACH = /\bnohup\b|\bsetsid\b|\bdisown\b|(^|[^&>])&[ \t]*(\bdisown\b)?[ \t]*$/m;
const BG_LONGRUNNER =
  /\b(claude\s+(?:-p|--print)|codex|hexa\s+cloud|runpodctl?|vastai?|nvidia-smi|torchrun|deepspeed|accelerate\s+launch|finetune|train(?:ing)?|dojo|sbatch|srun|measure\d*)\b/i;

// Returns a short label when `cmd` fire-and-forget-launches a background long-runner
// (un-registered), or null. Used to AUTO-arm the c21 heartbeat so a detached `&`
// job is tracked without an explicit `ing pod add`.
export function detectBackgroundLaunch(rawCmd: string): string | null {
  const cmd = rawCmd ?? "";
  if (!BG_DETACH.test(cmd)) return null;
  const m = BG_LONGRUNNER.exec(cmd);
  if (!m) return null;
  return `bg job (${m[1].replace(/\s+/g, " ").trim()})`;
}

// Read non-expired auto-runner labels, GC expired ones (and clear the live marker
// when nothing auto/registered remains). nowMs injected for testability.
export function autoRunnerLabels(nowMs: number): string[] {
  let rows: { label: string; at: string }[] = [];
  try {
    const parsed = JSON.parse(readFileSync(AUTO_RUNNERS, "utf8"));
    if (Array.isArray(parsed)) rows = parsed;
  } catch {
    return [];
  }
  const live = rows.filter((r) => {
    const t = Date.parse(r.at);
    return !Number.isNaN(t) && (nowMs - t) / 1000 < AUTO_RUNNER_TTL_SEC;
  });
  if (live.length !== rows.length) {
    try {
      if (live.length) writeFileSync(AUTO_RUNNERS, JSON.stringify(live) + "\n");
      else {
        unlinkSync(AUTO_RUNNERS);
        // marker may have been ours — drop it if no registered agent is live either.
        if (!activeAgentLabels().length) setLiveMarker(false);
      }
    } catch {
      /* best-effort GC */
    }
  }
  return live.map((r) => r.label);
}

// Record an auto-detected background long-runner (dedup by label, refresh its
// timestamp) and arm the live marker so the per-bash heartbeat gate trips.
export function recordAutoRunner(label: string, nowMs: number): void {
  try {
    let rows: { label: string; at: string }[] = [];
    try {
      const parsed = JSON.parse(readFileSync(AUTO_RUNNERS, "utf8"));
      if (Array.isArray(parsed)) rows = parsed;
    } catch {
      /* fresh */
    }
    const at = new Date(nowMs).toISOString();
    const idx = rows.findIndex((r) => r.label === label);
    if (idx >= 0) rows[idx].at = at;
    else rows.push({ label, at });
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(AUTO_RUNNERS, JSON.stringify(rows) + "\n");
    setLiveMarker(true);
  } catch {
    /* best-effort */
  }
}

// active background agents from the ledger work-registry (merged by agent_id, last
// write wins — mirrors ledger.ts merge), as human labels.
export function activeAgentLabels(): string[] {
  const map = new Map<string, { status?: string; area?: string }>();
  try {
    for (const r of readJsonl<{ agent_id?: string; status?: string; area?: string }>(LOGS.workRegistry)) {
      if (!r.agent_id) continue;
      map.set(r.agent_id, { ...(map.get(r.agent_id) ?? {}), ...r });
    }
  } catch {
    /* no registry → none */
  }
  return [...map.entries()]
    .filter(([, r]) => r.status === "active")
    .map(([id, r]) => `agent ${id}${r.area ? ` (${r.area})` : ""}`);
}

// Pure: given the live long-runner labels (pods supplied by caller + ledger agents
// added here) and the heartbeat age, return a c21 warn string or null. `nowMs` is
// injected so this stays testable.
export function staleLongRunnerWarn(podLabels: string[], maxSilenceSec: number, nowMs: number): string | null {
  const live = [...podLabels, ...activeAgentLabels(), ...autoRunnerLabels(nowMs)];
  if (!live.length) return null;
  const last = lastPollMs();
  const silentSec = last === null ? Number.POSITIVE_INFINITY : Math.round((nowMs - last) / 1000);
  if (silentSec < maxSilenceSec) return null;
  const when = silentSec === Number.POSITIVE_INFINITY ? "한 번도" : `${Math.round(silentSec / 60)}분째`;
  const floorMin = Math.round(maxSilenceSec / 60);
  return (
    `live 장기-진행건 ${live.length}개 [${live.join(" · ")}] 를 ${when} 확인 안 함 ` +
    `— 최소 ${floorMin}분마다는 상태를 봐야 한다 (c21): ` +
    `\`hexa cloud poll/tail <host>\` · \`sidecar ing show\` · \`sidecar check\` 로 확인하거나, ` +
    `끝났으면 \`hexa cloud down\` / \`sidecar ing done\` 으로 닫아라. (방치 = idle-burn + 결과 미회수)`
  );
}
