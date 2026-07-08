// sidecar prompt <text> — scan a user prompt for trigger keywords and surface
// the recommended playbook / hint / tool for each match. Mirrors the project's
// CLAUDE.md / AGENTS.md triggers so the agent doesn't have to remember them.
//
// Wired as a UserPromptSubmit hook delegate. The stranded-worktree block is injected
// back to the agent as additionalContext (stdout, via emitInject — the gate-adjacent
// "no new work over abandoned work" signal MUST reach context); the keyword/hint
// playbook surfacing stays on stderr (user-facing, kept out of context to avoid
// per-turn inject bloat).
import { readJson } from "../lib/json.ts";
import { LOGS } from "../lib/paths.ts";
import { appendJsonl, info } from "../lib/log.ts";
import { config, resolveRuleFile } from "../lib/config.ts";
import { matchPromptHints } from "./pre.ts";
import { strandedWorktrees } from "./worktree.ts";
import { emitInject } from "../lib/inject.ts";

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
  // capture-token enforcement (c1): when set, a match EMITS a ⟦<capture> id=…⟧ token
  // and records a debt that the Stop hook nags about until resolved (e.g. a marker write).
  capture?: string;
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
    info("usage: sidecar prompt <user_text>");
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

  // Stranded worktrees are a GATE-adjacent signal (no new work while prior work is
  // abandoned) — it MUST reach the agent's context, not just the user's terminal.
  // Route it through emitInject (stdout additionalContext, the Claude Code protocol),
  // NOT stderr — a UserPromptSubmit hook's stderr never becomes context, so the block
  // built below was invisible despite this file's header claiming otherwise (the fix).
  // Self-limiting: 0 stranded → 0 bytes emitted, so a clean session pays no per-turn cost.
  if (stranded.length) {
    const s: string[] = [];
    s.push(`⚠ ${stranded.length} stranded worktree(s) — 이전 세션의 방치 작업. 새 작업 시작 전 항목별 처리 결정(이어서 완료/보존/폐기):`);
    for (const w of stranded) {
      const state = `${w.dirty ? "dirty " : ""}${w.ahead ? "unpushed:" + w.ahead : ""}`.trim();
      s.push(`  • ${w.path} [${w.branch}] ${state}  → 이어서: \`cd ${w.path} && sidecar pr-cycle\``);
    }
    emitInject("prompt-scan-stranded", "UserPromptSubmit", s.join("\n"));
  }

  // Keyword/hint playbook surfacing stays on stderr (user-facing, per-turn — kept OUT
  // of context to avoid per-turn inject bloat / context-rot on every keyworded prompt).
  const lines: string[] = [];
  if (matches.length) lines.push(`▶ sidecar prompt-scan: ${matches.length} keyword match(es)`);
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
  if (lines.length) process.stderr.write(lines.join("\n") + "\n");
  return 0;
}
