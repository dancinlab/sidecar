// sidecar ci [all|fast|list]   (was `verify` — renamed; `verify` is now the
// tier-rubric claim verifier. Config key stays `verify.checks`.)
// Run the project's verification checks (from harness.config.json) in parallel.
// `fast` skips checks marked slow:true. Any failure → exit 1 (mandatory-pass).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { LOGS, REPO_ROOT } from "../lib/paths.ts";
import { appendJsonl, info, loudFail, ok, warn } from "../lib/log.ts";
import { execShell, tail } from "../lib/exec.ts";
import { config, repoPath } from "../lib/config.ts";
import type { VerifyCheck, CiStep } from "../lib/config.ts";

export async function runCi(args: string[]): Promise<number> {
  const mode = args[0] ?? "all";
  if (mode === "scaffold") return ciScaffold(args.slice(1));
  const checks: VerifyCheck[] = config().verify.checks ?? [];

  if (mode === "list") {
    if (!checks.length) info("no verify checks configured (harness.config.json → verify.checks)");
    for (const c of checks) info(`  ${c.id}${c.slow ? " (slow)" : ""}: ${c.cmd}`);
    return 0;
  }
  if (!checks.length) {
    info("no verify checks configured — nothing to run");
    return 0;
  }

  const fast = mode === "fast" || args.includes("--no-build");
  const run = fast ? checks.filter((c) => !c.slow) : checks;
  const t0 = Date.now();

  const results = await Promise.all(
    run.map(async (c) => {
      const r = await execShell(c.cmd, { cwd: repoPath("."), timeoutMs: c.timeoutMs ?? 240_000 });
      return { id: c.id, ok: r.code === 0 && !r.killed, code: r.code, killed: r.killed, ms: r.ms, out: tail(r.stdout + "\n" + r.stderr, 6) };
    })
  );

  const failed = results.filter((r) => !r.ok);
  appendJsonl(LOGS.observations, {
    kind: "ci",
    mode,
    total: results.length,
    failed: failed.length,
    elapsed_ms: Date.now() - t0,
    items: results.map((r) => ({ id: r.id, ok: r.ok, code: r.code, ms: r.ms })),
  });

  if (failed.length === 0) {
    ok(`ci: ${results.length}/${results.length} passed (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    return 0;
  }
  loudFail(`ci: ${failed.length}/${results.length} failed`);
  for (const f of failed) {
    info(`  ✗ ${f.id} (code=${f.code}${f.killed ? " timeout" : ""})`);
    info(f.out.split("\n").map((l) => `      ${l}`).join("\n"));
  }
  return 1;
}

// ── CI scaffold — emit a GitHub Actions workflow that runs the repo's
// `sidecar ci` (verify.checks) on a fast cloud runner, so every push-time check
// stays off the dev machine. Project-agnostic: the runner + stack setup come from
// config (`ci.runner` / `ci.setup`), the checks come from the repo's verify.checks.
// `sidecar init` calls this too. Exported so init reuses one generator (single SSOT).

// Stack-specific setup steps when `ci.setup` is empty — detected from marker files.
export function defaultCiSetup(): CiStep[] {
  const has = (f: string) => existsSync(resolve(REPO_ROOT, f));
  if (has("package.json"))
    return [
      { name: "Setup Node", uses: "actions/setup-node@v4", with: { "node-version": "20", cache: "npm" } },
      { name: "Install deps", run: has("package-lock.json") ? "npm ci" : "npm install" },
    ];
  if (has("hexa.toml") || has("hexa.lock"))
    return [
      {
        name: "Install hexa toolchain (released binary)",
        shell: "bash",
        run: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/dancinlab/hexa-lang/main/install.sh)"\necho "$HOME/.hx/bin" >> "$GITHUB_PATH"',
      },
    ];
  if (has("pyproject.toml") || has("requirements.txt"))
    return [
      { name: "Setup Python", uses: "actions/setup-python@v5", with: { "python-version": "3.12" } },
      ...(has("requirements.txt") ? [{ name: "Install deps", run: "pip install -r requirements.txt" } as CiStep] : []),
    ];
  return [];
}

function serializeStep(s: CiStep): string {
  const L: string[] = [];
  if (s.name) {
    L.push(`      - name: ${s.name}`);
    if (s.uses) L.push(`        uses: ${s.uses}`);
  } else {
    L.push(`      - uses: ${s.uses}`);
  }
  if (s.with) {
    L.push(`        with:`);
    for (const [k, v] of Object.entries(s.with)) L.push(`          ${k}: ${JSON.stringify(v)}`);
  }
  if (s.shell) L.push(`        shell: ${s.shell}`);
  if (s.run) {
    L.push(`        run: |`);
    for (const ln of s.run.split("\n")) L.push(`          ${ln}`);
  }
  return L.join("\n");
}

// The full ci.yml text. `project` names the workflow + concurrency group.
export function ciWorkflowYaml(project: string, runner: string, setup: CiStep[]): string {
  const steps: CiStep[] = [
    { uses: "actions/checkout@v6" },
    ...setup,
    {
      name: "Install sidecar",
      shell: "bash",
      run: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/dancinlab/sidecar/main/scripts/install.sh)"\necho "$HOME/.local/bin" >> "$GITHUB_PATH"',
    },
    { name: "Verify — sidecar ci (repo verify.checks)", run: "sidecar ci" },
    { name: "Lint — sidecar lint (advisory in CI)", run: "sidecar lint || true" },
  ];
  return `# ${project} CI — runs \`sidecar ci\` (verify.checks) on the configured runner.
#
# Generated by \`sidecar ci scaffold\` (also written by \`sidecar init\`). The checks are
# the repo's own verify.checks (config-driven) — edit them in harness.config.json, not
# here. Change the runner / stack setup via config \`ci.runner\` / \`ci.setup\`, then
# re-scaffold.

name: ${project}-ci

on:
  push:
    branches: [main, master]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ${project}-ci-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: sidecar ci
    runs-on: ${runner}
    timeout-minutes: 20
    steps:
${steps.map(serializeStep).join("\n")}
`;
}

// Write .github/workflows/ci.yml. Create-if-absent unless --force. Returns 0/1.
export function ciScaffold(args: string[]): number {
  const force = args.includes("--force");
  const cfg = config();
  // Runner comes from config `ci.runner` (default `ubuntu-latest`). No runner-brand
  // enforcement — a repo can set any `runs-on:` label it wants.
  const setup = cfg.ci.setup.length ? cfg.ci.setup : defaultCiSetup();
  const out = resolve(REPO_ROOT, ".github/workflows/ci.yml");
  if (existsSync(out) && !force) {
    warn(`ci scaffold: .github/workflows/ci.yml exists — pass --force to overwrite`);
    return 0;
  }
  try {
    mkdirSync(resolve(REPO_ROOT, ".github/workflows"), { recursive: true });
    writeFileSync(out, ciWorkflowYaml(cfg.project, cfg.ci.runner, setup));
  } catch (e) {
    return loudFail(`ci scaffold: write failed — ${(e as Error).message}`), 1;
  }
  ok(`ci scaffold: wrote .github/workflows/ci.yml (runner=${cfg.ci.runner}, ${setup.length} setup step(s))`);
  info("  검증 명령은 harness.config.json 의 verify.checks · 러너/셋업은 config ci.{runner,setup}");
  return 0;
}
