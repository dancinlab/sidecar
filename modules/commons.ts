// harness commons {inject|show} — cross-project governance carrier (the harness
// governance SSOT). `inject` emits config/commons.md (or a repo override at
// .harness/commons.md) as additionalContext, re-injected each turn so the
// always-on rules never fade from context. The discrete rules are also
// mechanically enforced by harness hooks (root-cause/pre write · verify ·
// bypass · docs · tmp-guard · handoff-guard · git-guard · recommend · askq);
// this is the salient single SSOT, re-injected like recommend.
import { readFileSync } from "node:fs";
import { resolveRuleFile } from "../lib/config.ts";
import { readStdin } from "../lib/exec.ts";

function body(): string {
  const f = resolveRuleFile(".harness/commons.md", "commons.md");
  try {
    return readFileSync(f, "utf8");
  } catch {
    return "";
  }
}

// commons do/dont format lint — each `## <slug> — <title>` section body must be
// `- do:` / `- dont:` lines only (blank + indented continuations ok), so the
// always-on governance SSOT can't silently re-bloat into prose. Preamble before
// the first `## ` (file header + blockquote note) is exempt. The mechanism that
// makes a rule enforceable lives in code; this block carries only the do/dont.
// Core: check raw text (used both by the commit-time lint AND the write-time
// pre-write guard, so a malformed edit is denied the moment it's written —
// not just at commit · sidecar-style).
export function lintCommonsText(text: string, rel: string): Array<{ rule: string; file: string; msg: string }> {
  const lines = text.split("\n");
  const out: Array<{ rule: string; file: string; msg: string }> = [];
  let cur: string | null = null; // current section slug (null = preamble)
  let curLine = 0;
  let hasDo = false;
  let hasDont = false;
  const flush = () => {
    if (cur && !hasDo && !hasDont) {
      out.push({ rule: "COMMONS-NO-DODONT", file: rel, msg: `section "${cur}" (line ${curLine}) has no do/dont line` });
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.startsWith("## ")) {
      flush();
      cur = ln.slice(3).split("—")[0].trim();
      curLine = i + 1;
      hasDo = false;
      hasDont = false;
      continue;
    }
    if (cur === null) continue; // preamble before first section — exempt
    const t = ln.trim();
    if (t === "") continue; // blank line ok
    if (t.startsWith("- do:")) { hasDo = true; continue; }
    if (t.startsWith("- dont:")) { hasDont = true; continue; }
    if (ln.startsWith("  ")) continue; // indented continuation of a do/dont line
    out.push({ rule: "COMMONS-PROSE", file: rel, msg: `section "${cur}" (line ${i + 1}): prose line — commons rules are do/dont only: "${t.slice(0, 50)}"` });
  }
  flush();
  return out;
}

// commit-time entry — reads the resolved commons.md off disk (harness lint 4g).
export function lintCommonsFormat(): Array<{ rule: string; file: string; msg: string }> {
  const f = resolveRuleFile(".harness/commons.md", "commons.md");
  let text: string;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    return [];
  }
  const rel = f.includes(".harness/") ? ".harness/commons.md" : "config/commons.md";
  return lintCommonsText(text, rel);
}

// write-time guard (sidecar-style) — when a commons.md (bundled config/ or a
// repo .harness/ override) is written via Write (full content) the do/dont
// format is validated BEFORE it lands, so a prose edit is hard-DENIED at the
// edit, not just at commit. Returns a block payload or null. Edit (new_string-
// only fragments) is left to the commit-time lint 4g backstop (no full-file
// context to validate a fragment against). Mirrors descWriteViolation.
export function commonsWriteViolation(filePath: string, content: string): { rule: string; block: string } | null {
  if (!content) return null;
  const isBundled = filePath.endsWith("config/commons.md");
  const isOverride = filePath.endsWith(".harness/commons.md");
  if (!isBundled && !isOverride) return null;
  // a full-document write has the preamble + ## sections; a tiny fragment with no
  // `## ` header would be all-preamble (exempt) → only validate real documents.
  if (!content.includes("## ")) return null;
  const rel = isOverride ? ".harness/commons.md" : "config/commons.md";
  const v = lintCommonsText(content, rel);
  if (!v.length) return null;
  const prose = v.filter((x) => x.rule === "COMMONS-PROSE");
  const nodo = v.filter((x) => x.rule === "COMMONS-NO-DODONT");
  const parts: string[] = [];
  if (prose.length) parts.push(`${prose.length} prose line(s) — e.g. ${prose[0].msg}`);
  if (nodo.length) parts.push(`${nodo.length} section(s) with no do/dont — e.g. ${nodo[0].msg}`);
  return {
    rule: prose.length ? "COMMONS-PROSE" : "COMMONS-NO-DODONT",
    block: `commons.md is do/dont-only (slug-keyed rules): every \`## <slug>\` section body = \`- do:\` / \`- dont:\` lines only, no prose paragraphs. ${parts.join(" · ")}. 산문은 코드 hook + CHANGELOG/git 으로, commons 엔 do/dont 핵심만.`,
  };
}

export async function runCommons(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  const text = body();
  if (sub === "show") {
    process.stdout.write(text);
    return 0;
  }
  if (sub === "inject") {
    if (!text) return 0;
    try {
      const j = JSON.parse(readStdin());
      const ev = String(j.hook_event_name ?? j.hookEventName ?? "");
      if (!ev) return 0;
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: text } }) + "\n");
    } catch {
      return 0;
    }
    return 0;
  }
  process.stdout.write("usage: harness commons {inject|show}\n");
  return 1;
}
