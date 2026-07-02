// sidecar fable [flags] <prompt...> | --file <f> | -
//   Delegate ONE instruction to the Fable 5 model via headless `claude -p`.
//   Fable 5 (claude-fable-5) is Anthropic's Mythos-class tier above Opus — this
//   command lets any session (or the user, via /fable) hand a single directive
//   to that model without switching the whole session backend (`sidecar switch`
//   stays untouched — this is per-CALL, not per-session).
//
//   The prompt is ALWAYS written to the child's stdin (the documented
//   `echo … | claude -p` path), never placed on claude's argv — so shell
//   quoting, argv length limits, and history leakage are non-issues.
//   stdout/stderr are inherited: a long generation streams live instead of
//   looking frozen behind a capture buffer.
//
//     sidecar fable "이 diff 요약해줘"            # argv words → one prompt
//     sidecar fable --file notes.md               # prompt from a file
//     git diff | sidecar fable -                  # prompt from stdin
//     sidecar fable --json "…"                    # --output-format json
//     sidecar fable --dry "…"                     # print resolved argv, no run
//     sidecar fable "…" -- --allowedTools Bash    # after --, verbatim to claude
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { info, warn } from "../lib/log.ts";

const DEFAULT_MODEL = "claude-fable-5";

const USAGE = `usage: sidecar fable [flags] <prompt...> | --file <f> | -
  -m, --model <id>   model to run (default ${DEFAULT_MODEL})
  -f, --file <path>  read the prompt from a file
  -                  read the prompt from stdin (pipe-friendly)
      --json         machine output (claude --output-format json)
      --dry          print the resolved claude argv + prompt size, do not run
      --cwd <dir>    working directory for the claude run (default: current)
      --timeout <s>  kill the run after <s> seconds (exit 124) — headless claude
                     can sleep FOREVER waiting for login credentials; cap it
      -- <flags...>  everything after -- is passed to claude verbatim
prompt sources are exclusive: argv words | --file | - (stdin).`;

interface FableOpts {
  model: string;
  file: string | null;
  stdin: boolean;
  json: boolean;
  dry: boolean;
  cwd: string | null;
  timeoutSec: number | null;
  words: string[];
  extra: string[];
}

function parseArgs(args: string[]): FableOpts | null {
  const o: FableOpts = { model: DEFAULT_MODEL, file: null, stdin: false, json: false, dry: false, cwd: null, timeoutSec: null, words: [], extra: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--") {
      o.extra = args.slice(i + 1);
      break;
    } else if (a === "-m" || a === "--model") {
      const v = args[++i];
      if (!v) return null;
      o.model = v;
    } else if (a === "-f" || a === "--file") {
      const v = args[++i];
      if (!v) return null;
      o.file = v;
    } else if (a === "--cwd") {
      const v = args[++i];
      if (!v) return null;
      o.cwd = v;
    } else if (a === "--timeout") {
      const v = Number(args[++i]);
      if (!Number.isFinite(v) || v <= 0) return null;
      o.timeoutSec = v;
    } else if (a === "-") {
      o.stdin = true;
    } else if (a === "--json") {
      o.json = true;
    } else if (a === "--dry") {
      o.dry = true;
    } else {
      o.words.push(a);
    }
  }
  return o;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c: string) => (buf += c));
    process.stdin.on("end", () => resolve(buf));
  });
}

async function resolvePrompt(o: FableOpts): Promise<string | null> {
  const sources = [o.words.length > 0, o.file !== null, o.stdin].filter(Boolean).length;
  if (sources !== 1) {
    warn(sources === 0 ? "fable: no prompt — pass words, --file <f>, or - (stdin)." : "fable: prompt sources are exclusive — pick ONE of argv words | --file | -.");
    return null;
  }
  if (o.file) {
    try {
      return readFileSync(o.file, "utf8");
    } catch (e) {
      warn(`fable: cannot read --file ${o.file}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
  if (o.stdin) return readStdin();
  return o.words.join(" ");
}

export async function runFable(args: string[]): Promise<number> {
  if (args.length === 0 || ["help", "-h", "--help"].includes(args[0])) {
    info(USAGE);
    return args.length === 0 ? 1 : 0;
  }
  const o = parseArgs(args);
  if (!o) {
    info(USAGE);
    return 1;
  }
  const prompt = await resolvePrompt(o);
  if (prompt === null) return 1;
  if (prompt.trim() === "") {
    warn("fable: prompt is empty.");
    return 1;
  }

  const claudeArgs = ["-p", "--model", o.model, ...(o.json ? ["--output-format", "json"] : []), ...o.extra];
  if (o.dry) {
    info(`fable --dry: claude ${claudeArgs.join(" ")}`);
    info(`  prompt: ${prompt.length} chars via child stdin${o.cwd ? ` · cwd=${o.cwd}` : ""}${o.timeoutSec ? ` · timeout=${o.timeoutSec}s` : ""}`);
    return 0;
  }

  // Prompt goes through the child's stdin; the answer streams straight to ours.
  return new Promise<number>((resolve) => {
    const child = spawn("claude", claudeArgs, {
      cwd: o.cwd ?? process.cwd(),
      stdio: ["pipe", "inherit", "inherit"],
    });
    // Headless claude waiting on login credentials sleeps forever at 0% CPU —
    // --timeout is the observed-stall cap: kill and report 124 (GNU timeout).
    let timedOut = false;
    const timer = o.timeoutSec
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, o.timeoutSec * 1000)
      : null;
    const settle = (code: number) => {
      if (timer) clearTimeout(timer);
      resolve(code);
    };
    child.on("error", (e: NodeJS.ErrnoException) => {
      warn(e.code === "ENOENT" ? "fable: `claude` CLI not found on PATH — install Claude Code first." : `fable: claude spawn failed: ${e.message}`);
      settle(127);
    });
    child.on("close", (code) => {
      if (timedOut) {
        warn(`fable: killed after --timeout ${o.timeoutSec}s (headless claude stall — check 'claude /login' auth if this repeats).`);
        settle(124);
        return;
      }
      settle(code ?? 1);
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
