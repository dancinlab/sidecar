// harness bitter-gate audit [window]
// Before adding a NEW rule, retire DORMANT ones. This reports rule-hit frequency
// from the error queue so you can see which rules earn their keep (H3).
import { LOGS } from "../lib/paths.ts";
import { info, warn } from "../lib/log.ts";
import { readJsonl } from "../lib/json.ts";

interface ErrRow {
  kind?: string;
  code?: string;
  ts?: string;
}

export async function runBitterGate(args: string[]): Promise<number> {
  if (args[0] !== "audit") {
    info("usage: harness bitter-gate audit [window]");
    return 1;
  }
  const window = parseInt(args[1] ?? "500", 10);
  const rows = readJsonl<ErrRow>(LOGS.errors, window);
  const hits = new Map<string, { code: string; count: number; lastTs: string }>();
  for (const r of rows) {
    if (!r.code) continue;
    const key = `${r.kind ?? "?"}:${r.code}`;
    const cur = hits.get(key) ?? { code: key, count: 0, lastTs: "" };
    cur.count++;
    if (r.ts && r.ts > cur.lastTs) cur.lastTs = r.ts;
    hits.set(key, cur);
  }
  const sorted = [...hits.values()].sort((a, b) => b.count - a.count);
  info(`bitter-gate audit — window=${window}, distinct rules=${sorted.length}`);
  for (const h of sorted.slice(0, 10)) info(`  ${String(h.count).padStart(4)}× ${h.code}  (last ${h.lastTs || "—"})`);
  if (sorted.length === 0) {
    warn("no rule hits in window — every active rule is dormant. Audit before adding more.");
  }
  return 0;
}
