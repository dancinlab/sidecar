import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "./paths.ts";
import { config } from "./config.ts";

// L0 (lockdown) file list = explicit config.lockdown.files
//   + (optionally) paths parsed from a "🔴 L0" block in a markdown guide.
// Editing an L0 file is allowed but flagged, so the agent treats it deliberately.

let _cache: string[] | null = null;

export function l0Files(): string[] {
  if (_cache) return _cache;
  const cfg = config();
  const list: string[] = [...(cfg.lockdown.files ?? [])];

  if (cfg.lockdown.fromMarkdown) {
    const md = resolve(REPO_ROOT, cfg.lockdown.fromMarkdown);
    if (existsSync(md)) {
      const text = readFileSync(md, "utf8");
      // grab each "🔴 L0 ... " block up to the next 🟡 / fence / end
      const blocks = [...text.matchAll(/🔴\s*L0[\s\S]*?(?=🟡|```|$)/g)];
      // path-like tokens: src/… scripts/… lib/… app/… (engine/source files only).
      // CLAUDE.md is NOT L0 — it's the guide that DECLARES the L0 list (and is
      // re-injected each turn), so it must never be captured as an L0 entry itself.
      const re =
        /\b((?:src|scripts|lib|app|packages|cli|modules|crates|cmd|internal|pkg|sources|core)\/[^\s—|]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|rb|php|go|rs|java|kt|kts|scala|c|h|cpp|cc|cxx|hpp|m|mm|swift|dart|hexa|sh))\s*(?:—|\||$)/gim;
      for (const b of blocks) {
        let m: RegExpExecArray | null;
        re.lastIndex = 0;
        while ((m = re.exec(b[0]))) {
          if (!list.includes(m[1])) list.push(m[1]);
        }
      }
    }
  }

  _cache = list;
  return _cache;
}

export function isL0(path: string): boolean {
  return l0Files().some((p) => path === p || path.endsWith("/" + p));
}
