// harness gc [scan|drift]
// Detect rot: markdown guides (CLAUDE.md etc.) that link to files which no
// longer exist. Report only — never auto-deletes (H2).
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl, info, warn } from "../lib/log.ts";
import { config, repoPath } from "../lib/config.ts";

interface Drift {
  source: string;
  ref: string;
  msg: string;
}

function scanGuide(rel: string): Drift[] {
  const abs = repoPath(rel);
  if (!existsSync(abs)) return [];
  const text = readFileSync(abs, "utf8");
  const out: Drift[] = [];
  const re = /\[[^\]]+\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const ref = m[1].split("#")[0].trim();
    if (!ref || /^(https?:|mailto:|#)/.test(ref)) continue;
    const target = ref.startsWith("/") ? repoPath(ref.slice(1)) : resolve(dirname(abs), ref);
    if (!existsSync(target)) out.push({ source: rel, ref, msg: "linked file not found" });
  }
  return out;
}

export async function runGc(args: string[]): Promise<number> {
  const sub = args[0] ?? "scan";
  if (sub !== "scan" && sub !== "drift") {
    info("usage: harness gc [scan|drift]");
    return 1;
  }
  const drifts: Drift[] = [];
  for (const g of config().guides ?? []) drifts.push(...scanGuide(g));

  appendJsonl(LOGS.gc, { kind: "gc", sub, violations: drifts.length, items: drifts.slice(0, 50) });
  if (drifts.length === 0) {
    info("gc: no drift");
    return 0;
  }
  warn(`gc: ${drifts.length} broken reference(s)`);
  for (const d of drifts) info(`  ${d.source} → ${d.ref}  (${d.msg})`);
  return 0;
}
