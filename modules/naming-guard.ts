// naming-guard — steer file/dir names toward canonical native naming and away from
// version/copy suffixes. The recurring anti-pattern: `model_v2.py`, `report_final.md`,
// `index_new.ts`, `utils_old.ts`, `config copy.json`, `parser_fix.rs` — each one bakes
// HISTORY into the filename, which is exactly git's job. The result is a pile of stale
// siblings nobody dares delete. The rule: ONE canonical file, updated in place; the old
// versions live in git history (and `git log`/`git blame` recover them). BLOCKS — both on
// Write/Edit (`detectVersionedName`) and on Bash file-creation/rename (mv/cp/touch/mkdir,
// `detectVersionedNameBash`). A genuinely API-versioned name keeps going via the marker.
//
// @convergence state=ossified id=NAMING_VERSION_SUFFIX value="new files/dirs named foo_v2/_final/_copy/_old (via Write/Edit OR a mv/cp/touch/mkdir bash command) are BLOCKED — history belongs in git, not the filename; the `@canonical-ok` (write) / `# canonical-ok` (bash) marker is the only override" threshold="warn-only proved too weak — the stale-sibling pileup kept recurring, so the user escalated it to a hard block + added bash-command coverage (a CLI `mv a a_v2.ts` previously slipped past the Write-only guard)"

import { basename, extname, dirname } from "node:path";

// suffix tokens that mark a name as a version/copy/scratch sibling rather than canonical.
// matched only at the END of the name stem (so `final_report` is fine, `report_final` warns).
// NOTE: deliberately excludes `test`/`spec` — `_test.go`·`_test.py`·`.spec.ts` are
// CANONICAL test naming, not version suffixes (flagging them would warn on every edit).
const SUFFIX = /[ _-](v\d+|version\d*|ver\d+|rev\d+|final\d*|copy\d*|new|old|orig|original|prev|previous|bak|backup|draft\d*|fixed|fix|wip|temp|tmp)$/i;
// macOS / download duplicate markers: "foo 2.ts", "foo(1).ts", "foo - copy.ts"
const DUP = /( \d+|\(\d+\)|[ _-]copy)$/i;
// an explicit opt-out: a name carrying this marker is intentional (e.g. real API versioning)
const ALLOW = /@canonical-ok/;

function offendingToken(name: string): string | null {
  if (!name) return null;
  const ext = extname(name);
  const stem = ext ? name.slice(0, -ext.length) : name;
  if (!stem) return null;
  const hit = stem.match(SUFFIX) || stem.match(DUP);
  return hit ? hit[0].replace(/^[ _-]/, "") : null;
}

export function detectVersionedName(filePath: string, content = ""): string | null {
  if (ALLOW.test(content)) return null;
  const base = basename(filePath);
  // check the file name AND its immediate parent dir (the folder most likely created
  // alongside this write) — catches both `model_v2.py` and `model_v2/config.json`.
  const parent = basename(dirname(filePath));
  const fileToken = offendingToken(base);
  const dirToken = parent && parent !== "." && parent !== "/" ? offendingToken(parent) : null;
  if (!fileToken && !dirToken) return null;

  const offender = fileToken ? base : parent;
  const token = fileToken || dirToken;
  const kind = fileToken ? "filename" : "folder name";
  return (
    `'${offender}' (${kind}) carries a version/copy suffix ('${token}') — bake history into git, not the name. ` +
    `Use ONE canonical native name and update it in place (old versions stay recoverable via git log/blame). ` +
    `If this name is genuinely intentional (e.g. real public API versioning), add a '@canonical-ok' marker in the file.`
  );
}

// inline escape for a bash command (mirrors the danger-guard `# ...-ok` convention)
const CANONICAL_OK = /#\s*canonical-ok\b/i;
// file-creating / renaming commands. mv/cp/ln/rename → only the DESTINATION (last
// non-flag arg) is a NEW name, so `mv foo_v2.ts foo.ts` (renaming AWAY from a bad
// name) is allowed. touch → every arg is created. mkdir → every path SEGMENT of
// every arg is created (so `mkdir -p a/model_v2/b` is caught at `model_v2`).
const DEST_LAST = new Set(["mv", "cp", "ln", "rename"]);
const TOUCH = new Set(["touch"]);
const MKDIR = new Set(["mkdir"]);

// Bash file-creation/rename into a versioned/copy name — the CLI sibling of the
// Write/Edit naming guard. Returns the offending {offender, token}, or null.
export function detectVersionedNameBash(rawCmd: string): { offender: string; token: string } | null {
  if (CANONICAL_OK.test(rawCmd)) return null;
  for (const seg of rawCmd.split(/[\n;|&()]+/)) {
    let toks = seg.trim().split(/\s+/).filter(Boolean);
    if (toks[0] === "sudo") toks = toks.slice(1);
    if (toks[0] === "git" && toks[1] === "mv") toks = toks.slice(1); // `git mv` → like mv
    const head = toks[0] ?? "";
    const args = toks.slice(1).filter((t) => !t.startsWith("-")); // drop flags
    if (!head || args.length === 0) continue;

    // collect the path tokens this command CREATES (not its sources)
    let created: string[] = [];
    if (DEST_LAST.has(head)) created = args.length >= 2 ? [args[args.length - 1]] : [];
    else if (TOUCH.has(head)) created = args;
    else if (MKDIR.has(head)) created = args;
    else continue;

    for (const path of created) {
      const clean = path.replace(/\/+$/, "");
      // mkdir creates every segment; for a move/copy dest or touch, only the new
      // basename is novel (the parent dir already exists), so check just that.
      const parts = MKDIR.has(head) ? clean.split("/") : [basename(clean)];
      for (const part of parts) {
        const token = offendingToken(part);
        if (token) return { offender: part, token };
      }
    }
  }
  return null;
}
