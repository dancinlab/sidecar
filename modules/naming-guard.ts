// naming-guard — steer file/dir names toward canonical native naming and away from
// version/copy suffixes. The recurring anti-pattern: `model_v2.py`, `report_final.md`,
// `index_new.ts`, `utils_old.ts`, `config copy.json`, `parser_fix.rs` — each one bakes
// HISTORY into the filename, which is exactly git's job. The result is a pile of stale
// siblings nobody dares delete. The rule: ONE canonical file, updated in place; the old
// versions live in git history (and `git log`/`git blame` recover them). Warn-only — this
// guides, it never blocks (a genuinely API-versioned name can keep going via the marker).
//
// @convergence state=stable id=NAMING_VERSION_SUFFIX value="new files named foo_v2/_final/_copy/_old bake history into the filename instead of git → stale-sibling pileup" threshold="re-add as block-level if warn-only proves too weak to stop the pileup"

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
