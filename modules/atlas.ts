// harness atlas {add <id> <claim...> | list | link <id> <slug>/<vid> | show}
// Knowledge / claim registry (hexa atlas parity). Each atom = a verifiable claim
// with a tier and an optional pointer to its verdict file (state/<slug>/<id>).
// Atoms live in repo-root ATLAS.md (committable table) + a ledger; an atom is only
// "verified" when it links a PASS verdict — never an LLM self-judgement.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { info, ok } from "../lib/log.ts";

function atlasPath(): string {
  return resolve(REPO_ROOT, "ATLAS.md");
}
const HEADER = `# ATLAS — claim registry

> 📍 SSOT: [ARCHITECTURE.md](ARCHITECTURE.md) · verdicts in \`state/\`
> Each atom = a verifiable claim. An atom is VERIFIED only when it links a PASS verdict (\`harness verdict\`). Never LLM-judge.

| id | claim | tier | verdict |
|----|-------|------|---------|
`;

function read(): string {
  const p = atlasPath();
  if (!existsSync(p)) {
    writeFileSync(p, HEADER, "utf8");
    return HEADER;
  }
  return readFileSync(p, "utf8");
}

function rows(text: string): string[] {
  return text.split("\n").filter((l) => /^\| /.test(l) && !/^\|\s*id\s*\|/.test(l) && !/^\|-+/.test(l.replace(/\s/g, "")));
}

export async function runAtlas(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";
  const text = read();

  if (sub === "add") {
    const id = args[1];
    const claim = args.slice(2).join(" ");
    if (!id || !claim) {
      info("usage: harness atlas add <id> <claim...>");
      return 1;
    }
    const lines = text.split("\n").filter((l) => !new RegExp(`^\\|\\s*${id}\\s*\\|`).test(l));
    const sep = lines.findIndex((l) => /^\|-+/.test(l.replace(/\s/g, "")));
    const row = `| ${id} | ${claim} | 🟠 unverified | — |`;
    if (sep >= 0) lines.splice(sep + 1, 0, row);
    else lines.push(row);
    writeFileSync(atlasPath(), lines.join("\n"), "utf8");
    ok(`atlas: + ${id} (🟠 unverified — link a PASS verdict to verify)`);
    return 0;
  }

  if (sub === "link") {
    const id = args[1];
    const vid = args[2];
    if (!id || !vid) {
      info("usage: harness atlas link <id> <slug>/<verdict-id>");
      return 1;
    }
    const vfile = resolve(REPO_ROOT, "state", vid + ".txt");
    let tier = "🟠 unverified";
    if (existsSync(vfile)) tier = /# tier: PASS/.test(readFileSync(vfile, "utf8")) ? "🟢 PASS" : "🔴 FAIL";
    const lines = text.split("\n").map((l) =>
      new RegExp(`^\\|\\s*${id}\\s*\\|`).test(l)
        ? l.replace(/\|[^|]*\|[^|]*\|$/, `| ${tier} | state/${vid}.txt |`)
        : l
    );
    writeFileSync(atlasPath(), lines.join("\n"), "utf8");
    info(`atlas: ${id} ← ${vid} (${tier})`);
    return 0;
  }

  if (sub === "show") {
    process.stdout.write(text);
    return 0;
  }

  // list
  const rs = rows(text);
  if (!rs.length) {
    info("atlas: no atoms. `harness atlas add <id> <claim>`");
    return 0;
  }
  const verified = rs.filter((r) => r.includes("🟢")).length;
  info(`atlas: ${verified}/${rs.length} verified`);
  for (const r of rs) info(`  ${r}`);
  return 0;
}
