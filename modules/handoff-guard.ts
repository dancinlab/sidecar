// handoff-guard — block scattered hand-off markdown on Write/Edit. Cross-session
// hand-offs route through the repo-root ING.jsonl board (`sidecar ing add <text>`),
// NEVER ad-hoc HANDOFF.md / INBOX.md or inbox/*.md scatter. Returns a deny reason,
// or null when the path is fine. (Cross-repo forwarding was retired — defects are
// fixed in-session per commons `upstream-fix`, not handed to another repo's board.)
//
//   (a) file_path contains `/inbox/` at ANY depth AND ends in `.md`
//       (the retired inbox-markdown scatter — inbox/patches/*.md, deep nests),
//   (b) basename is HANDOFF.md or INBOX.md.
// The `.md`-scope on the inbox match is the deliberate false-positive guard: a
// legit app's inbox/queue.json / inbox/handler.py is NOT blocked.
import { basename } from "node:path";

export function detectHandoffScatter(filePath: string): string | null {
  const base = basename(filePath);
  if (base === "HANDOFF.md" || base === "INBOX.md") {
    return `${base} is retired hand-off scatter — record it on the repo-root ING.jsonl instead: \`sidecar ing add <text>\`.`;
  }
  if (/(^|\/)inbox\//.test(filePath) && filePath.endsWith(".md")) {
    return `inbox/*.md is the retired scatter pattern — route it through ING.jsonl: \`sidecar ing add <text>\`.`;
  }
  return null;
}
