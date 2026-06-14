// harness pod | demi | dojo — sidecar pod/demiurge/dojo parity as harness runbooks.
//   pod  — GPU cloud pod dispatch runbook (preflight→fire→poll→harvest→down)
//   demi — design-architecture program runbook (7-verb spine)
//   dojo — cloud training-job scaffolder: prints runbook + (with a slug) emits
//          exports/dojo/<slug>/{job,train,run.sh}
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
