// tmp-guard — warn when progress/working data is written to a volatile tmp
// location instead of a git-tracked, committed path. Volatile data (/tmp,
// /private/tmp, /var/folders, $TMPDIR) is discarded on reboot / by the macOS
// reaper, so anything worth keeping is lost. Steer it to docs.scratchDir (or
// another tracked dir) and commit it, so progress is preserved on GitHub.
// Warn-only (never blocks) — genuinely ephemeral scratch is still allowed.

function tmpRoots(): string[] {
  const roots = ["/tmp/", "/private/tmp/", "/var/folders/"];
  const t = process.env.TMPDIR;
  if (t) roots.push(t.endsWith("/") ? t : t + "/");
  return roots;
}

// a Write/Edit target path that lands in a volatile tmp location
export function isTmpPath(filePath: string): boolean {
  return tmpRoots().some((r) => filePath.startsWith(r));
}

// a bash command that WRITES output into a volatile tmp location:
// redirects (`> /tmp/x`, `>> /tmp/x`), tee, and common output flags (-o, -O,
// --output, --out-dir). Read-only references to /tmp are NOT flagged.
export function detectTmpBashWrite(cmd: string): string | null {
  for (const root of tmpRoots()) {
    const r = root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(>>?|\\btee\\b(\\s+-a)?|-o|-O|--output(-dir)?=?|--out-dir=?)\\s*['"]?${r}`);
    if (re.test(cmd)) return root.replace(/\/$/, "");
  }
  return null;
}
