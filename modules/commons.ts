// sidecar commons {inject|show} — cross-project governance carrier (the sidecar
// governance SSOT). `inject` emits config/commons.md (or a repo override at
// .harness/commons.md) as additionalContext, re-injected each turn so the
// always-on rules never fade from context. The discrete rules are also
// mechanically enforced by sidecar hooks (root-cause/pre write · verify ·
// bypass · docs · tmp-guard · handoff-guard · git-guard · recommend · askq);
// this is the salient single SSOT, re-injected like recommend.
import { readFileSync } from "node:fs";
import { resolveRuleFile, config } from "../lib/config.ts";
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
    if (!cur) return;
    if (!hasDo && !hasDont) {
      out.push({ rule: "COMMONS-NO-DODONT", file: rel, msg: `section "${cur}" (line ${curLine}) has no do/dont line` });
    } else if (!hasDo || !hasDont) {
      // do/dont 사용 강제 — a rule must carry BOTH a `- do:` and a `- dont:`, not just one.
      out.push({
        rule: "COMMONS-DODONT-INCOMPLETE",
        file: rel,
        msg: `section "${cur}" (line ${curLine}) has only a ${hasDo ? "do" : "dont"} — every rule needs BOTH \`- do:\` and \`- dont:\``,
      });
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

// commit-time entry — reads the resolved commons.md off disk (sidecar lint 4g).
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
  const incomplete = v.filter((x) => x.rule === "COMMONS-DODONT-INCOMPLETE");
  const parts: string[] = [];
  if (prose.length) parts.push(`${prose.length} prose line(s) — e.g. ${prose[0].msg}`);
  if (nodo.length) parts.push(`${nodo.length} section(s) with no do/dont — e.g. ${nodo[0].msg}`);
  if (incomplete.length) parts.push(`${incomplete.length} section(s) missing do or dont — e.g. ${incomplete[0].msg}`);
  return {
    rule: prose.length ? "COMMONS-PROSE" : nodo.length ? "COMMONS-NO-DODONT" : "COMMONS-DODONT-INCOMPLETE",
    block: `commons.md is do/dont-only (slug-keyed rules): every \`## <slug>\` section body = \`- do:\` AND \`- dont:\` lines only (both required · no prose). ${parts.join(" · ")}. 산문은 코드 hook + CHANGELOG/git 으로, commons 엔 do/dont 핵심만.`,
  };
}

// ── do/dont length cap (ported from archive_sidecar tape-lint #2) ────────────
// The always-on governance SSOT re-bloats when a `- do:` / `- dont:` rule grows
// into a multi-clause paragraph (some lines already run 500+ chars). This caps
// each do/dont line and is DIFF-AWARE: legacy long lines are grandfathered (keyed
// by slug|kind|idx vs the baseline), only a NEW or LENGTHENED line blocks — so you
// can edit around the long ones and shrink them, but can't add/grow over the cap.
// Scope: commons.md (bundled config/ or .harness/ override) + CLAUDE.md. cap=0 off.
const DODONT_RE = /^- (do|dont):\s?(.*)$/;
const cpLen = (s: string): number => [...s].length; // codepoints (Korean = 1/char)

type DodontEntry = { slug: string; kind: string; idx: number; content: string; len: number; line: number };
export function dodontEntries(text: string): DodontEntry[] {
  const lines = text.split("\n");
  const out: DodontEntry[] = [];
  let slug = "(preamble)";
  const counter: Record<string, number> = {};
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.startsWith("## ")) {
      slug = ln.slice(3).split("—")[0].trim();
      continue;
    }
    const m = DODONT_RE.exec(ln.trim());
    if (!m) continue;
    const kind = m[1];
    const k = `${slug}|${kind}`;
    const idx = counter[k] ?? 0;
    counter[k] = idx + 1;
    out.push({ slug, kind, idx, content: m[2], len: cpLen(m[2]), line: i + 1 });
  }
  return out;
}

// Diff-aware over-cap detection — faithful to tape-lint #2: a proposed do/dont
// entry with len > cap blocks only when it also exceeds the same-key (slug|kind|idx)
// baseline length (new key → baseline 0 → blocks). Grandfathers legacy; allows shrink.
export function newOverCapDodont(proposed: string, baseline: string, cap: number): string[] {
  if (!cap || cap <= 0) return [];
  const base = new Map<string, number>();
  for (const e of dodontEntries(baseline)) base.set(`${e.slug}|${e.kind}|${e.idx}`, e.len);
  const out: string[] = [];
  for (const e of dodontEntries(proposed)) {
    if (e.len <= cap) continue;
    const bl = base.get(`${e.slug}|${e.kind}|${e.idx}`) ?? 0;
    if (e.len > bl) out.push(`"${e.slug}" ${e.kind} (line ${e.line}): ${e.len} chars > ${cap} cap (was ${bl || "new"})`);
  }
  return out;
}

const dodontCap = (): number => config().lint?.dodontCap ?? 200;

// In scope for the length cap: commons.md (bundled/override) + any CLAUDE.md.
function dodontInScope(filePath: string): boolean {
  if (filePath.endsWith("config/commons.md") || filePath.endsWith(".harness/commons.md")) return true;
  return (filePath.split("/").pop() ?? "") === "CLAUDE.md";
}

// Write-time guard — full-content Write only (an Edit passes new_string, not the
// reconstructed file, so its slug keys would be wrong → leave Edit to the commit
// lint backstop, mirroring commonsWriteViolation). Baseline = the on-disk file.
export function dodontLengthWriteViolation(filePath: string, content: string): { rule: string; block: string } | null {
  if (!content || !dodontInScope(filePath)) return null;
  // a fragment with no do/dont line can't be keyed → skip (commit backstop catches it)
  if (!content.includes("- do:") && !content.includes("- dont:")) return null;
  let baseline = "";
  try {
    baseline = readFileSync(filePath, "utf8");
  } catch {
    /* new file → baseline empty */
  }
  const viols = newOverCapDodont(content, baseline, dodontCap());
  if (!viols.length) return null;
  return {
    rule: "DODONT-LONG",
    block:
      `do/dont 길이 cap (${dodontCap()}자): ${viols.length}개 줄이 새로/더 길어졌다 — commons·CLAUDE 의 각 ` +
      `\`- do:\`/\`- dont:\` 는 한 줄로 짧게, 넘치면 별도 rule 로 쪼개거나 디테일은 코드+CHANGELOG 로. ` +
      `(diff-aware: 기존 긴 줄은 grandfather, 새/더 긴 것만 차단) e.g. ${viols[0]}`,
  };
}

// Commit-time entry (diff-aware vs HEAD) — caller supplies working + HEAD text.
export function dodontLengthLint(working: string, head: string, rel: string): Array<{ rule: string; file: string; msg: string }> {
  return newOverCapDodont(working, head, dodontCap()).map((msg) => ({ rule: "DODONT-LONG", file: rel, msg }));
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
  process.stdout.write("usage: sidecar commons {inject|show}\n");
  return 1;
}
