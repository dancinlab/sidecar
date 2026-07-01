// portable-path-guard — advisory (pre write) for a hardcoded absolute HOME path
// in a SHIPPED runtime script. A plugin/hook/CLI script must resolve paths at
// runtime ($HOME · ${CLAUDE_PLUGIN_ROOT} · a PATH binary · a config value), NOT
// bake in a machine-specific `/Users/<you>/…` or `/home/<you>/…` literal — that
// breaks the instant the script runs on another host/user (sidecar ships globally
// to ~/.sidecar/cli and runs across the pool). Ported from the archive
// portable-path-guard; kept ADVISORY (a nudge, not a block) since a `/Users/`
// literal can also legitimately appear in a doc example — the cost of a false
// nudge is one warn line, and a hard block on shipped-path portability would be a
// false-positive factory.
//
// FIRES only when ALL hold: (1) the target is a SHIPPED script — a segment of its
// path is one of hooks/·commands/·skills/·bin/·pi/, (2) its extension is a script
// (.sh·.py·.hexa·.ts·.js·.rb·.pl), (3) the written content contains a `/Users/`
// or `/home/` absolute literal. Config toggle `portablePathGuard` (default on).

import { extname } from "node:path";

// Dirs whose files are SHIPPED and run on other hosts/users (a hardcoded home
// path there is a portability defect). Matched as a path SEGMENT, so both an
// absolute (`…/hooks/run.sh`) and a repo-relative (`hooks/run.sh`) target hit.
const SHIPPED_DIRS = new Set(["hooks", "commands", "skills", "bin", "pi"]);
// Script extensions — a hardcoded path inside these actually executes elsewhere.
const SCRIPT_EXTS = new Set([".sh", ".py", ".hexa", ".ts", ".js", ".rb", ".pl"]);

// The absolute machine-home literals a portable script must never bake in.
const HOME_LITERALS = ["/Users/", "/home/"];

function isShippedScript(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, "/");
  const segs = norm.split("/").filter(Boolean);
  // a shipped dir must be an ANCESTOR segment (not the filename itself).
  const inShippedDir = segs.slice(0, -1).some((s) => SHIPPED_DIRS.has(s));
  return inShippedDir && SCRIPT_EXTS.has(extname(norm));
}

// Return an advisory reason when `content` (the written file / edit fragment)
// hardcodes an absolute home path in a shipped script; null otherwise.
export function detectHardcodedHomePath(filePath: string, content: string): string | null {
  if (!filePath || !content) return null;
  if (!isShippedScript(filePath)) return null;

  let hitPos = -1;
  let hit = "";
  for (const lit of HOME_LITERALS) {
    const p = content.indexOf(lit);
    if (p >= 0 && (hitPos < 0 || p < hitPos)) {
      hitPos = p;
      hit = lit;
    }
  }
  if (hitPos < 0) return null;

  const line = content.slice(0, hitPos).split("\n").length;
  return (
    `${filePath}:${line} hardcodes an absolute home path ('${hit}…') in a SHIPPED runtime script — ` +
    `this breaks the moment the script runs on another host/user (sidecar ships to ~/.sidecar/cli · pool hosts). ` +
    `Resolve the path at runtime instead: $HOME · \${CLAUDE_PLUGIN_ROOT} · a PATH binary · a config value.`
  );
}
