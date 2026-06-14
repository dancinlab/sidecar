// harness secret <args...> — thin wrapper over the `secret` CLI (dancinlab/secret:
// encrypted-file/Keychain credential store · sidecar /secret parity). Verbs pass
// through: get · set · rotate · check · delete · list · service · init · backup ·
// sync · migrate. Credentials belong in the secret store, never hardcoded
// (enforcement G-SECRET-LITERAL). `get` exposes the value in output — for tool
// invocations prefer inline `$(secret get <k>)` instead of `harness secret get`.
import { execShell } from "../lib/exec.ts";
import { info, warn } from "../lib/log.ts";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

function findSecretBin(): string | null {
  for (const p of [
    "/opt/homebrew/bin/secret",
    "/usr/local/bin/secret",
    resolve(homedir(), ".local/bin/secret"),
    resolve(homedir(), ".hx/bin/secret"),
  ]) {
    if (existsSync(p)) return p;
  }
  return null;
}

export async function runSecret(args: string[]): Promise<number> {
  // resolve via PATH first, then known locations
  const which = (await execShell("command -v secret 2>/dev/null")).stdout.trim();
  const bin = which || findSecretBin();
  if (!bin) {
    info("secret CLI not found. Install dancinlab/secret (macOS Keychain / encrypted-file credential store):");
    info("  hx install secret   ·   or clone github.com/dancinlab/secret and put `secret` on PATH");
    return 127;
  }
  if (!args.length) {
    info(`secret CLI: ${bin}`);
    info("verbs: get · set · rotate · check · delete · list · service · init · backup · sync · migrate");
    return 0;
  }
  if (args[0] === "get") {
    warn("`secret get` prints the value — it will land in this session's context. For tool args prefer inline `$(secret get <k>)`.");
  }
  const cmd = `${JSON.stringify(bin)} ${args.map((a) => JSON.stringify(a)).join(" ")}`;
  const r = await execShell(cmd, { timeoutMs: 120_000 });
  process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.code;
}
