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
// @convergence state=in_flight id=NO_ABANDONED_LONGRUNNER value="a live long-runner (pod/bg-agent) left unchecked >maxSilenceSec is WARNED (c21) — heartbeat stamped on status-check cmds, surfaced on activity + session start; the inverse of c19's over-poll cap" threshold="sessions fired a pod/job then never polled it (idle-burn · result never harvested); c19 only capped over-polling, the under-polling/abandonment case had no guard"

import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { LOG_DIR, LOGS } from "../lib/paths.ts";
import { readJsonl } from "../lib/json.ts";

const HEARTBEAT = resolve(LOG_DIR, "heartbeat.json");
const LIVE_MARKER = resolve(LOG_DIR, ".live-runner");

// status-check commands that count as "checking a long-runner" → reset the heartbeat.
const POLL_ACTIVITY =
  /(^|[\s;&|(])(hexa\s+cloud\s+(poll|tail|list|status|alive|probe|watch|pods)|harness\s+ing\b|harness\s+ledger\s+(list|status)|harness\s+(check|lab|system)\b|gh\s+run\s+(watch|view)|squeue|sacct)\b/i;

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
  const live = [...podLabels, ...activeAgentLabels()];
  if (!live.length) return null;
  const last = lastPollMs();
  const silentSec = last === null ? Number.POSITIVE_INFINITY : Math.round((nowMs - last) / 1000);
  if (silentSec < maxSilenceSec) return null;
  const when = silentSec === Number.POSITIVE_INFINITY ? "한 번도" : `${Math.round(silentSec / 60)}분째`;
  const floorMin = Math.round(maxSilenceSec / 60);
  return (
    `live 장기-진행건 ${live.length}개 [${live.join(" · ")}] 를 ${when} 확인 안 함 ` +
    `— 최소 ${floorMin}분마다는 상태를 봐야 한다 (c21): ` +
    `\`hexa cloud poll/tail <host>\` · \`harness ing show\` · \`harness check\` 로 확인하거나, ` +
    `끝났으면 \`hexa cloud down\` / \`harness ing done\` 으로 닫아라. (방치 = idle-burn + 결과 미회수)`
  );
}
