// sidecar model {list|show|add|set|gate|feat|verify|rm|prune}
// Per-repo MODEL REGISTRY — the design SSOT. Models live in the repo-root
// ARCHITECTURE.json as the top-level `models` array (a sibling key of
// `meta`/`sections`/`convergence` — same single-doc home as the convergence
// store), so the model registry is part of the design tree, not a scattered
// side-file. One object per model tracks identity (arch · version · params ·
// base · tier · sha256 · local path · HF repo) plus three living axes the user
// asked for —
//   version    아키텍처-family SemVer, e.g. ByteGPT 1.0 · ConvMoE 2.1 (registry
//              META field — NOT a filename suffix; canonical-naming stays clean)
//   gates{}    검증 충족도  gate-satisfaction, e.g. {"C1":"pass","C4":"fail","heldout":"4/4 DESCENT"}
//   progress   진행척도     free-text lifecycle, e.g. "trained·serialized·DIRECTIONAL(engine-native pending)"
//   features[] 특징         tags, e.g. ["ko","en","sns","ConvMoE","303M"]
// Generic across repos: sidecar fixes the core fields + the three flexible
// axes; each repo records its OWN gate names and feature tags (no project
// coupling). `verify` recomputes the weight-file sha256 to catch silent
// corruption/drift; `prune` deletes a local weight only AFTER it is on HF and
// its sha matches (mirrors the a_hf_registry safe-prune rule, but generic).
//
// Storage mirrors `architecture convergence` (read root JSON, update one
// top-level key in place) but with a MINIMAL-DIFF writer: instead of
// re-stringifying the whole tree — which would reformat every compact inline
// node and explode the diff (and collide with concurrent ARCHITECTURE.json
// editors) — we splice only the top-level `models` block, leaving the rest of
// the file byte-identical.
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { REPO_ROOT } from "../lib/paths.ts";
import { info, ok, loudFail } from "../lib/log.ts";

const ARCH_REL = "ARCHITECTURE.json";
const ARCH = resolve(REPO_ROOT, ARCH_REL);

type Model = {
  id: string;
  arch?: string;
  version?: string; // 아키텍처-family SemVer, e.g. ByteGPT 1.0 · ConvMoE 2.1
  params?: string;
  base?: string;
  tier?: string;
  sha256?: string;
  path?: string;
  hf?: string; // HF repo_id
  visibility?: string; // public | private
  gates?: Record<string, string>; // 검증 충족도
  progress?: string; // 진행척도
  features?: string[]; // 특징
  note?: string;
  pruned?: boolean;
  updated?: string; // ISO timestamp
};

const CORE = ["arch", "version", "params", "base", "tier", "sha256", "path", "hf", "visibility", "progress", "note"] as const;

// Read the repo-root ARCHITECTURE.json `.models[]`. Missing file or absent key → [].
function load(): Model[] {
  if (!existsSync(ARCH)) return [];
  try {
    const root = JSON.parse(readFileSync(ARCH, "utf8")) as { models?: Model[] };
    return Array.isArray(root.models) ? root.models.filter((m): m is Model => !!m && !!m.id) : [];
  } catch {
    return [];
  }
}

// String-aware bracket matcher: given the index of the array's `[`, return the
// index of its matching `]` (so a `]` inside a JSON string value can't fool us).
function findArrayEnd(raw: string, open: number): number {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = open; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "[") depth++;
    else if (c === "]") {
      if (--depth === 0) return i;
    }
  }
  return -1;
}

// Minimal-diff write: splice ONLY the top-level `models` block (2-space indent)
// into the existing ARCHITECTURE.json, leaving every other byte untouched. If
// the file or the `models` key is absent we create them (key inserted as the
// first top-level entry). Never reformats the rest of the tree.
function save(rows: Model[]): void {
  rows.sort((a, b) => a.id.localeCompare(b.id));
  // Serialize the array at 2-space, then indent each line by 2 more so it sits
  // at the root object's value position (`  "models": [ … ]`).
  const block = '"models": ' + JSON.stringify(rows, null, 2).split("\n").join("\n  ");

  if (!existsSync(ARCH)) {
    writeFileSync(ARCH, JSON.stringify({ models: rows }, null, 2) + "\n", "utf8");
    return;
  }
  const raw = readFileSync(ARCH, "utf8");
  // Existing top-level "models" key (2-space indent anchors it to the root).
  const m = raw.match(/\n {2}"models":\s*\[/);
  if (m && m.index !== undefined) {
    const open = raw.indexOf("[", m.index);
    const end = findArrayEnd(raw, open);
    if (end < 0) {
      loudFail("model: could not parse existing .models array in ARCHITECTURE.json (malformed JSON?)");
      throw new Error("models array parse failure");
    }
    writeFileSync(ARCH, raw.slice(0, m.index + 1) + "  " + block + raw.slice(end + 1), "utf8");
    return;
  }
  // No models key yet — insert as the first top-level key, right after `{`.
  const brace = raw.indexOf("{");
  if (brace < 0) {
    loudFail("model: ARCHITECTURE.json has no root object");
    throw new Error("no root object");
  }
  const nl = raw.indexOf("\n", brace);
  const insertAt = nl < 0 ? brace + 1 : nl + 1;
  writeFileSync(ARCH, raw.slice(0, insertAt) + "  " + block + ",\n" + raw.slice(insertAt), "utf8");
}

function find(rows: Model[], id: string): Model | undefined {
  return rows.find((r) => r.id === id);
}

// minimal --flag parser: --k v (or bare --k => "true"); positionals collected in _
function flags(args: string[]): { _: string[]; f: Record<string, string> } {
  const _: string[] = [];
  const f: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = i + 1 < args.length && !args[i + 1].startsWith("--") ? args[++i] : "true";
      f[k] = v;
    } else {
      _.push(a);
    }
  }
  return { _, f };
}

function sha256(p: string): string {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

function expand(p: string): string {
  return p.startsWith("~") ? resolve(process.env.HOME ?? "", p.slice(1).replace(/^\//, "")) : resolve(REPO_ROOT, p);
}

// compact gate-satisfaction badge: pass→✓ fail→✗ else K=V
function gateBadge(g?: Record<string, string>): string {
  if (!g || !Object.keys(g).length) return "—";
  return Object.entries(g)
    .map(([k, v]) => {
      const lv = String(v).toLowerCase();
      if (["pass", "true", "ok", "y", "yes"].includes(lv)) return `${k}✓`;
      if (["fail", "false", "no", "n"].includes(lv)) return `${k}✗`;
      return `${k}=${v}`;
    })
    .join(" ");
}

function stamp(m: Model): Model {
  m.updated = new Date().toISOString();
  return m;
}

function usage(): number {
  info(
    [
      "sidecar model — per-repo model registry (SSOT = ARCHITECTURE.json .models[])",
      "  list [--tier T] [--json]            모든 모델 (검증 충족도·진행·특징)",
      "  show <id>                           한 모델 전체",
      "  add  <id> [--arch --version --params --base --tier --sha --path --hf --visibility --progress --note --features a,b,c]",
      "  set  <id> <field> <value...>        핵심 필드 갱신 (arch/version/params/base/tier/sha256/path/hf/visibility/progress/note)",
      "  gate <id> <K=V> [K=V...]            검증 충족도 기록 (예: C1=pass C4=fail heldout='4/4 DESCENT')",
      "  feat <id> <tag...> [--add]          특징 태그 set (또는 --add 로 추가)",
      "  verify <id>                         weight 파일 sha256 재계산 → 기록값과 대조 (무결성)",
      "  prune <id>                          HF 업로드+sha 일치 확인 후 로컬 weight 삭제 (registry 보존)",
      "  rm <id> --yes                       registry 항목 제거",
    ].join("\n"),
  );
  return 1;
}

export async function runModel(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";
  const rest = args.slice(1);

  if (sub === "list") {
    const { f } = flags(rest);
    let rows = load();
    if (f.tier) rows = rows.filter((r) => r.tier === f.tier);
    if (f.json) {
      process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
      return 0;
    }
    if (!rows.length) {
      info(`model: registry empty (${ARCH_REL} .models[]). \`sidecar model add <id> --arch … --params …\``);
      return 0;
    }
    info(`MODELS — ${rows.length} (SSOT ${ARCH_REL} .models[])`);
    for (const m of rows) {
      const tags = (m.features ?? []).join(",");
      const ver = m.version ? ` v${m.version}` : "";
      process.stdout.write(
        `  ${m.pruned ? "📦" : "·"} ${m.id.padEnd(22)} ${m.arch ?? "?"}${ver}/${m.params ?? "?"}  [${m.tier ?? "-"}]\n` +
          `     검증 ${gateBadge(m.gates)}\n` +
          `     진행 ${m.progress ?? "—"}\n` +
          (tags ? `     특징 ${tags}\n` : "") +
          (m.hf ? `     hf   ${m.hf}${m.visibility ? " (" + m.visibility + ")" : ""}\n` : ""),
      );
    }
    return 0;
  }

  if (sub === "show") {
    const id = rest[0];
    const m = id ? find(load(), id) : undefined;
    if (!m) {
      info(`model: no entry for ${id ?? "<id>"}`);
      return 1;
    }
    process.stdout.write(JSON.stringify(m, null, 2) + "\n");
    return 0;
  }

  if (sub === "add") {
    const { _, f } = flags(rest);
    const id = _[0];
    if (!id) return usage();
    const rows = load();
    if (find(rows, id)) {
      loudFail(`model: ${id} already exists — use \`sidecar model set ${id} …\``);
      return 1;
    }
    const m: Model = { id };
    for (const k of CORE) if (f[k] !== undefined) (m as Record<string, unknown>)[k] = f[k];
    if (f.sha !== undefined) m.sha256 = f.sha;
    if (f.features) m.features = f.features.split(",").map((s) => s.trim()).filter(Boolean);
    rows.push(stamp(m));
    save(rows);
    ok(`model + ${id} → ${ARCH_REL} .models[]`);
    return 0;
  }

  if (sub === "set") {
    const id = rest[0];
    const field = rest[1];
    const value = rest.slice(2).join(" ");
    const rows = load();
    const m = id ? find(rows, id) : undefined;
    if (!m || !field) return usage();
    const key = field === "sha" ? "sha256" : field;
    if (!(CORE as readonly string[]).includes(key) && key !== "sha256") {
      loudFail(`model: '${field}' is not a core field (use gate/feat for those). core: ${CORE.join(" ")}`);
      return 1;
    }
    (m as Record<string, unknown>)[key] = value;
    stamp(m);
    save(rows);
    ok(`model ${id}: ${key} = ${value}`);
    return 0;
  }

  if (sub === "gate") {
    const id = rest[0];
    const rows = load();
    const m = id ? find(rows, id) : undefined;
    if (!m || rest.length < 2) return usage();
    m.gates = m.gates ?? {};
    for (const kv of rest.slice(1)) {
      const eq = kv.indexOf("=");
      if (eq < 0) {
        loudFail(`model gate: expected K=V, got '${kv}'`);
        return 1;
      }
      m.gates[kv.slice(0, eq)] = kv.slice(eq + 1);
    }
    stamp(m);
    save(rows);
    ok(`model ${id}: 검증 ${gateBadge(m.gates)}`);
    return 0;
  }

  if (sub === "feat") {
    const { _, f } = flags(rest);
    const id = _[0];
    const tags = _.slice(1);
    const rows = load();
    const m = id ? find(rows, id) : undefined;
    if (!m || !tags.length) return usage();
    m.features = f.add ? Array.from(new Set([...(m.features ?? []), ...tags])) : tags;
    stamp(m);
    save(rows);
    ok(`model ${id}: 특징 ${m.features.join(",")}`);
    return 0;
  }

  if (sub === "verify") {
    const id = rest[0];
    const rows = load();
    const m = id ? find(rows, id) : undefined;
    if (!m) return usage();
    if (!m.path || !existsSync(expand(m.path))) {
      loudFail(`model ${id}: path missing/not found (${m.path ?? "—"})`);
      return 1;
    }
    const got = sha256(expand(m.path));
    if (!m.sha256) {
      m.sha256 = got;
      stamp(m);
      save(rows);
      ok(`model ${id}: sha256 recorded ${got.slice(0, 16)}…`);
      return 0;
    }
    if (got === m.sha256) {
      ok(`model ${id}: sha256 MATCH ${got.slice(0, 16)}… (integrity OK)`);
      return 0;
    }
    loudFail(`model ${id}: sha256 MISMATCH — recorded ${m.sha256.slice(0, 16)}… got ${got.slice(0, 16)}… (corruption/drift)`);
    return 1;
  }

  if (sub === "prune") {
    const id = rest[0];
    const rows = load();
    const m = id ? find(rows, id) : undefined;
    if (!m) return usage();
    if (!m.hf) {
      loudFail(`model ${id}: refuse prune — no HF repo recorded (upload + \`model set ${id} hf <repo>\` first)`);
      return 1;
    }
    if (!m.path || !existsSync(expand(m.path))) {
      info(`model ${id}: local weight already absent — marking pruned`);
      m.pruned = true;
      stamp(m);
      save(rows);
      return 0;
    }
    if (m.sha256 && sha256(expand(m.path)) !== m.sha256) {
      loudFail(`model ${id}: refuse prune — sha256 mismatch (local weight differs from recorded; verify first)`);
      return 1;
    }
    rmSync(expand(m.path));
    m.pruned = true;
    stamp(m);
    save(rows);
    ok(`model ${id}: local weight pruned (HF ${m.hf} retained); registry entry kept`);
    return 0;
  }

  if (sub === "rm") {
    const { _, f } = flags(rest);
    const id = _[0];
    const rows = load();
    if (!id || !find(rows, id)) return usage();
    if (!f.yes) {
      loudFail(`model: refuse rm ${id} without --yes (removes registry entry; weight file untouched)`);
      return 1;
    }
    save(rows.filter((r) => r.id !== id));
    ok(`model − ${id} (registry entry removed)`);
    return 0;
  }

  return usage();
}
