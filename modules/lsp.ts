// harness lsp {wire|status|rebuild <file>}
// LSP wiring for the agent's editor (sidecar hexa-lsp + lsp-rebuild parity).
//
//   wire           write a Claude-Code `.lsp.json` (canonical filename) at repo
//                  root mapping configured extensions → language servers. The
//                  default server wires hexa-lang's `hexa lsp` for `.hexa`.
//   status         show configured servers + binary presence + `.lsp.json` state
//   rebuild <file> PostToolUse(Write|Edit) delegate: when an LSP grammar source
//                  is edited the prebuilt binary is stale, so recompile it in the
//                  BACKGROUND and print a non-blocking advisory. Always exits 0
//                  (fail-open) so a transient build issue never blocks an edit.
//
// Why rebuild (not source-run): the hexa LSP stdio server needs the
// `read_stdin_n_c` FFI which only links into a COMPILED binary; `hexa run` of the
// source can't serve interactive stdin. The .hexa source is the SSOT, the
// prebuilt binary its artifact — this keeps the artifact in lockstep.
import { existsSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { homedir } from "node:os";
import { REPO_ROOT } from "../lib/paths.ts";
import { config } from "../lib/config.ts";
import { execShell } from "../lib/exec.ts";
import { info, ok, warn } from "../lib/log.ts";

function lspJsonPath(): string {
  return resolve(REPO_ROOT, ".lsp.json");
}

// configured servers → Claude-Code `.lsp.json` shape
function buildLspJson(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of config().lsp.servers) {
    const extMap: Record<string, string> = {};
    for (const e of s.extensions) extMap[e] = s.lang;
    out[s.lang] = { command: s.command, args: s.args, extensionToLanguage: extMap };
  }
  return out;
}

async function wire(force: boolean): Promise<number> {
  const p = lspJsonPath();
  const next = buildLspJson();
  if (!Object.keys(next).length) {
    warn("lsp: no servers configured (harness.config.json → lsp.servers)");
    return 0;
  }
  if (existsSync(p) && !force) {
    const cur = readFileSync(p, "utf8");
    if (cur.trim() === JSON.stringify(next, null, 2).trim()) {
      info(`lsp: .lsp.json already current (${Object.keys(next).join(", ")})`);
      return 0;
    }
    warn("lsp: .lsp.json exists and differs — re-run with --force to overwrite");
    return 1;
  }
  writeFileSync(p, JSON.stringify(next, null, 2) + "\n", "utf8");
  ok(`lsp: wrote .lsp.json → ${Object.keys(next).join(", ")} (reload the editor to pick up)`);
  return 0;
}

async function status(): Promise<number> {
  const servers = config().lsp.servers;
  info(`lsp: ${servers.length} server(s) configured · .lsp.json ${existsSync(lspJsonPath()) ? "✓ present" : "○ not wired (harness lsp wire)"}`);
  for (const s of servers) {
    const bin = s.command === "sh" ? "hexa" : s.command; // sh -c wrapper ultimately execs `hexa lsp`
    const found = (await execShell(`command -v ${bin} 2>/dev/null`)).stdout.trim();
    info(`  ${found ? "🟢" : "🔴"} ${s.lang}  [${s.extensions.join(" ")}]  ${found || bin + " not on PATH"}`);
  }
  info(`  rebuild-on-edit: ${config().lsp.rebuild ? "on" : "off"}`);
  return 0;
}

// hexa-lang's own LSP isn't named `*_lsp.hexa`: canonical monolith is
// `<repo>/self/lsp.hexa`, submodules under `<repo>/self/lsp/*.hexa`. Returns the
// repo root for either shape, else "".
function hexaLspRepo(p: string): string {
  const mono = "/self/lsp.hexa";
  if (p.endsWith(mono)) return p.slice(0, -mono.length);
  const i = p.indexOf("/self/lsp/");
  if (i >= 0 && p.endsWith(".hexa")) return p.slice(0, i);
  return "";
}

// PostToolUse(Write|Edit) delegate. Returns true if it kicked off a rebuild
// (caller may surface the advisory). Always non-blocking.
export function lspRebuildOnEdit(file: string): boolean {
  if (!config().lsp.rebuild || !file) return false;
  const abs = resolve(REPO_ROOT, file);
  const log = resolve(homedir(), ".harness", "lsp-rebuild.log");
  mkdirSync(dirname(log), { recursive: true });

  // Case A — hexa-lang's own LSP (self/lsp.hexa | self/lsp/*.hexa) → 3-stage
  // orchestrator rebuilds <repo>/bin/hexa-lsp.
  const repo = hexaLspRepo(abs);
  if (repo) {
    const orch = `${repo}/tool/build_hexa_lsp.hexa`;
    execShell(`nohup env HEXA_MAC_BUILD_OK=1 HEXA_LANG='${repo}' hexa run '${orch}' >> '${log}' 2>&1 &`);
    warn(`lsp-rebuild: hexa-lang LSP source changed → rebuilding ${repo}/bin/hexa-lsp in background (log: ~/.harness/lsp-rebuild.log). Reload the LSP session.`);
    return true;
  }

  // Case B (generic) — `*/lsp/<lang>_lsp.hexa` → ~/.local/bin/<lang>-lsp-hexa
  if (!abs.endsWith("_lsp.hexa") || !abs.includes("/lsp/")) return false;
  const base = basename(abs);
  const lang = base.slice(0, -"_lsp.hexa".length);
  if (!lang) return false;
  const out = resolve(homedir(), ".local", "bin", `${lang}-lsp-hexa`);
  execShell(`nohup env HEXA_MAC_BUILD_OK=1 hexa build '${abs}' -o '${out}' >> '${log}' 2>&1 &`);
  warn(`lsp-rebuild: ${lang} LSP grammar changed → rebuilding ${lang}-lsp-hexa in background (log: ~/.harness/lsp-rebuild.log). Reload the LSP session.`);
  return true;
}

export async function runLsp(args: string[]): Promise<number> {
  const sub = args[0] ?? "status";
  if (sub === "wire") return wire(args.includes("--force"));
  if (sub === "status") return status();
  if (sub === "rebuild") {
    const hit = lspRebuildOnEdit(args[1] ?? "");
    if (!hit) info("lsp: not an LSP grammar source (no rebuild)");
    return 0;
  }
  info("usage: harness lsp {wire [--force]|status|rebuild <file>}");
  return 1;
}
