// `sidecar injects` — read-only per-turn inject footprint report.
//
// "You can't manage what you don't measure." Every turn, sidecar RE-INJECTS a set of
// context blocks (commons · recommend · CLAUDE.md · easy · ing · load …). Their SUM is
// the context-rot budget — re-spent every single turn, silently making the agent dumber
// as it grows. This command surfaces that budget: per-source bytes/≈tokens/cap plus the
// aggregate vs lint.injectBudgetBytes, mirroring the exact accounting the INJECT-BUDGET
// lint gate uses (modules/lint.ts injectCapViolations). READ-ONLY — never writes.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, repoPath } from "../lib/config.ts";
import { SIDECAR_ROOT } from "../lib/paths.ts";
import { info, warn } from "../lib/log.ts";
import { readStdin } from "../lib/exec.ts";

function bytesOf(abs: string): number {
  try {
    return Buffer.byteLength(readFileSync(abs, "utf8"), "utf8");
  } catch {
    return 0;
  }
}

const tok = (b: number): number => Math.round(b / 4);

interface Row {
  source: string;
  bytes: number | null; // null = dynamic (rendered at runtime, no static size)
  cap: number | null; // per-source byte cap (null = no per-source cap)
  counted: boolean; // does this spend the aggregate injectBudgetBytes?
}

// pad helpers (fixed-width table)
const rpad = (s: string, n: number): string => (s.length >= n ? s : s + " ".repeat(n - s.length));
const lpad = (s: string, n: number): string => (s.length >= n ? s : " ".repeat(n - s.length) + s);

export async function runInjects(args: string[]): Promise<number> {
  if (args[0] === "-h" || args[0] === "--help" || args[0] === "help") {
    info("usage: sidecar injects [context-check]   — per-turn inject footprint report (read-only) · context-check = Stop-hook context-rot alarm");
    return 0;
  }
  if (args[0] === "context-check") return contextCheck();
  const cfg = config();
  const caps = cfg.lint?.injectCaps ?? {};
  const extras = cfg.lint?.injectBudgetExtra ?? [];
  const budget = cfg.lint?.injectBudgetBytes ?? 0;

  const rows: Row[] = [];

  // 1) single-file injectCaps keys (dir keys ending "/" expand to many variants of which
  //    only ONE ships per turn, so they don't count toward the aggregate — mirror lint).
  for (const [key, cap] of Object.entries(caps)) {
    if (key.endsWith("/")) continue; // skip dir/variant caps (not summed)
    rows.push({ source: key, bytes: existsSync(repoPath(key)) ? bytesOf(repoPath(key)) : 0, cap: cap || null, counted: true });
  }
  // 2) injectBudgetExtra — carry their OWN format lint (not byte-capped) but still spend
  //    the per-turn budget (e.g. repo-root CLAUDE.md via the claudemd inject).
  for (const f of extras) {
    rows.push({ source: f, bytes: existsSync(repoPath(f)) ? bytesOf(repoPath(f)) : 0, cap: null, counted: true });
  }

  // aggregate = sum of counted rows (identical to lint.ts injectCapViolations `total`).
  const total = rows.filter((r) => r.counted).reduce((s, r) => s + (r.bytes ?? 0), 0);

  // 3) the other dynamic per-turn injects — emitted every turn but rendered at runtime
  //    (board state / live resource readout / prefs-selected style file), so they are NOT
  //    part of the fixed aggregate budget. Surfaced for visibility only. easy is file-backed
  //    (styles/easy.<lang>.md · base measured); ing/load have no static size.
  const easyBase = resolve(SIDECAR_ROOT, "styles", "easy.md");
  const dyn: Row[] = [
    { source: "easy   (styles/easy.*.md)", bytes: existsSync(easyBase) ? bytesOf(easyBase) : null, cap: null, counted: false },
    { source: "ing    (ING.jsonl board)", bytes: null, cap: null, counted: false },
    { source: "load   (macOS resource readout)", bytes: null, cap: null, counted: false },
  ];

  // ---- render ----
  const W = 32; // source column width
  info("per-turn inject footprint (context-rot budget · read-only)");
  info("");
  info(`${rpad("source", W)}${lpad("bytes", 8)}${lpad("~tok", 7)}${lpad("cap", 9)}`);
  info("─".repeat(W + 8 + 7 + 9 + 4));
  for (const r of rows) {
    const b = r.bytes ?? 0;
    const capCell = r.cap ? String(r.cap) : "budget";
    const badge = r.cap ? (b > r.cap ? " 🔴" : " 🟢") : "";
    info(`${rpad(r.source, W)}${lpad(String(b), 8)}${lpad(String(tok(b)), 7)}${lpad(capCell, 9)}${badge}`);
  }
  info("─".repeat(W + 8 + 7 + 9 + 4));
  const overall = budget > 0 ? (total > budget ? " 🔴" : " 🟢") : "";
  const budgetCell = budget > 0 ? `/ ${budget}B` : "(no injectBudgetBytes set)";
  info(`${rpad("TOTAL (counted)", W)}${lpad(String(total), 8)}${lpad(String(tok(total)), 7)}${lpad(budgetCell, 9 > budgetCell.length ? 9 : budgetCell.length)}${overall}`);
  info("  = Σ single-file injectCaps sources + injectBudgetExtra  vs  lint.injectBudgetBytes");
  info("");
  info("dynamic per-turn injects (rendered at runtime · NOT in the fixed budget):");
  for (const r of dyn) {
    const bCell = r.bytes == null ? "dyn" : String(r.bytes);
    const tCell = r.bytes == null ? "—" : String(tok(r.bytes));
    info(`  ${rpad(r.source, W)}${lpad(bCell, 8)}${lpad(tCell, 7)}`);
  }
  info("");
  info("note: each per-turn inject emits ONCE across all wired surfaces (dedup via lib/inject.ts) —");
  info("      double-wired plugin + global hooks do NOT re-spend the budget twice. Trim a SOURCE to");
  info("      shrink the footprint; per-turn injects are never truncated at emit (inject-lint rule).");
  return 0;
}

// Context-fill rot alarm (Stop hook · advisory, NEVER blocks). The per-turn INJECT
// footprint is bounded (the report above + the injectBudget lint gate), but the thing
// that actually makes the agent dumber over a LONG session is the conversation filling
// the context window — transformer attention degrades as the window grows (context rot /
// lost-in-the-middle; Chroma's 18-model study puts noticeable degradation in the
// ~150-400K-token band). This warns once the LIVE window — estimated from the transcript
// bytes SINCE the last compaction boundary (so a fresh post-/compact window does NOT false
// alarm) — crosses the band, nudging /compact or a fresh session for the next task.
const CTX_WARN_TOKENS = 200_000; // ~4 bytes/token; transcript JSONL slightly over-counts real ctx → conservative
const CTX_LOUD_TOKENS = 350_000;

async function contextCheck(): Promise<number> {
  let payload: { stop_hook_active?: boolean; transcript_path?: string; transcriptPath?: string };
  try {
    payload = JSON.parse(readStdin());
  } catch {
    return 0;
  }
  if (payload?.stop_hook_active) return 0; // already fired this Stop chain — don't nag twice
  const tp = payload?.transcript_path ?? payload?.transcriptPath;
  if (!tp) return 0;
  let raw = "";
  try {
    raw = readFileSync(tp, "utf8");
  } catch {
    return 0;
  }
  // Bytes AFTER the last compaction boundary ≈ the current live context window. The
  // transcript file grows monotonically across compactions, so total size would keep
  // warning even right after a /compact; counting from the last `compact_boundary` marker
  // tracks the real window instead.
  let running = 0;
  let boundaryBytes = 0;
  for (const line of raw.split("\n")) {
    running += Buffer.byteLength(line, "utf8") + 1;
    const s = line.trim();
    if (!s) continue;
    try {
      const j = JSON.parse(s);
      if (j.type === "system" && String(j.subtype ?? "").includes("compact")) boundaryBytes = running;
    } catch {
      /* non-JSON line — skip */
    }
  }
  const tokens = Math.round((running - boundaryBytes) / 4);
  if (tokens < CTX_WARN_TOKENS) return 0;
  const k = Math.round(tokens / 1000);
  const band = tokens >= CTX_LOUD_TOKENS ? "🔴 심각" : "🟡 주의";
  warn(
    `[context-rot] ${band} — 현재 컨텍스트 ~${k}k tokens (마지막 compaction 이후 추정). ` +
      `긴 컨텍스트일수록 attention 저하(lost-in-the-middle)로 에이전트가 둔해진다 — ` +
      `지금 작업을 매듭짓고 \`/compact\` 하거나, 다음 작업은 새 세션에서 시작하라.`,
  );
  return 0;
}
