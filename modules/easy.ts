// harness easy {show|inject}
// Auto-inject the "easy" (friendly) response style.
// `inject` reads styles/easy.<lang>.md for the prefs response language and emits
// it as UserPromptSubmit/SessionStart additionalContext so the 7-element pattern
// is active from turn 0. The NL substrings 설명 / 쉽게 prepend an activation banner.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { HARNESS_ROOT } from "../lib/paths.ts";
import { info } from "../lib/log.ts";
import { readStdin } from "../lib/exec.ts";
import { loadPrefs } from "./prefs.ts";

const STYLES_DIR = resolve(HARNESS_ROOT, "styles");

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

function header(src: string, banner: string): string {
  return (
    banner +
    `# response style: easy (auto-injected by harness easy · ${src})\n\n` +
    "Apply the 7-element friendly pattern below to user-facing prose this turn — " +
    "icon · name · alias · plain-line · analogy · ASCII · compare. Scope/exclusions per the canonical reference.\n\n" +
    "---\n\n"
  );
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

export async function runEasy(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  const file = styleFile();

  if (sub === "show") {
    info(`easy style: ${existsSync(file) ? file : "(missing)"} (response=${loadPrefs().response})`);
    return 0;
  }
  if (sub === "inject") {
    const { event, prompt } = readPayload();
    if (!event) return 0;
    if (!existsSync(file)) return 0;
    const body = readFileSync(file, "utf8");
    const banner =
      event === "UserPromptSubmit" && nlTrigger(prompt)
        ? "🎓 easy 모드 활성 — 7-요소 패턴 적용 (아이콘·이름·별칭·평이·비유·ASCII·비교)\n\n"
        : "";
    const context = header(file, banner) + body;
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } }) + "\n"
    );
    return 0;
  }
  info("usage: harness easy {show|inject}");
  return 1;
}
