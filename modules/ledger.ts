// harness ledger {register|complete|list|gc|dup_check}
// Tracks background-agent lifecycles so parallel fan-outs don't double-spawn
// work in the same area. Append-only JSONL, merged by agent_id (last write wins).
import { createHash } from "node:crypto";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl, info } from "../lib/log.ts";
import { readJsonl } from "../lib/json.ts";
import { config } from "../lib/config.ts";

interface LedgerRow {
  agent_id: string;
  area?: string;
  prompt_hash?: string;
  ts_start?: string;
  ts_end?: string;
  status?: "active" | "done" | "stale";
}

function merged(): Map<string, LedgerRow> {
  const map = new Map<string, LedgerRow>();
  for (const r of readJsonl<LedgerRow>(LOGS.workRegistry)) {
    if (!r.agent_id) continue;
    map.set(r.agent_id, { ...(map.get(r.agent_id) ?? {}), ...r });
  }
  return map;
}

function genId(area: string, hash: string): string {
  return createHash("sha1").update(`${area}:${hash}:${Date.now()}:${Math.random()}`).digest("hex").slice(0, 12);
}

export async function runLedger(args: string[]): Promise<number> {
  const sub = args[0];
  if (sub === "register") {
    const area = args[1] ?? "general";
    const hash = args[2] ?? "";
    const id = genId(area, hash);
    appendJsonl(LOGS.workRegistry, { agent_id: id, area, prompt_hash: hash, ts_start: new Date().toISOString(), status: "active" });
    process.stdout.write(id + "\n"); // capture: agent_id=$(harness ledger register <area>)
    return 0;
  }
  if (sub === "complete") {
    const id = args[1];
    if (!id) {
      info("usage: harness ledger complete <agent_id>");
      return 1;
    }
    appendJsonl(LOGS.workRegistry, { agent_id: id, ts_end: new Date().toISOString(), status: "done" });
    return 0;
  }
  if (sub === "list") {
    const active = [...merged().values()].filter((r) => r.status === "active");
    if (!active.length) {
      info("no active agents");
      return 0;
    }
    for (const r of active) info(`  ${r.agent_id} [${r.area}] start=${r.ts_start}`);
    return 0;
  }
  if (sub === "gc") {
    const staleSec = config().ledger.staleSec;
    const now = Date.now();
    let n = 0;
    for (const r of merged().values()) {
      if (r.status !== "active" || !r.ts_start) continue;
      if ((now - Date.parse(r.ts_start)) / 1000 > staleSec) {
        appendJsonl(LOGS.workRegistry, { agent_id: r.agent_id, ts_end: new Date().toISOString(), status: "stale" });
        n++;
      }
    }
    info(`gc: ${n} stale agent(s) closed`);
    return 0;
  }
  if (sub === "dup_check") {
    const area = args[1] ?? "";
    const n = [...merged().values()].filter((r) => r.status === "active" && r.area === area).length;
    process.stdout.write(String(n) + "\n");
    return 0;
  }
  info("usage: harness ledger {register|complete|list|gc|dup_check}");
  return 1;
}
