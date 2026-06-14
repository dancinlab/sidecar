// harness prompt <text> — scan a user prompt for trigger keywords and surface
// the recommended playbook / hint / tool for each match. Mirrors the project's
// CLAUDE.md / AGENTS.md triggers so the agent doesn't have to remember them.
//
// Wired as a UserPromptSubmit hook delegate, the output is injected back to the
// agent as additional context.
import { readJson } from "../lib/json.ts";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl, info } from "../lib/log.ts";
import { config, resolveRuleFile } from "../lib/config.ts";
import { matchPromptHints } from "./pre.ts";
import { strandedWorktrees } from "./worktree.ts";

interface KeywordRule {
  id: string;
  patterns: string[];
  playbook?: string;
  hint?: string;
  rule?: string;
  warn?: string;
  tool?: string;
  steps?: string[];
  required_inputs?: string[];
  post?: string;
}

interface KeywordsConfig {
  rules?: KeywordRule[];
}

export interface PromptMatch {
  id: string;
  matched: string;
  rule: KeywordRule;
}

export function scanPrompt(text: string): PromptMatch[] {
  const file = resolveRuleFile(config().keywordsFile, "keywords.json");
  let cfg: KeywordsConfig = {};
  try {
    cfg = readJson<KeywordsConfig>(file);
  } catch {
    return [];
  }
  const matches: PromptMatch[] = [];
  const t = text.trim();
  for (const rule of cfg.rules ?? []) {
    for (const pat of rule.patterns) {
      const isRegex = pat.endsWith("$") || pat.startsWith("^") || /[\\|()[\]]/.test(pat);
      const hit = isRegex ? safeRegexTest(pat, t) : t.includes(pat);
      if (hit) {
        matches.push({ id: rule.id, matched: pat, rule });
        break;
      }
    }
  }
  return matches;
}

function safeRegexTest(pat: string, text: string): boolean {
  try {
    return new RegExp(pat, "i").test(text);
  } catch {
    return text.includes(pat);
  }
}

export async function runPromptScan(args: string[]): Promise<number> {
  const text = args.join(" ");
  if (!text) {
    info("usage: harness prompt <user_text>");
    return 0;
  }
  const matches = scanPrompt(text);
  const hints = matchPromptHints(text);
  // Principle: no new work while prior work is abandoned in a worktree.
  const stranded = await strandedWorktrees().catch(() => []);
  appendJsonl(LOGS.observations, {
    kind: "prompt_scan",
    text_len: text.length,
    matches: matches.map((m) => ({ id: m.id, pat: m.matched })),
    hints: hints.map((h) => h.id),
    stranded: stranded.length,
  });
  if (matches.length === 0 && hints.length === 0 && stranded.length === 0) return 0;

  const lines: string[] = [];
  if (stranded.length) {
    lines.push(`⚠ ${stranded.length} stranded worktree(s) — 방치된 작업을 먼저 완료(harness pr-cycle)/정리한 뒤 새 작업을 시작하세요:`);
    for (const w of stranded) lines.push(`  • ${w.path} [${w.branch}] ${w.dirty ? "dirty " : ""}${w.ahead ? "unpushed:" + w.ahead : ""}`);
  }
  if (matches.length) lines.push(`▶ harness prompt-scan: ${matches.length} keyword match(es)`);
  for (const m of matches) {
    lines.push(`  • ${m.id}  (← "${m.matched}")`);
    if (m.rule.playbook) lines.push(`    playbook: ${m.rule.playbook}`);
    if (m.rule.hint) lines.push(`    hint:     ${m.rule.hint}`);
    if (m.rule.rule) lines.push(`    rule:     ${m.rule.rule}`);
    if (m.rule.warn) lines.push(`    ⚠ warn:   ${m.rule.warn}`);
    if (m.rule.tool) lines.push(`    tool:     ${m.rule.tool}`);
    if (m.rule.required_inputs) lines.push(`    inputs:   ${m.rule.required_inputs.join(", ")}`);
    if (m.rule.steps) {
      lines.push(`    steps:`);
      m.rule.steps.forEach((s, i) => lines.push(`      ${i + 1}. ${s}`));
    }
    if (m.rule.post) lines.push(`    post:     ${m.rule.post}`);
  }
  if (hints.length) {
    lines.push(`▶ enforcement prompt-hints: ${hints.length}`);
    for (const h of hints) lines.push(`  • ${h.id}: ${h.hint}`);
  }
  process.stderr.write(lines.join("\n") + "\n");
  return 0;
}
