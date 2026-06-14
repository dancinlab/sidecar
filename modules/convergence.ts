// harness convergence {status|recompute|by-category}
// Optional incident-tracking aggregator. Operates on a JSON file (configured via
// convergence.issuesFile) shaped like:
//   { "incidents": { "records": [ { "category","verified","fix_permanent","recurrence_after_fix" } ] },
//     "convergence": { "categories": {...}, "dashboard": { "overall": {...} } } }
// "Convergence" = the share of incident categories that are verified+permanent —
// a running measure of "have we actually stopped this class of bug recurring".
import { LOGS } from "../lib/paths.ts";
import { info, warn } from "../lib/log.ts";
import { readJson, writeJson } from "../lib/json.ts";
import { appendJsonl } from "../lib/log.ts";
import { config, repoPath } from "../lib/config.ts";
import { existsSync } from "node:fs";

interface Record_ {
  category?: string;
  verified?: boolean;
  fix_permanent?: boolean;
  recurrence_after_fix?: number;
}
interface Issues {
  incidents?: { records?: Record_[] };
  convergence?: {
    categories?: Record<string, { total: number; resolved: number; open: number }>;
    dashboard?: { overall?: Record<string, unknown> };
  };
}

function issuesFile(): string | null {
  const c = config().convergence;
  if (!c?.issuesFile) return null;
  const abs = repoPath(c.issuesFile);
  return existsSync(abs) ? abs : null;
}

function aggregate(recs: Record_[]) {
  const cats = new Map<string, { total: number; resolved: number; open: number }>();
  let recurrence = 0;
  for (const r of recs) {
    const cat = r.category ?? "uncategorized";
    const c = cats.get(cat) ?? { total: 0, resolved: 0, open: 0 };
    c.total++;
    const resolved = !!r.verified && r.fix_permanent !== false;
    if (resolved) c.resolved++;
    else c.open++;
    recurrence += r.recurrence_after_fix ?? 0;
    cats.set(cat, c);
  }
  let total = 0;
  let resolved = 0;
  for (const c of cats.values()) {
    total += c.total;
    resolved += c.resolved;
  }
  const pct = total ? Math.round((resolved / total) * 100) : 100;
  return { cats, total, resolved, open: total - resolved, recurrence, pct };
}

export async function runConvergence(args: string[]): Promise<number> {
  const file = issuesFile();
  if (!file) {
    info("convergence: no issues file configured (harness.config.json → convergence.issuesFile)");
    return 0;
  }
  const sub = args[0] ?? "status";
  const data = readJson<Issues>(file);
  const recs = data.incidents?.records ?? [];
  const agg = aggregate(recs);

  if (sub === "by-category") {
    for (const [k, v] of [...agg.cats].sort((a, b) => b[1].open - a[1].open)) {
      process.stdout.write(`${k}\t${v.total}\t${v.resolved}\t${v.open}\n`);
    }
    return 0;
  }
  if (sub === "recompute") {
    data.convergence ??= {};
    data.convergence.categories = Object.fromEntries(agg.cats);
    data.convergence.dashboard ??= {};
    data.convergence.dashboard.overall = {
      total_incidents: agg.total,
      resolved: agg.resolved,
      open: agg.open,
      recurrence_after_fix: agg.recurrence,
      convergence_pct: agg.pct,
    };
    writeJson(file, data);
    appendJsonl(LOGS.observations, { kind: "convergence_recompute", pct: agg.pct, total: agg.total });
    info(`convergence recomputed → ${agg.pct}% (${agg.resolved}/${agg.total})`);
    return 0;
  }
  // status
  info(`convergence: ${agg.pct}% — ${agg.resolved}/${agg.total} resolved, ${agg.open} open, recurrence=${agg.recurrence}`);
  for (const [k, v] of [...agg.cats].sort((a, b) => b[1].open - a[1].open).slice(0, 20)) {
    const line = `  ${k.padEnd(20)} ${v.resolved}/${v.total} resolved`;
    if (v.open > 0) warn(line);
    else info(line);
  }
  return 0;
}
