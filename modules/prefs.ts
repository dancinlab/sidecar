// harness prefs {show|code <lang>|docs <lang>|response <lang>|inject}
// Language preferences on 3 axes (sidecar prefs parity):
//   code authoring · doc authoring · response-to-user.
// Stored per-repo at .harness/prefs.json. `inject` emits a UserPromptSubmit
// additionalContext block so the agent is reminded every turn; the
// post-edit guard additionally flags code that violates the code-authoring axis.
import { existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { readJsonOr, writeJson } from "../lib/json.ts";
import { info } from "../lib/log.ts";
import { readStdin } from "../lib/exec.ts";

export interface Prefs {
  code: string;
  docs: string;
  response: string;
}

const DEFAULTS: Prefs = { code: "english", docs: "english", response: "korean" };

function prefsFile(): string {
  return resolve(REPO_ROOT, ".harness", "prefs.json");
}

export function loadPrefs(): Prefs {
  return { ...DEFAULTS, ...readJsonOr<Partial<Prefs>>(prefsFile(), {}) };
}

function body(p: Prefs): string {
  return (
    "# prefs (MUST FOLLOW every reply — hard rules, not hints)\n" +
    `- code authoring (.ts · .py · .rs · .go · .c · .swift · ...): ${p.code}\n` +
    `- doc authoring (.md · README · CHANGELOG · ...): ${p.docs}\n` +
    `- response to user: ${p.response} — EVERY user-visible token (headers · table cells · prose · inline notes · summaries). Switch ONLY on explicit user request. If you catch yourself drifting to another language mid-reply, restart that section in ${p.response}.\n`
  );
}

const HANGUL = /[가-힣]/;

// Used by the post-edit guard: a code file written in a non-Korean
// code-authoring repo that contains Hangul is almost always a stray comment /
// string that should be English (or moved to a locale file).
export function codeLangViolation(file: string, content: string): string | null {
  const p = loadPrefs();
  if (p.code !== "english") return null;
  if (!/\.(ts|tsx|js|jsx|mjs|cjs|py|rb|php|go|rs|java|kt|kts|scala|c|h|cpp|cc|cxx|hpp|m|mm|swift|dart|hexa)$/.test(file)) return null;
  if (content.includes("@lang-ok")) return null;
  if (!HANGUL.test(content)) return null;
  return `code authoring pref is '${p.code}' but Hangul found in ${file} — keep code/comments English (move UI text to locale files), or add // @lang-ok`;
}

function eventName(): string {
  // inject reads the firing hook event from stdin JSON and echoes it back.
  try {
    const j = JSON.parse(readStdin());
    return String(j.hook_event_name ?? j.hookEventName ?? "UserPromptSubmit");
  } catch {
    return "UserPromptSubmit";
  }
}

export async function runPrefs(args: string[]): Promise<number> {
  const sub = args[0] ?? "show";
  const p = loadPrefs();

  if (sub === "inject") {
    const ev = eventName();
    process.stdout.write(
      JSON.stringify({ hookSpecificOutput: { hookEventName: ev, additionalContext: body(p) } }) + "\n"
    );
    return 0;
  }
  if (sub === "show") {
    info(`prefs (${existsSync(prefsFile()) ? ".harness/prefs.json" : "defaults"}):`);
    info(`  code     = ${p.code}`);
    info(`  docs     = ${p.docs}`);
    info(`  response = ${p.response}`);
    return 0;
  }
  if (sub === "code" || sub === "docs" || sub === "response") {
    const lang = args[1];
    if (!lang) {
      info(`usage: harness prefs ${sub} <lang>`);
      return 1;
    }
    const next: Prefs = { ...p, [sub]: lang };
    mkdirSync(dirname(prefsFile()), { recursive: true });
    writeJson(prefsFile(), next);
    info(`prefs.${sub} = ${lang}`);
    return 0;
  }
  info("usage: harness prefs {show|code <lang>|docs <lang>|response <lang>|inject}");
  return 1;
}
