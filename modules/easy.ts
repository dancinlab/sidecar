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
      ? "Apply the 7-element friendly pattern (per-turn directive below) to user-facing prose this turn — " +
        "icon · name · alias · plain-line · analogy · ASCII · compare. Full reference (gold examples · 4 ASCII " +
        "templates · checklist) is injected once at SessionStart/Compact and on-demand via `sidecar easy show`."
      : "The full easy-style canonical reference below is injected ONCE this session (cached prefix · survives " +
        "compaction). The per-turn directive rides UserPromptSubmit. Apply the 7-element pattern to user-facing prose.";
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
        ? "🎓 easy 모드 활성 — 7-요소 패턴 적용 (아이콘·이름·별칭·평이·비유·ASCII·비교)\n\n"
        : "";
    const context = header(file, banner, tier) + payload;
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } }) + "\n"
    );
    return 0;
  }
  info("usage: sidecar easy {show|inject|scaffold \"<q>\"|lint <file|->}");
  return 1;
}
