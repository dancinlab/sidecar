// harness errors {route|list|drain_check|mark_fixed}
// Classify error signals by (kind, code) → severity via a pluggable map, then
// queue them in an append-only JSONL so gates (drain_check) can block on backlog.
import { readJson } from "../lib/json.ts";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl, info, loudFail, warn } from "../lib/log.ts";
import { readJsonl } from "../lib/json.ts";
import { config, resolveRuleFile } from "../lib/config.ts";

type Severity = "block" | "defer" | "warn";

interface SeverityMap {
  fallback?: Severity;
  unknown_threshold?: number;
  rules?: Record<string, Record<string, Severity>>;
}

export interface ErrorRecord {
  source: string;
  kind: string;
  code: string;
  file: string;
  line: number;
  msg: string;
}

let _map: SeverityMap | null = null;
function severityMap(): SeverityMap {
  if (_map) return _map;
  const file = resolveRuleFile(config().severityMapFile, "severity-map.json");
  try {
    _map = readJson<SeverityMap>(file);
  } catch {
    _map = { fallback: "defer", rules: {} };
  }
  return _map;
}

export function classify(kind: string, code: string): Severity {
  const m = severityMap();
  return m.rules?.[kind]?.[code] ?? m.fallback ?? "defer";
}

export function routeError(rec: ErrorRecord): Severity {
  const severity = classify(rec.kind, rec.code);
  appendJsonl(LOGS.errors, { ...rec, severity, status: "open" });
  if (severity === "block") loudFail(`[${rec.code}] ${rec.msg}`, { file: rec.file, line: rec.line });
  else if (severity === "warn") warn(`[${rec.code}] ${rec.msg}`, { file: rec.file });
  return severity;
}

function openErrors(): Array<ErrorRecord & { severity: Severity; status: string }> {
  const rows = readJsonl<ErrorRecord & { severity: Severity; status: string; code: string }>(LOGS.errors);
  const fixed = new Set(
    rows.filter((r) => r.status === "fixed").map((r) => r.code)
  );
  return rows.filter((r) => r.status === "open" && !fixed.has(r.code));
}

export async function runErrors(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";
  if (sub === "route") {
    const [, source, kind, code, file, line, ...msg] = args;
    routeError({
      source: source ?? "manual",
      kind: kind ?? "runtime_signal",
      code: code ?? "unknown",
      file: file ?? "",
      line: parseInt(line ?? "0", 10) || 0,
      msg: msg.join(" "),
    });
    return 0;
  }
  if (sub === "list") {
    const open = openErrors().slice(-20);
    if (open.length === 0) {
      info("no open errors");
      return 0;
    }
    for (const e of open) info(`  [${e.severity}] ${e.code} ${e.file ? e.file + " " : ""}${e.msg}`);
    return 0;
  }
  if (sub === "drain_check") {
    const threshold = parseInt(args[1] ?? "10", 10);
    const n = openErrors().length;
    if (n >= threshold) {
      loudFail(`open errors ${n} >= ${threshold}`, { open: n, threshold });
      return 1;
    }
    return 0;
  }
  if (sub === "mark_fixed") {
    const code = args[1];
    if (!code) {
      info("usage: harness errors mark_fixed <code>");
      return 1;
    }
    appendJsonl(LOGS.errors, { source: "manual", kind: "marker", code, file: "", line: 0, msg: "marked fixed", severity: "warn", status: "fixed" });
    return 0;
  }
  info("usage: harness errors {route|list|drain_check|mark_fixed}");
  return 1;
}
