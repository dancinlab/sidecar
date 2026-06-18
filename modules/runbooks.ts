// harness pod | demi | dojo | micro-exp — sidecar parity as harness runbooks.
//   pod       — GPU cloud pod dispatch runbook (preflight→fire→poll→harvest→down)
//   demi      — design-architecture program runbook (7-verb spine)
//   dojo      — cloud training-job scaffolder: prints runbook + (with a slug) emits
//               exports/dojo/<slug>/{job,train,run.sh}
//   micro-exp — context-driven micro-experiment sweep runbook + (with a scope) emits
//               exports/sweep/<batch_id>/{ledger,state}.json
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { HARNESS_ROOT, REPO_ROOT } from "../lib/paths.ts";
import { info, ok, warn } from "../lib/log.ts";
import { config } from "../lib/config.ts";
import { execArgs } from "../lib/exec.ts";

function printTemplate(name: string): number {
  const tpl = resolve(HARNESS_ROOT, "templates", `${name}.md`);
  if (!existsSync(tpl)) {
    info(`runbook missing: templates/${name}.md`);
    return 1;
  }
  process.stdout.write(readFileSync(tpl, "utf8"));
  return 0;
}

export async function runPod(_args: string[]): Promise<number> {
  return printTemplate("pod");
}

export async function runDemi(_args: string[]): Promise<number> {
  return printTemplate("demi");
}

export async function runDojo(args: string[]): Promise<number> {
  const slug = args.find((a) => !a.startsWith("-"));
  const force = args.includes("--force");
  // dojo defaults are CONFIG-carried (engine stays domain-agnostic): the preferred
  // language, the human stack label, and an optional `hexa dojo` domain to delegate
  // real artifact generation to. Absent config → the generic py stub (back-compat).
  const dojoCfg = config().dojo ?? {};
  const lang = args.find((a) => a.startsWith("--lang="))?.split("=")[1] ?? dojoCfg.defaultLang ?? "py";
  const stack = dojoCfg.stack;

  printTemplate("dojo");
  if (stack) info(`\n(default stack: ${stack}${dojoCfg.delegate ? ` · delegates to \`hexa dojo ${dojoCfg.delegate}\`` : ""})`);
  if (!slug) {
    info("(scaffold: `harness dojo <slug> [--lang=hexa|py|both] [--force]`)");
    return 0;
  }

  // delegate to the real `hexa dojo <domain>` emitter when configured AND hexa is
  // available — that yields the REAL stack artifacts (flame/forge train.hexa,
  // hexa_cuda nvptx kernel) instead of the generic stub.
  if (dojoCfg.delegate && (lang === "hexa" || lang === "both")) {
    const probe = await execArgs("bash", ["-lc", "command -v hexa"]).catch(() => null);
    if (probe && probe.code === 0) {
      info(`\ndojo: delegating to \`hexa dojo ${dojoCfg.delegate} ${slug}\` (stack=${stack ?? dojoCfg.delegate})…`);
      const r = await execArgs("hexa", ["dojo", dojoCfg.delegate, slug, "{}", `--lang=${lang}`], { cwd: REPO_ROOT });
      if (r.stdout) process.stdout.write(r.stdout);
      if (r.stderr) process.stderr.write(r.stderr);
      if (r.code === 0) return 0;
      warn(`\nhexa dojo delegate exited ${r.code} — falling back to the generic stub.`);
    } else {
      warn(`\nhexa not on PATH — config sets dojo.delegate=${dojoCfg.delegate} but cannot delegate; emitting the generic stub instead.`);
    }
  }

  const dir = resolve(REPO_ROOT, "exports", "dojo", slug);
  const hexaNative = lang === "hexa" || lang === "both";
  const drvExt = hexaNative ? "hexa" : "py";
  // run.sh glue calls the REAL canonical surfaces: `hexa cloud fire`/`fire-shards`
  // for dispatch (NOT a hand-rolled launcher loop, NOT the non-existent `harness
  // pod fire`), and — for the hexa-native stack — `hexa run` to drive the
  // flame/forge trainer.
  const driveCmd = hexaNative
    ? `hexa run train.${drvExt}   # flame trainer over the forge substrate (CPU fallback · forge-GPU host accelerates unchanged)`
    : `python3 train.py`;
  const files: Record<string, string> = {
    [`job.${drvExt}`]: `// dojo job driver — ${slug}${stack ? ` (stack: ${stack})` : ""}\n// config · hyperparams · data/model paths · checkpoint policy\n`,
    [`train.${drvExt}`]: hexaNative
      ? `// dojo flame trainer — ${slug}\n// deterministic data · forward · closed-form backward · optimizer step · descent gate\n`
      : `# dojo trainer — ${slug}\n# loop · optimizer · logging · ckpt save\n`,
    "run.sh":
      `#!/usr/bin/env bash\n` +
      `# dojo glue — ${slug}${stack ? ` · stack=${stack}` : ""}: env → preflight → fire → poll → harvest → down\n` +
      `set -e\n` +
      `# preflight (no spinup): hexa cloud preflight …\n` +
      `# single job:    hexa cloud fire   <host> -- ${driveCmd}\n` +
      `# sharded batch: hexa cloud fire-shards <host> --jobs jobs.tsv --shards N --stagger 8 --cmd '${driveCmd}'\n` +
      `# poll/harvest:  hexa cloud poll <host> ; hexa cloud copy-from <host> … ; hexa cloud down <host>\n`,
  };
  mkdirSync(dir, { recursive: true });
  let created = 0;
  for (const [f, body] of Object.entries(files)) {
    const p = resolve(dir, f);
    if (existsSync(p) && !force) continue;
    writeFileSync(p, body, f === "run.sh" ? { mode: 0o755 } : undefined);
    created++;
  }
  ok(`\ndojo: scaffolded exports/dojo/${slug}/ (${created} file(s), lang=${lang}${stack ? `, stack=${stack}` : ""}). fill spec + run.sh.`);
  return 0;
}

export async function runGap(args: string[]): Promise<number> {
  printTemplate("gap");
  const arg = args.join(" ").trim();
  info(`\n# arguments: ${arg || "(none → mode C · target = current work in context)"}`);
  return 0;
}

export async function runBypass(_args: string[]): Promise<number> {
  return printTemplate("bypass");
}

export async function runGo(_args: string[]): Promise<number> {
  return printTemplate("go");
}

export async function runBrainstorm(_args: string[]): Promise<number> {
  return printTemplate("brainstorm");
}

export async function runMicroExp(args: string[]): Promise<number> {
  const scope = args.find((a) => !a.startsWith("-"));
  const force = args.includes("--force");
  printTemplate("micro-exp");
  if (!scope) {
    info("\n(scaffold a batch: `harness micro-exp <scope|batch_id> [--force]`)");
    return 0;
  }
  // batch_id from the scope slug (caller appends a date in context if wanted)
  const batch = scope.replace(/[^a-zA-Z0-9._-]/g, "-");
  const dir = resolve(REPO_ROOT, "exports", "sweep", batch);
  const files: Record<string, string> = {
    "ledger.json": JSON.stringify({ batch_id: batch, candidates: [], waves: [], note: "typed aggregate surface — never let it drift from atlas/verdict state" }, null, 2) + "\n",
    "state.json": JSON.stringify({ batch_id: batch, budget: { pod_concurrent_max: 4 }, dispatched: [] }, null, 2) + "\n",
  };
  mkdirSync(dir, { recursive: true });
  let created = 0;
  for (const [f, body] of Object.entries(files)) {
    const p = resolve(dir, f);
    if (existsSync(p) && !force) continue;
    writeFileSync(p, body);
    created++;
  }
  ok(`\nmicro-exp: scaffolded exports/sweep/${batch}/ (${created} file(s)). enumerate candidates from context → Stage 1.5 infra gate → dispatch.`);
  return 0;
}
