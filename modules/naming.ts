// sidecar naming {audit [path] [--ing] [--gate]} — repo-wide non-canonical name auditor.
// The write-time naming-guard BLOCKS a NEW bad name (foo_v2.ts) at Write/Edit/bash, but it
// never sees the BACKLOG — the version/copy/dup-suffixed names already committed before the
// guard existed (or imported from elsewhere). This audits the whole tracked tree for that
// backlog so the canonical-naming rule is actually enforced across a repo, not just on new
// writes. Read-only report by default (canonical-naming · canonical-cli).
//   --ing   append a one-line summary to THIS repo's ING board (boards are my-repo only —
//           no cross-repo forwarding; each repo's audit lands on its OWN board).
//   --gate  exit 1 when any non-canonical name is found (commit/CI gate); default exit 0.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { offendingToken } from "./naming-guard.ts";
import { info, ok, warn } from "../lib/log.ts";
import { runIng } from "./ing.ts";

// tracked paths only (git ls-files) — never walks node_modules/build/.git, and audits
// exactly what the repo actually ships (canonical naming is about committed names).
function trackedPaths(cwd: string): string[] {
  try {
    return execFileSync("git", ["ls-files"], { cwd, encoding: "utf8", timeout: 30_000 })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export interface NamingHit {
  path: string; // full path of the offending segment (file or dir)
  offender: string; // the offending name segment itself
  token: string; // the non-canonical token (e.g. "v2", "copy", "old")
  kind: "file" | "dir";
}

// Trees where history-in-name is intentional (frozen snapshots) or transient, so a
// version/copy suffix there is NOT naming debt: `archive/` = deliberately frozen
// history · `.verdicts/` = transient verdict logs (preserve-state migrates these to
// state/ separately). Skipped wholesale from the audit.
const IGNORE_PATH = /(^|\/)(archive|\.verdicts)\//;

// Audit a list of repo-relative paths. Each path's file basename AND every directory
// segment is checked once (a bad dir is reported once, not per file under it).
export function auditNames(paths: string[]): NamingHit[] {
  const hits: NamingHit[] = [];
  const seenDir = new Set<string>();
  for (const p of paths) {
    if (IGNORE_PATH.test(p)) continue;
    const segs = p.split("/").filter(Boolean);
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const isFile = i === segs.length - 1;
      const key = segs.slice(0, i + 1).join("/");
      if (!isFile) {
        if (seenDir.has(key)) continue;
        seenDir.add(key);
      }
      const token = offendingToken(seg);
      if (token) hits.push({ path: key, offender: seg, token, kind: isFile ? "file" : "dir" });
    }
  }
  return hits;
}

export async function runNaming(args: string[]): Promise<number> {
  const sub = args[0] ?? "audit";
  if (sub !== "audit") {
    info("usage: sidecar naming audit [path] [--ing] [--gate]");
    return 1;
  }
  const wantIng = args.includes("--ing");
  const wantGate = args.includes("--gate");
  const pathArg = args.slice(1).find((a) => !a.startsWith("-"));
  const cwd = pathArg ? resolve(pathArg) : process.cwd();

  const paths = trackedPaths(cwd);
  if (!paths.length) {
    info(`naming audit: no tracked files at ${cwd} (git repo?)`);
    return 0;
  }
  const hits = auditNames(paths);

  if (!hits.length) {
    ok(`naming audit: ${paths.length} tracked names — all canonical (no version/copy/dup suffix)`);
    return 0;
  }

  info(`naming audit: ${hits.length} non-canonical name(s) of ${paths.length} tracked — bake history into git, not the name (canonical-naming):`);
  for (const h of hits) info(`  • ${h.path} (${h.kind}) — '${h.token}' suffix`);

  if (wantIng) {
    const top = hits.slice(0, 3).map((h) => h.offender).join(", ");
    const more = hits.length > 3 ? ` +${hits.length - 3}` : "";
    await runIng(["add", `🔤 naming audit: ${hits.length} non-canonical 이름 — ${top}${more} (canonical-naming · git-rename in place)`]);
  }

  if (wantGate) {
    warn(`naming audit: ${hits.length} violation(s) — gate failed`);
    return 1;
  }
  return 0;
}
