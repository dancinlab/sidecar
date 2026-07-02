// hypothesis-guard — steer hypothesis/experiment folders to ONE canonical name.
// The recurring anti-pattern: pre-register→falsify→run→verdict science work lands
// in an ad-hoc, per-session, or history-suffixed folder (`UNIVERSE/`,
// `hypotheses_burst_2026_05_12/`, `가설_old/`) so the registry scatters across
// siblings nobody dares merge. The rule: ONE canonical dir (config `hypotheses.dir`,
// default `HYPOTHESES/`), everything else steered back to it.
//
// A folder is flagged as a stray hypothesis dir when its NAME (a path segment) is
// either a built-in hypothesis pattern (`hypotheses`/`hypothesis`/`가설` + a
// history/variant suffix or bare-but-not-canonical) OR a per-repo configured alias
// (`hypotheses.aliases`, e.g. anima's `UNIVERSE`) — and it is not already the
// canonical `dir`. BLOCKS on Write/Edit into such a folder and on Bash
// mkdir/mv creating one. Inline `# hypothesis-ok` overrides a bash hit; a
// `@hypothesis-ok` marker in file content overrides a write hit.
import { basename } from "node:path";
import { config } from "../lib/config.ts";

const CONTENT_ALLOW = /@hypothesis-ok/;
const BASH_ALLOW = /#\s*hypothesis-ok\b/i;

// A bare hypothesis-family stem (canonical when EXACTLY the configured dir, stray
// otherwise) — `hypotheses`, `hypothesis`, `가설`, optionally with a
// history/variant suffix (`hypotheses_burst`, `가설-old`, `hypothesis2`).
const HYP_STEM = /^(hypothes[ei]s|가설)([._\- ].+|\d+)?$/i;

function canonicalDir(): string {
  return config().hypotheses?.dir || "HYPOTHESES";
}
function aliasStems(): string[] {
  return (config().hypotheses?.aliases ?? []).map((a) => a.toLowerCase());
}

// Is this single path SEGMENT a stray (non-canonical) hypothesis-folder name?
// Returns the reason token (the matched pattern) or null.
export function strayHypothesisSegment(seg: string): string | null {
  if (!seg || seg === "." || seg === "/") return null;
  const canon = canonicalDir();
  if (seg === canon) return null; // already canonical — always allowed
  // exact-name alias (case-insensitive) configured for this repo (e.g. UNIVERSE)
  if (aliasStems().includes(seg.toLowerCase())) return `alias '${seg}'`;
  // built-in hypothesis-name pattern (any casing) that isn't the canonical dir
  if (HYP_STEM.test(seg)) return `hypothesis-named folder '${seg}'`;
  return null;
}

function message(offender: string, reason: string): string {
  const canon = canonicalDir();
  return (
    `'${offender}' is a stray hypothesis folder (${reason}) — hypotheses live in ONE canonical dir '${canon}/' ` +
    `(pre-register→falsify→run→verdict). Put the registry/cards under '${canon}/', or rename this dir: ` +
    `\`sidecar hypotheses migrate ${offender}\`. Intentional exception → add a '@hypothesis-ok' marker in the file ` +
    `(or '# hypothesis-ok' on a bash command).`
  );
}

// Write/Edit into a stray hypothesis folder → the offending path. Scans every
// path segment (so `UNIVERSE/cards/h1.md` is caught at `UNIVERSE`). Returns a
// message or null.
export function detectStrayHypothesisWrite(filePath: string, content = ""): string | null {
  if (CONTENT_ALLOW.test(content)) return null;
  for (const seg of filePath.split("/")) {
    const reason = strayHypothesisSegment(seg);
    if (reason) return message(seg, reason);
  }
  return null;
}

// Bash mkdir/mv/cp creating a stray hypothesis folder. Only the DESTINATION name
// matters (so `mv UNIVERSE HYPOTHESES` — renaming AWAY — is allowed: HYPOTHESES is
// canonical). Returns { offender, reason } or null.
export function detectStrayHypothesisBash(rawCmd: string): { offender: string; reason: string } | null {
  if (BASH_ALLOW.test(rawCmd)) return null;
  // split on shell separators; check each simple command
  for (const seg of rawCmd.split(/&&|\|\||;|\n/)) {
    const toks = seg.trim().split(/\s+/).filter((t) => t && !t.startsWith("-"));
    if (toks.length < 2) continue;
    const cmd = basename(toks[0]);
    let targets: string[] = [];
    if (cmd === "mkdir") targets = toks.slice(1); // every arg (and each is a new dir tree)
    else if (cmd === "mv" || cmd === "cp" || cmd === "ln" || cmd === "rename") targets = [toks[toks.length - 1]]; // dest only
    else continue;
    for (const t of targets) {
      // check each segment of the destination path (mkdir -p a/가설_x/b caught at 가설_x)
      for (const s of t.replace(/\/+$/, "").split("/")) {
        const reason = strayHypothesisSegment(s);
        if (reason) return { offender: s, reason };
      }
    }
  }
  return null;
}
