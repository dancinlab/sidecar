import { spawn, type SpawnOptions } from "node:child_process";
import { readFileSync } from "node:fs";

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
  ms: number;
  killed: boolean;
}

export interface ExecOpts {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  input?: string;
}

export function execShell(cmd: string, opts: ExecOpts = {}): Promise<ExecResult> {
  return execArgs("bash", ["-lc", cmd], opts);
}

export function execArgs(bin: string, args: string[], opts: ExecOpts = {}): Promise<ExecResult> {
  const t0 = Date.now();
  return new Promise<ExecResult>((resolve) => {
    const spawnOpts: SpawnOptions = {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    };
    const child = spawn(bin, args, spawnOpts);
    let stdout = "";
    let stderr = "";
    let killed = false;
    let settled = false;

    const timer = opts.timeoutMs
      ? setTimeout(() => {
          killed = true;
          child.kill("SIGKILL");
        }, opts.timeoutMs)
      : null;
    // single-resolve guard so neither `error` nor `close` can double-fire / hang.
    const settle = (r: ExecResult) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(r);
    };

    child.stdout?.on("data", (b: Buffer) => {
      stdout += b.toString();
    });
    child.stderr?.on("data", (b: Buffer) => {
      stderr += b.toString();
    });
    // @convergence state=ossified id=EXEC_SPAWN_ERROR_UNHANDLED value="execArgs must handle the child's `error` event (spawn ENOENT / EACCES) — degrade to a non-zero ExecResult, never let an unhandled `error` crash the process" threshold="a minimal-PATH hook env (SessionStart) couldn't spawn `bash` → unhandled 'error' event killed the whole SessionStart hook (node:events crash); every execShell caller was exposed"
    child.on("error", (e: Error) => {
      settle({ code: 127, stdout, stderr: stderr + `spawn ${bin} failed: ${e?.message ?? String(e)}`, ms: Date.now() - t0, killed });
    });
    child.on("close", (code) => {
      settle({ code: code ?? -1, stdout, stderr, ms: Date.now() - t0, killed });
    });
    // stdin may already be gone if spawn errored — guard the write/end.
    try {
      if (opts.input !== undefined) child.stdin?.write(opts.input);
      child.stdin?.end();
    } catch {
      /* child failed to spawn — the `error` handler settles the promise */
    }
  });
}

// Bounded-concurrency parallel map.
export async function pmap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = new Array(Math.min(concurrency, items.length || 1)).fill(0).map(async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export function tail(text: string, n: number): string {
  return text.split("\n").filter(Boolean).slice(-n).join("\n");
}

// Read this process's stdin to EOF (for hook payloads piped by the agent
// runtime). Returns "" on a TTY / no input rather than blocking.
export function readStdin(): string {
  if (process.stdin.isTTY) return "";
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}
