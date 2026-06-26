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
    for (const [k, v] of Object.entries(s.with)) {
      // Multi-line string value → YAML literal block (e.g. actions/cache `path`).
      if (typeof v === "string" && v.includes("\n")) {
        L.push(`          ${k}: |`);
        for (const ln of v.split("\n")) L.push(`            ${ln}`);
      } else {
        L.push(`          ${k}: ${JSON.stringify(v)}`);
      }
    }
  }
  if (s.shell) L.push(`        shell: ${s.shell}`);
  if (s.run) {
    L.push(`        run: |`);
    for (const ln of s.run.split("\n")) L.push(`          ${ln}`);
  }
  return L.join("\n");
}

// A `runs-on:` value → its JSON form for `fromJSON()`. A YAML list literal
// (`[self-hosted, Linux, X64]`) becomes a JSON array; a bare label becomes a JSON
// string. Used by the fallback-dispatch job so one output covers either shape.
export function runnerToJson(runner: string): string {
  const t = runner.trim();
  if (t.startsWith("[") && t.endsWith("]")) {
    const items = t.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    return JSON.stringify(items);
  }
  return JSON.stringify(t);
}

// The full ci.yml text. `project` names the workflow + concurrency group.
// `opts.fallback` (a github-hosted label) turns on the cost-free fast path:
// a dispatch job prefers the self-hosted pool when online, else this fallback.
// `opts.cachePaths` emits a warm-reuse actions/cache step after checkout.
export function ciWorkflowYaml(
  project: string,
  runner: string,
  setup: CiStep[],
  opts: { fallback?: string; cachePaths?: string[] } = {}
): string {
  const fallback = opts.fallback?.trim();
  const cachePaths = (opts.cachePaths ?? []).filter(Boolean);

  const cacheStep: CiStep[] = cachePaths.length
    ? [
        {
          name: "Cache build (warm reuse)",
          uses: "actions/cache@v4",
          with: {
            // `path` is newline-joined; serializeStep emits it as a literal block via `run`-style.
            path: cachePaths.join("\n"),
            // sha key writes a fresh entry each run; restore-keys warm-restores the latest.
            key: `\${{ runner.os }}-${project}-ci-\${{ github.sha }}`,
            "restore-keys": `\${{ runner.os }}-${project}-ci-`,
          },
        },
      ]
    : [];

  const steps: CiStep[] = [
    { uses: "actions/checkout@v6" },
    ...cacheStep,
    ...setup,
    {
      name: "Install sidecar",
      shell: "bash",
      run: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/dancinlab/sidecar/main/scripts/install.sh)"\necho "$HOME/.local/bin" >> "$GITHUB_PATH"',
    },
    { name: "Verify — sidecar ci (repo verify.checks)", run: "sidecar ci" },
    { name: "Lint — sidecar lint (advisory in CI)", run: "sidecar lint || true" },
  ];

  const header = `# ${project} CI — runs \`sidecar ci\` (verify.checks) on the configured runner.
#
# Generated by \`sidecar ci scaffold\` (also written by \`sidecar init\`). The checks are
# the repo's own verify.checks (config-driven) — edit them in harness.config.json, not
# here. Change the runner / stack setup via config \`ci.runner\` / \`ci.setup\`, then
# re-scaffold.${
    fallback
      ? `
#
# Fast-free path (config \`ci.fallback\`): the \`pick-runner\` job prefers the self-hosted
# pool when a runner is ONLINE+idle (free 12-core on public repos), else falls back to
# \`${fallback}\` (free github-hosted). Probing repo runners needs a PAT — set secret
# \`RUNNER_PROBE_TOKEN\` (admin:read) to enable preference; without it (or on any error /
# offline pool) it safely uses the fallback, so CI never queues forever. No Blacksmith.`
      : ""
  }

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
`;

  if (!fallback) {
    return `${header}  verify:
    name: sidecar ci
    runs-on: ${runner}
    timeout-minutes: 20
    steps:
${steps.map(serializeStep).join("\n")}
`;
  }

  // Fast-free: dispatch job picks self-hosted-when-online, else fallback (safe-by-construction).
  const selfJson = runnerToJson(runner);
  const backJson = runnerToJson(fallback);
  return `${header}  pick-runner:
    name: pick runner (self-hosted ▸ fallback)
    runs-on: ${fallback}
    timeout-minutes: 2
    outputs:
      runs_on: \${{ steps.pick.outputs.runs_on }}
    steps:
      - id: pick
        env:
          GH_TOKEN: \${{ secrets.RUNNER_PROBE_TOKEN || github.token }}
        shell: bash
        run: |
          # Prefer the free self-hosted pool when a runner is ONLINE+idle; otherwise use
          # the free github-hosted fallback. Safe by construction: any probe error
          # (missing PAT / 403 / offline) -> fallback, so CI never queues forever.
          self='${selfJson}'
          back='${backJson}'
          pick="$back"
          if avail=$(gh api "repos/\${{ github.repository }}/actions/runners" \\
                       --jq '[.runners[] | select(.status=="online" and (.busy|not))] | length' 2>/dev/null); then
            if [ "\${avail:-0}" -ge 1 ]; then pick="$self"; fi
          fi
          echo "runs_on=$pick" >> "$GITHUB_OUTPUT"
          echo "picked runner: $pick"

  verify:
    name: sidecar ci
    needs: pick-runner
    runs-on: \${{ fromJSON(needs.pick-runner.outputs.runs_on) }}
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
    writeFileSync(
      out,
      ciWorkflowYaml(cfg.project, cfg.ci.runner, setup, { fallback: cfg.ci.fallback, cachePaths: cfg.ci.cachePaths })
    );
  } catch (e) {
    return loudFail(`ci scaffold: write failed — ${(e as Error).message}`), 1;
  }
  const fast = cfg.ci.fallback
    ? ` · fast-free: self-hosted ▸ ${cfg.ci.fallback} fallback`
    : "";
  ok(`ci scaffold: wrote .github/workflows/ci.yml (runner=${cfg.ci.runner}, ${setup.length} setup step(s)${fast})`);
  info("  검증 명령은 harness.config.json 의 verify.checks · 러너/셋업/fallback/캐시는 config ci.{runner,setup,fallback,cachePaths}");
  if (cfg.ci.fallback) info("  pool 우선 활성화하려면 repo secret RUNNER_PROBE_TOKEN(admin:read PAT) — 없으면 안전하게 fallback(무료 github-hosted)");
  return 0;
}
