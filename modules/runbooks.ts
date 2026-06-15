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
import { info, ok } from "../lib/log.ts";

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
  printTemplate("dojo");
  if (!slug) {
    info("\n(scaffold: `harness dojo <slug> [--lang=hexa|py|both] [--force]`)");
    return 0;
  }
  const dir = resolve(REPO_ROOT, "exports", "dojo", slug);
  const lang = (args.find((a) => a.startsWith("--lang="))?.split("=")[1] ?? "py");
  const drvExt = lang === "hexa" || lang === "both" ? "hexa" : "py";
  const files: Record<string, string> = {
    [`job.${drvExt}`]: `// dojo job driver — ${slug}\n// config · hyperparams · data/model paths · checkpoint policy\n`,
    "train.py": `# dojo trainer — ${slug}\n# loop · optimizer · logging · ckpt save\n`,
    "run.sh": `#!/usr/bin/env bash\n# dojo glue — ${slug}: env → preflight → fire → poll → harvest → down\nset -e\n# harness pod preflight … ; harness pod fire … ; harness pod poll … ; harness pod down …\n`,
  };
  mkdirSync(dir, { recursive: true });
  let created = 0;
  for (const [f, body] of Object.entries(files)) {
    const p = resolve(dir, f);
    if (existsSync(p) && !force) continue;
    writeFileSync(p, body, f === "run.sh" ? { mode: 0o755 } : undefined);
    created++;
  }
  ok(`\ndojo: scaffolded exports/dojo/${slug}/ (${created} file(s), lang=${lang}). fill spec + run.sh.`);
  return 0;
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
