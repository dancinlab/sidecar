// handoff-guard — block scattered handoff markdown on Write/Edit (sidecar
// handoff-guard 0.2.0 parity). Handoffs route through the repo-root handoff.jsonl
// registry (`harness handoff add`), NEVER ad-hoc HANDOFF.md / INBOX.md or
// inbox/*.md scatter. Returns a deny reason, or null when the path is fine.
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
    return `${base} is retired handoff scatter — record it in the repo-root handoff.jsonl instead: \`harness handoff add <text> [--to <repo>]\`.`;
  }
  if (/(^|\/)inbox\//.test(filePath) && filePath.endsWith(".md")) {
    return `inbox/*.md is the retired cross-repo scatter pattern — route the handoff through handoff.jsonl: \`harness handoff add <text> --to <repo>\` (one open-work list per repo, committed).`;
  }
  return null;
}
