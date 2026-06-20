// harness convergence {status|recompute|by-category}
// Optional incident-tracking aggregator. Operates on a JSON file (configured via
// convergence.issuesFile) shaped like:
//   { "incidents": { "records": [ { "category","verified","fix_permanent","recurrence_after_fix" } ] },
//     "convergence": { "categories": {...}, "dashboard": { "overall": {...} } } }
// "Convergence" = the share of incident categories that are verified+permanent —
// a running measure of "have we actually stopped this class of bug recurring".
import { LOGS } from "../lib/paths.ts";
import { info, warn, ok, loudFail } from "../lib/log.ts";
import { readJson, writeJson } from "../lib/json.ts";
import { appendJsonl } from "../lib/log.ts";
import { config, repoPath } from "../lib/config.ts";
import { execShell } from "../lib/exec.ts";
import { existsSync, readFileSync } from "node:fs";

// --- inline @convergence marker validation (c1) ---------------------------
// The recurrence-prevention markers live as inline code comments. To MECHANICALLY
// enforce them, `scan` validates every marker carries the required keys (state·id)
// and a state from the allowed enum — a malformed marker can't be aggregated, so
// the learning is silently lost. `harness lint` calls this so commits gate on it.
// MARKER_TAG is split so THIS scanner never flags its own source as a marker.
const MARKER_TAG = "@con" + "vergence";
const ALLOWED_STATES = new Set([
  "ossified", "stable", "in_flight", "pending",
  "completed", "completed_gap", "failed", "blocked",
]);
const SCAN_EXT = /\.(ts|tsx|js|mjs|cjs|hexa|py|sh|go|rs|c|cc|cpp|h|hpp|swift|mm)$/;

export interface MarkerIssue {
  file: string;
  line: number;
  reason: string;
}

export async function scanConvergenceMarkers(paths: string[]): Promise<{ total: number; issues: MarkerIssue[] }> {
  let files: string[];
  if (paths.length) {
    files = paths;
  } else {
    const r = await execShell("git ls-files", { cwd: repoPath(".") });
    files = r.stdout.split("\n").map((s) => s.trim()).filter((f) => f && SCAN_EXT.test(f));
  }
  const issues: MarkerIssue[] = [];
  let total = 0;
  for (const f of files) {
    const abs = repoPath(f);
    if (!existsSync(abs)) continue;
    const lines = readFileSync(abs, "utf8").split("\n");
    lines.forEach((ln, i) => {
      if (!ln.includes(MARKER_TAG)) return;
      const seg = ln.slice(ln.indexOf(MARKER_TAG) + MARKER_TAG.length);
      // A real marker has the tag followed by ≥1 `<key>=` pair; a bare prose mention
      // of the tag in a comment ("inline @con·vergence validation") has none → skip,
      // don't validate it as a malformed marker.
      if (!/\b(state|id|value|threshold|rationale|ref_commit|date)\s*=/.test(seg)) return;
      total++;
      const stateM = seg.match(/state\s*=\s*"?([A-Za-z_]+)"?/);
      const idM = seg.match(/id\s*=\s*"?([A-Za-z0-9_]+)"?/);
      if (!stateM) issues.push({ file: f, line: i + 1, reason: "missing required key: state" });
      else if (!ALLOWED_STATES.has(stateM[1])) {
        issues.push({ file: f, line: i + 1, reason: `invalid state '${stateM[1]}' (allowed: ${[...ALLOWED_STATES].join("·")})` });
      }
      if (!idM) issues.push({ file: f, line: i + 1, reason: "missing required key: id" });
    });
  }
  return { total, issues };
}

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
  // `scan` validates inline markers (no issues file needed) — the enforcement gate.
  if ((args[0] ?? "") === "scan") {
    const { total, issues } = await scanConvergenceMarkers(args.slice(1));
    if (issues.length === 0) {
      ok(`convergence scan: ${total} ${MARKER_TAG} marker(s) — all well-formed (state+id present, valid state)`);
      return 0;
    }
    for (const it of issues) warn(`  ${it.file}:${it.line} — ${it.reason}`);
    loudFail(`convergence scan: ${issues.length} malformed of ${total} ${MARKER_TAG} marker(s)`);
    return 1;
  }

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
