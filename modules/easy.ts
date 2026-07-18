// sidecar easy {show|inject|scaffold|lint}
// Auto-inject the "easy" (friendly) response style.
// `inject` reads styles/easy.<lang>.md for the prefs response language. Two-tier by event:
//   · UserPromptSubmit → the LEAN per-turn directive (the <!-- easy:lean --> region only) —
//     cheap, every turn, keeps the 7-element pattern active without re-dumping the sample.
//   · SessionStart/PreCompact/PostCompact → the FULL canonical reference once (cached prefix,
//     survives compaction). `show` also prints the full body on demand.
// Files lacking the marker fall back to full (back-compat). The NL substrings 설명 / 쉽게
// prepend an activation banner.
// `scaffold "<q>"` emits the empty 7-element round skeleton (deterministic) for an
// LLM to fill — the backbone /sbs chat-form rounds wrap. `lint <file|->` scores a
// rendered round on the styles' measurement axes (advisory · always exit 0 · no LLM).
import { existsSync, readFileSync } from "node:fs";
import { emitInject } from "../lib/inject.ts";
import { resolve } from "node:path";
import { SIDECAR_ROOT } from "../lib/paths.ts";
import { info } from "../lib/log.ts";
import { readStdin } from "../lib/exec.ts";
import { loadPrefs } from "./prefs.ts";

const STYLES_DIR = resolve(SIDECAR_ROOT, "styles");

// prefs response language → style file code (easy.md is the English base)
function langCode(response: string): string {
  const r = response.toLowerCase();
  if (r.startsWith("ko")) return "ko";
  if (r.startsWith("ja")) return "ja";
  if (r.startsWith("zh") || r.startsWith("chin")) return "zh";
  if (r.startsWith("ru")) return "ru";
  return ""; // english base → easy.md
}

function styleFile(): string {
  const code = langCode(loadPrefs().response);
  const primary = code ? resolve(STYLES_DIR, `easy.${code}.md`) : "";
  const fallback = resolve(STYLES_DIR, "easy.md");
  if (primary && existsSync(primary)) return primary;
  return fallback;
}

function header(src: string, banner: string, tier: "lean" | "full"): string {
  const lead =
    tier === "lean"
      ? "Top priority (Tier-1, default): a first-use plain-language gloss of EVERY jargon/acronym/hyphenated term " +
        "in user-facing prose is MANDATORY — `term(=plain meaning)`. Use the full 7-element pattern (icon · name · " +
        "alias · plain-line · analogy · ASCII · compare) only as Tier-2, when a new concept/tool is itself the " +
        "subject. See the per-turn directive below. Full reference (before→after · gold examples · templates · " +
        "checklist) is injected once at SessionStart/Compact and on-demand via `sidecar easy show`."
      : "The full easy-style canonical reference below is injected ONCE this session (cached prefix · survives " +
        "compaction). The per-turn directive rides UserPromptSubmit. Top rule: gloss every jargon term at first " +
        "use (Tier-1 · default); the 7-element pattern is Tier-2, only for introducing a new concept/tool.";
  return (
    banner +
    `# response style: easy (auto-injected by sidecar easy · ${src})\n\n` +
    lead +
    "\n\n---\n\n"
  );
}

// The per-turn slice = the <!-- easy:lean --> … <!-- /easy:lean --> region of the
// canonical file. UserPromptSubmit emits only this lean directive (cheap, every turn);
// SessionStart/Compact emit the FULL body once (cached prefix). NOT runtime truncation —
// the full content is still delivered, just on the session-scope surface (ARCHITECTURE
// inject-strategy: static reference = SessionStart/Compact once, behavioral rule = per-turn).
const LEAN_RE = /<!--\s*easy:lean\s*-->([\s\S]*?)<!--\s*\/easy:lean\s*-->/;
function extractLean(body: string): string | null {
  const m = body.match(LEAN_RE);
  return m ? m[1].trim() : null;
}

function nlTrigger(prompt: string): boolean {
  return prompt.includes("설명") || prompt.includes("쉽게");
}

function readPayload(): { event: string; prompt: string } {
  try {
    const j = JSON.parse(readStdin());
    const event = String(j.hook_event_name ?? j.hookEventName ?? "");
    const prompt = typeof j.prompt === "string" ? j.prompt : typeof j.userPrompt === "string" ? j.userPrompt : "";
    return { event, prompt };
  } catch {
    return { event: "", prompt: "" };
  }
}

// ── scaffold: emit the empty 7-element round skeleton (deterministic backbone) ──
// /sbs chat-form rounds wrap this instead of hand-rolling the slots; the LLM only
// fills the creative slots, the skeleton + closing line stay code-owned.
function scaffold(question: string): string {
  const q = question.trim() || "<라운드 질문>";
  return [
    `🧩 ${q}`,
    "",
    "1. 아이콘: ",
    "2. 이름 / 별칭: ",
    "3. 하는 일: ",
    "4. 비유: ",
    "5. ASCII (4종 중 하나 골라 채움 — 전후 / 트리 / 나란히 / 구조):",
    "```",
    "",
    "```",
    "6. 비교 표:",
    "",
    "| 옵션 | <축> | <축> |",
    "|---|---|---|",
    "| A |  |  |",
    "| B |  |  |",
    "",
    "7. 추천: 나라면 <X> — <이유>",
    "",
    "→ A · B · 또는 자유응답 (예: \"다른 안: …\")",
    "",
  ].join("\n");
}

// ── lint: advisory per-axis score against the styles' 측정 축 (no LLM · exit 0) ──
const JARGON_RE = /(`[^`]+`|[A-Z]{2,}|[σ∑∂μΣΘΩλβαγδ√∞≈≤≥±])/g;
const ANALOGY_RE = /(같은|같이|처럼|마치)/;
const ASCII_RE = /[│─├└┌┐┘┤┬┴┼→←▶◀╲╱▢▣[\]]/;

function lintRound(text: string): { lines: string[]; warns: number } {
  const lines: string[] = [];
  let warns = 0;
  const pass = (ok: boolean, axis: string, detail: string) => {
    if (!ok) warns++;
    lines.push(`  ${ok ? "✅" : "⚠"} ${axis.padEnd(26)} ${detail}`);
  };

  const words = text.split(/\s+/).filter(Boolean);
  const wc = Math.max(words.length, 1);
  const jargon = (text.match(JARGON_RE) ?? []).length;
  const ratio = jargon / wc;
  pass(ratio <= 0.3, "jargon-ratio ≤0.30", `${ratio.toFixed(2)} (${jargon}/${wc})`);

  pass(ANALOGY_RE.test(text), "analogy-presence", ANALOGY_RE.test(text) ? "비유 마커 발견" : "비유(같은/처럼/마치) 없음");

  const fences = text.match(/```[\s\S]*?```/g) ?? [];
  const hasAsciiBlock = fences.some((f) => ASCII_RE.test(f));
  pass(hasAsciiBlock, "ascii-diagram-presence", hasAsciiBlock ? "ASCII 다이어그램 ≥1" : "펜스 ASCII 다이어그램 없음");

  // acronym first-use expansion: every ALL-CAPS acronym should have a nearby paren gloss
  const acronyms = [...new Set((text.match(/\b[A-Z]{2,}\b/g) ?? []))];
  const unexpanded = acronyms.filter((a) => !new RegExp(`${a}\\s*\\(|\\(\\s*${a}`).test(text));
  pass(unexpanded.length === 0, "acronym-expansion", acronyms.length ? `${acronyms.length - unexpanded.length}/${acronyms.length} 풀어씀` : "약어 없음 (n/a)");

  // bare-jargon first-use gloss (0순위 rule · advisory heuristic · never blocks):
  // hyphen-joined latin terms (content-reach · full-TERMINAL · GREEN-DIRECTIONAL-STRONG) and
  // backtick prose terms that appear with NO plain-language gloss within ~100 chars of first use.
  // Regex can't judge meaning — it flags "looks-like-jargon, ungloss​ed", so it stays advisory.
  const prose = text.replace(/```[\s\S]*?```/g, " "); // drop code fences (표기-제외)
  const COMMON_HYPHEN = /^(side-by-side|before-after|step-by-step|follow-up|end-to-end|real-time|open-source|read-only|up-to-date|state-of-the-art|so-called)$/i;
  // A gloss `=` is followed by 한글 (뜻); an equation `=` is followed by more jargon —
  // that Korean-after test is what separates `용어(=쉬운 뜻)` from `content-reach = GREEN…`.
  const glossedAfter = (e: number) => /[=—:]\s*[가-힣]|\(\s*[가-힣=]|즉|뜻|말하자면/.test(prose.slice(e, e + 100));
  // `쉬운말(용어)` form — plain Korean immediately precedes the parenthesised original name.
  const glossedBefore = (s: number) => /[가-힣][^()]{0,12}[(（]\s*[`'"]?\s*$/.test(prose.slice(Math.max(0, s - 20), s));
  const cand = new Map<string, { s: number; e: number }>(); // display → first {start,end}
  for (const m of prose.matchAll(/[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+/g)) {
    const t = m[0];
    if (COMMON_HYPHEN.test(t)) continue;
    if (!cand.has(t)) cand.set(t, { s: m.index ?? 0, e: (m.index ?? 0) + t.length });
  }
  for (const m of prose.matchAll(/`([^`\n]+)`/g)) {
    const t = m[1];
    if (/[\/.]|--|\s/.test(t) || !/[A-Za-z]/.test(t)) continue; // path/flag/command/multiword → skip
    const key = "`" + t + "`";
    if (!cand.has(key)) cand.set(key, { s: m.index ?? 0, e: (m.index ?? 0) + m[0].length });
  }
  const bare = [...new Set([...cand.entries()].filter(([, p]) => !glossedAfter(p.e) && !glossedBefore(p.s)).map(([t]) => t.replace(/`/g, "")))].slice(0, 5);
  pass(bare.length === 0, "bare-jargon-gloss", cand.size ? (bare.length ? `${bare.length}건 미풀이 (${bare.join(", ")})` : "은어 모두 풀이됨") : "은어 후보 없음 (n/a)");

  const hasTable = /\|.*\|.*\n\s*\|[\s:|-]+\|/.test(text);
  const hasIcon = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
  const sevenScore = [hasIcon, ANALOGY_RE.test(text), hasAsciiBlock, hasTable].filter(Boolean).length;
  pass(sevenScore >= 3, "7-element adoption", `${sevenScore}/4 (icon·비유·ascii·표)`);

  return { lines, warns };
}

export async function runEasy(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  const file = styleFile();

  if (sub === "show") {
    info(`easy style: ${existsSync(file) ? file : "(missing)"} (response=${loadPrefs().response})`);
    // Print the FULL canonical reference on demand — this is what the lean per-turn
    // directive points to ("📖 … sidecar easy show") so the gold examples + 4 ASCII
    // templates + checklist are reachable without the per-turn dump.
    if (existsSync(file)) process.stdout.write("\n" + readFileSync(file, "utf8") + "\n");
    return 0;
  }
  if (sub === "scaffold") {
    process.stdout.write(scaffold(args.slice(1).join(" ")) + "\n");
    return 0;
  }
  if (sub === "lint") {
    const src = args[1] && args[1] !== "-" ? args[1] : "";
    let text = "";
    if (src) {
      if (!existsSync(src)) {
        info(`easy lint: file not found — ${src}`);
        return 1;
      }
      text = readFileSync(src, "utf8");
    } else {
      text = readStdin();
    }
    const { lines, warns } = lintRound(text);
    process.stdout.write(`easy lint (advisory · ${warns === 0 ? "all PASS" : `${warns} warn`}):\n` + lines.join("\n") + "\n");
    return 0; // advisory — never blocks the round
  }
  if (sub === "inject") {
    const { event, prompt } = readPayload();
    if (!event) return 0;
    if (!existsSync(file)) return 0;
    const body = readFileSync(file, "utf8");
    // Two-tier: UserPromptSubmit → lean per-turn directive (the easy:lean region);
    // SessionStart/PreCompact/PostCompact → the full canonical reference, once.
    // Fallback to full when a style file lacks the marker (e.g. ja/zh/ru not yet split).
    const lean = extractLean(body);
    const tier: "lean" | "full" = event === "UserPromptSubmit" && lean ? "lean" : "full";
    const payload = tier === "lean" ? (lean as string) : body;
    const banner =
      event === "UserPromptSubmit" && nlTrigger(prompt)
        ? "🎓 easy 모드 활성 — 은어 첫 등장 즉시 풀이 `용어(=쉬운 뜻)`(0순위·필수) · 새 개념 소개일 때만 7요소\n\n"
        : "";
    const context = header(file, banner, tier) + payload;
    emitInject("easy", event, context);
    return 0;
  }
  info("usage: sidecar easy {show|inject|scaffold \"<q>\"|lint <file|->}");
  return 1;
}
