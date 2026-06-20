// harness convergence {status|recompute|by-category}
// Optional incident-tracking aggregator. Operates on a JSON file (configured via
// convergence.issuesFile) shaped like:
//   { "incidents": { "records": [ { "category","verified","fix_permanent","recurrence_after_fix" } ] },
//     "convergence": { "categories": {...}, "dashboard": { "overall": {...} } } }
// "Convergence" = the share of incident categories that are verified+permanent —
// a running measure of "have we actually stopped this class of bug recurring".
import { LOGS, LOG_DIR } from "../lib/paths.ts";
import { info, warn, ok, loudFail } from "../lib/log.ts";
import { readJson, writeJson } from "../lib/json.ts";
import { appendJsonl } from "../lib/log.ts";
import { config, repoPath } from "../lib/config.ts";
import { execShell } from "../lib/exec.ts";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

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

// Sync per-file scan — the validation core. Used by both the async whole-repo scan
// and the synchronous post-edit debt resolver (which must finish before process.exit).
function scanFileMarkers(file: string): { total: number; issues: MarkerIssue[] } {
  const issues: MarkerIssue[] = [];
  let total = 0;
  const abs = repoPath(file);
  if (!existsSync(abs)) return { total, issues };
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
    if (!stateM) issues.push({ file, line: i + 1, reason: "missing required key: state" });
    else if (!ALLOWED_STATES.has(stateM[1])) {
      issues.push({ file, line: i + 1, reason: `invalid state '${stateM[1]}' (allowed: ${[...ALLOWED_STATES].join("·")})` });
    }
    if (!idM) issues.push({ file, line: i + 1, reason: "missing required key: id" });
  });
  return { total, issues };
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
    const res = scanFileMarkers(f);
    total += res.total;
    issues.push(...res.issues);
  }
  return { total, issues };
}

// --- capture-token enforcement loop (c1) ----------------------------------
// Advisory text is easy to skip past. The capture token closes the loop:
//   1. EMIT   — when a recurrence-signal keyword fires (prompt-scan), a unique
//               ⟦CONVERGENCE-DUE id=… matched="…"⟧ token is printed AND a debt is
//               recorded to a state file (markCaptureDebt).
//   2. RESOLVE— a post-edit on a code file that now carries a well-formed
//               @convergence marker clears the debt (resolveConvergenceDebtOnEdit).
//   3. ENFORCE— at session Stop, if the debt is still open, warn once then reset
//               (convergenceDueWarn) — same soft-nudge shape as ing-staleness.
// warn-only: the recurrence keyword can false-positive, so a hard block would be a
// false-positive factory; the token + Stop nudge make the debt impossible to miss
// without vetoing legitimate "no marker needed" turns.
//
// @convergence state=in_flight id=CONVERGENCE_CAPTURE_TOKEN value="recurrence trigger now EMITS a capture token + records a debt; a post-edit adding a well-formed @convergence marker RESOLVES it; Stop warns once if still open then resets — warn-only loop mirroring ing-staleness" threshold="the text hint alone was advisory and skippable; nothing captured whether the agent actually wrote the marker after a recurrence signal"
const DEBT = resolve(LOG_DIR, "convergence-debt.json");

interface Debt {
  capture: string;
  token: string;
  matched: string;
  ts: number;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function readDebt(): Debt | null {
  try {
    const j = JSON.parse(readFileSync(DEBT, "utf8"));
    return j && j.capture ? (j as Debt) : null;
  } catch {
    return null;
  }
}

// EMIT — register a capture debt and return the token to surface to the agent.
// `capture` is the token name (e.g. "CONVERGENCE-DUE"), supplied by the keyword
// rule's `capture` field so the engine stays data-driven (no trigger id hardcoded).
export function markCaptureDebt(capture: string, matched: string): string {
  const id =
    capture.split("-")[0].slice(0, 2).toUpperCase() +
    "-" +
    hashStr(`${capture}|${matched}|${Date.now()}`).toString(36).slice(0, 6).toUpperCase();
  const token = `⟦${capture} id=${id} matched="${matched}"⟧`;
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    writeFileSync(DEBT, JSON.stringify({ capture, token, matched, ts: Date.now() } satisfies Debt) + "\n");
  } catch {
    /* best-effort — a missed debt only loses a Stop nudge */
  }
  return token;
}

function clearDebt(): void {
  try {
    if (existsSync(DEBT)) unlinkSync(DEBT);
  } catch {
    /* best-effort */
  }
}

// RESOLVE — a post-edit that lands a well-formed @convergence marker in a code file
// closes the open debt (the agent did what the token asked). Soft, like any ing
// mutation clearing ing-staleness; reuses the same validator so a malformed marker
// does NOT count as resolution.
export function resolveConvergenceDebtOnEdit(file: string): void {
  const d = readDebt();
  if (!d || d.capture !== "CONVERGENCE-DUE") return;
  if (!file || !SCAN_EXT.test(file)) return;
  const r = scanFileMarkers(file); // sync — must finish before the CLI process.exit()s
  if (r.total > 0 && r.issues.length === 0) clearDebt();
}

// ENFORCE — Stop-hook check: if a debt is still open, return a one-line warn and
// RESET (warn once per debt, not every Stop). Returns null when no debt is open.
export function convergenceDueWarn(): string | null {
  const d = readDebt();
  if (!d) return null;
  clearDebt();
  return (
    `재발 신호("${d.matched}")를 감지했는데 이 세션에서 well-formed @convergence 마커가 추가되지 않았다 (c1 · 캡처 토큰 ${d.token}). ` +
    `같은 결함이 또 났다면 결함난 그 코드 파일의 인라인 주석에 // @convergence state=ossified id=RECUR_ID value="<핵심>" threshold="<재발조건/해결>" 를 남겨라 ` +
    `— 마커를 쓰면 다음 편집에서 이 부채는 자동 해소된다 (harness convergence scan 검증). 진짜 마커가 불필요한 턴이면 무시해도 된다 (warn-only).`
  );
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

  // `due-check` (Stop hook · c1) — warn once if a recurrence capture-debt is still
  // open (a recurrence signal fired this session but no marker was written). warn-only.
  if ((args[0] ?? "") === "due-check") {
    const msg = convergenceDueWarn();
    if (msg) warn(`[convergence-due] ${msg}`);
    return 0;
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
