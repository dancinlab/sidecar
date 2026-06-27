// sidecar toolkit {list|inject|json|write|check}
// A machine-readable catalog of every sidecar command, so an AI agent KNOWS what
// commands exist and WHEN to reach for them (sidecar-parity: its TOOLKIT.jsonl +
// SessionStart command-catalog injection). The catalog SSOT is the `HELP` text in
// cli/index.ts — toolkit PARSES it (read as text to avoid importing the entry
// module's side effects), so there is ONE source and zero drift:
//   list    human render of the catalog (grouped by section)
//   inject  SessionStart additionalContext — compact `id — use` catalog so the
//           agent sees the whole command surface once per session (not just on
//           a reactive keyword hit)
//   json    emit the catalog as JSONL (one object per command) to stdout
//   write   materialize TOOLKIT.jsonl at the sidecar repo root (committed artifact)
//   check   regenerate from HELP and diff the committed TOOLKIT.jsonl — exit 1 on
//           drift (mechanical sync guard: edit HELP → must `toolkit write`)
//
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { info, ok, warn, loudFail } from "../lib/log.ts";
import { readJsonOr } from "../lib/json.ts";
import { config, resolveRuleFile } from "../lib/config.ts";

const CLI_SRC = fileURLToPath(new URL("../cli/index.ts", import.meta.url));
const TOOLKIT_FILE = fileURLToPath(new URL("../TOOLKIT.jsonl", import.meta.url));

export interface ToolkitEntry {
  id: string;
  kind: string;
  usage: string;
  use: string;
  triggers?: string[];
}

// Section header → kind tag.
function sectionKind(header: string): string {
  const h = header.toLowerCase();
  if (h.startsWith("setup")) return "setup";
  if (h.startsWith("hook")) return "hook";
  if (h.startsWith("gates")) return "gate";
  if (h.startsWith("reports")) return "report";
  return "command";
}

// Extract the HELP template literal body from cli/index.ts source as plain text.
function helpText(): string {
  const src = readFileSync(CLI_SRC, "utf8");
  const start = src.indexOf("HELP = `");
  if (start < 0) return "";
  const from = start + "HELP = `".length;
  // the template closes with a line-start `;  — match THAT, not an escaped inline `\`;`.
  const end = src.indexOf("\n`;", from);
  const body = src.slice(from, end < 0 ? undefined : end);
  // un-escape the backtick-template escapes used inside the literal
  return body.replace(/\\`/g, "`").replace(/\\\$/g, "$");
}

// Dispatch command ids that are ALIASES of a canonical entry already in the catalog
// (they share the canonical's HELP line, so they don't get their own catalog row).
const ALIASES: Record<string, string> = {
  "all-bg-go": "abg", "all-fg-go": "afg", demiurge: "demi",
  micro: "micro-exp", "step-by-step": "sbs", mem: "mem-guard", mail: "email",
};

// Every dispatch `case "x"` id, parsed from the CLI source (authoritative surface).
function dispatchIds(): string[] {
  const src = readFileSync(CLI_SRC, "utf8");
  return [...new Set([...src.matchAll(/case "([^"]+)":/g)].map((m) => m[1]))];
}

// Coverage gap: dispatch commands NOT present in the catalog and NOT a known alias.
export function toolkitCoverageGaps(): string[] {
  const ids = new Set(parseToolkit().map((e) => e.id));
  return dispatchIds().filter((c) => !ids.has(c) && !(c in ALIASES));
}

// keyword triggers → command id, so the catalog shows which user phrasings route here.
function triggerMap(): Map<string, string[]> {
  const file = resolveRuleFile(config().keywordsFile, "keywords.json");
  const cfg = readJsonOr<{ rules?: Array<{ patterns: string[]; tool?: string }> }>(file, {});
  const map = new Map<string, string[]>();
  for (const r of cfg.rules ?? []) {
    const tool = r.tool ?? "";
    const m = tool.match(/^sidecar\s+(\S+)/);
    if (!m) continue;
    const id = m[1];
    map.set(id, [...(map.get(id) ?? []), ...r.patterns]);
  }
  return map;
}

export function parseToolkit(): ToolkitEntry[] {
  const lines = helpText().split("\n");
  const triggers = triggerMap();
  const entries: ToolkitEntry[] = [];
  const seen = new Set<string>();
  let kind = "command";
  let last: ToolkitEntry | null = null;

  for (const raw of lines) {
    if (!raw.trim()) { last = null; continue; }
    // section header: starts at column 0 and ends with ':'
    if (/^\S.*:\s*$/.test(raw)) { kind = sectionKind(raw); last = null; continue; }
    // continuation: deeply indented, no command token → append to previous entry
    if (/^ {7,}\S/.test(raw) && last) {
      const cont = raw.trim();
      last.use = last.use ? `${last.use} ${cont}` : cont;
      continue;
    }
    // command entry: 2-space indent + usage [+ 2-space gap + description]
    const m = raw.match(/^ {2}(\S.*?)(?: {2,}(.*\S))?\s*$/);
    if (!m) { last = null; continue; }
    const usage = m[1].trim();
    const use = (m[2] ?? "").trim();
    const tokens = usage.split(/\s+/);
    let id = tokens[0];
    // disambiguate repeated leading tokens (e.g. "fleet" vs "fleet lab")
    if (seen.has(id) && tokens[1] && /^[a-z]/.test(tokens[1])) id = `${tokens[0]}-${tokens[1]}`;
    if (seen.has(id)) { last = null; continue; }
    seen.add(id);
    const entry: ToolkitEntry = { id, kind, usage, use };
    const tg = triggers.get(tokens[0]);
    if (tg && tg.length) entry.triggers = tg;
    entries.push(entry);
    last = entry;
  }
  return entries;
}

function toJsonl(entries: ToolkitEntry[]): string {
  return entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
}

// Lint helper: null when the committed TOOLKIT.jsonl matches the HELP-derived
// catalog, else a one-line drift reason. Never throws.
export function toolkitDrift(): string | null {
  try {
    const gaps = toolkitCoverageGaps();
    if (gaps.length) return `${gaps.length} command(s) missing from catalog (${gaps.join(", ")}) — document in HELP`;
    const generated = toJsonl(parseToolkit());
    const committed = existsSync(TOOLKIT_FILE) ? readFileSync(TOOLKIT_FILE, "utf8") : "";
    if (committed === generated) return null;
    return committed
      ? "TOOLKIT.jsonl differs from HELP — run 'sidecar toolkit write'"
      : "TOOLKIT.jsonl missing — run 'sidecar toolkit write'";
  } catch {
    return null;
  }
}

function renderInject(entries: ToolkitEntry[]): string {
  const order = ["command", "gate", "report", "hook", "setup"];
  const label: Record<string, string> = {
    command: "commands", gate: "gates & ledgers", report: "reports", hook: "hook delegates", setup: "setup",
  };
  const out: string[] = [
    "# toolkit — sidecar command catalog (so you KNOW what `sidecar <cmd>` can do)",
    "",
    "Proactive surface of every sidecar command. Reach for one by NAME when its job fits —",
    "don't reinvent it inline. `sidecar <cmd>` (or `sidecar help` for full flags).",
    "",
  ];
  for (const k of order) {
    const group = entries.filter((e) => e.kind === k);
    if (!group.length) continue;
    out.push(`## ${label[k] ?? k}`);
    for (const e of group) {
      const use = e.use ? ` — ${e.use.slice(0, 140)}` : "";
      const tg = e.triggers?.length ? `  ⟨triggers: ${e.triggers.slice(0, 6).join(" · ")}⟩` : "";
      out.push(`- \`${e.id}\`${use}${tg}`);
    }
    out.push("");
  }
  return out.join("\n");
}

export async function runToolkit(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";
  const entries = parseToolkit();

  if (sub === "json") {
    process.stdout.write(toJsonl(entries));
    return 0;
  }
  if (sub === "inject") {
    // SessionStart additionalContext — quiet (no entries → silent).
    if (entries.length) process.stderr.write(renderInject(entries) + "\n");
    return 0;
  }
  if (sub === "write") {
    writeFileSync(TOOLKIT_FILE, toJsonl(entries));
    ok(`toolkit: wrote ${entries.length} entries → ${TOOLKIT_FILE}`);
    return 0;
  }
  if (sub === "check") {
    const gaps = toolkitCoverageGaps();
    if (gaps.length) {
      for (const g of gaps) warn(`  uncatalogued command: ${g} (in cli dispatch, missing from HELP/catalog)`);
      loudFail(`toolkit: ${gaps.length} command(s) NOT in the catalog — every command must be documented in HELP`);
      return 1;
    }
    const generated = toJsonl(entries);
    const committed = existsSync(TOOLKIT_FILE) ? readFileSync(TOOLKIT_FILE, "utf8") : "";
    if (committed === generated) {
      ok(`toolkit: ${entries.length} entries — TOOLKIT.jsonl in sync with HELP · all dispatch commands catalogued`);
      return 0;
    }
    if (!committed) loudFail("toolkit: TOOLKIT.jsonl missing — run 'sidecar toolkit write'");
    else loudFail(`toolkit: TOOLKIT.jsonl DRIFTED from HELP (${entries.length} entries) — run 'sidecar toolkit write'`);
    return 1;
  }
  // list (default) — human render
  info(`toolkit: ${entries.length} commands`);
  let kind = "";
  for (const e of entries) {
    if (e.kind !== kind) { kind = e.kind; info(`\n[${kind}]`); }
    info(`  ${e.id.padEnd(14)} ${e.use.slice(0, 90)}`);
    if (e.triggers?.length) info(`  ${" ".repeat(14)} ⟨${e.triggers.slice(0, 8).join(" · ")}⟩`);
  }
  return 0;
}
