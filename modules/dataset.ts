// sidecar dataset {list|show|add|set|feat|rm}
// Per-repo DATASET REGISTRY — the data-side mirror of `sidecar model`. Datasets
// live in the repo-root ARCHITECTURE.json as the top-level `datasets` array (a
// sibling key of `models`/`meta`/`sections`/`convergence` — same single-doc home
// as the model registry), so corpora are part of the design tree, not a
// scattered side-file. One object per dataset tracks identity (repo_id · lang ·
// register · rows · size · visibility · role) plus two flexible axes —
//   lang_verified  언어검증  is the ko/en claim MEASURED (a_chat_registers), not just intended?
//   features[]     특징      tags, e.g. ["ko","general","fineweb2"]
// Generic across repos: sidecar fixes the core fields + the flexible axes; each
// repo records its OWN register/role labels and feature tags (no project
// coupling). `list` renders a 4-cell lang × register grid (the chat-corpus
// coverage view) and accepts --lang / --register filters.
//
// Storage mirrors `sidecar model` (read root JSON, update one top-level key in
// place) with the same MINIMAL-DIFF writer: instead of re-stringifying the whole
// tree — which would reformat every compact inline node and explode the diff
// (and collide with concurrent ARCHITECTURE.json editors) — we splice only the
// top-level `datasets` block, leaving the rest of the file byte-identical.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "../lib/paths.ts";
import { info, ok, loudFail } from "../lib/log.ts";

const ARCH_REL = "ARCHITECTURE.json";
const ARCH = resolve(REPO_ROOT, ARCH_REL);

type Dataset = {
  id: string;
  repo_id?: string; // HF repo_id, e.g. dancinlab/anima-corpus-ko-general
  lang?: string; // ko | en
  register?: string; // general | sns
  rows?: number | string;
  size?: string;
  visibility?: string; // public | private
  role?: string; // e.g. chat-4cell (a_chat_registers)
  lang_verified?: boolean; // 언어검증 — is the ko/en claim measured, not just intended?
  features?: string[]; // 특징
  note?: string;
  updated?: string; // ISO timestamp
};

const CORE = ["repo_id", "lang", "register", "rows", "size", "visibility", "role", "note"] as const;

// Read the repo-root ARCHITECTURE.json `.datasets[]`. Missing file or absent key → [].
function load(): Dataset[] {
  if (!existsSync(ARCH)) return [];
  try {
    const root = JSON.parse(readFileSync(ARCH, "utf8")) as { datasets?: Dataset[] };
    return Array.isArray(root.datasets) ? root.datasets.filter((d): d is Dataset => !!d && !!d.id) : [];
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

// Minimal-diff write: splice ONLY the top-level `datasets` block (2-space indent)
// into the existing ARCHITECTURE.json, leaving every other byte untouched. If
// the file or the `datasets` key is absent we create it (key inserted right after
// the `models` block when present, else as the first top-level entry). Never
// reformats the rest of the tree.
function save(rows: Dataset[]): void {
  rows.sort((a, b) => a.id.localeCompare(b.id));
  // Serialize the array at 2-space, then indent each line by 2 more so it sits
  // at the root object's value position (`  "datasets": [ … ]`).
  const block = '"datasets": ' + JSON.stringify(rows, null, 2).split("\n").join("\n  ");

  if (!existsSync(ARCH)) {
    writeFileSync(ARCH, JSON.stringify({ datasets: rows }, null, 2) + "\n", "utf8");
    return;
  }
  const raw = readFileSync(ARCH, "utf8");
  // Existing top-level "datasets" key (2-space indent anchors it to the root).
  const m = raw.match(/\n {2}"datasets":\s*\[/);
  if (m && m.index !== undefined) {
    const open = raw.indexOf("[", m.index);
    const end = findArrayEnd(raw, open);
    if (end < 0) {
      loudFail("dataset: could not parse existing .datasets array in ARCHITECTURE.json (malformed JSON?)");
      throw new Error("datasets array parse failure");
    }
    writeFileSync(ARCH, raw.slice(0, m.index + 1) + "  " + block + raw.slice(end + 1), "utf8");
    return;
  }
  // No datasets key yet — insert right after the `models` block so the two
  // registries sit adjacent (preserving models' trailing comma).
  const mm = raw.match(/\n {2}"models":\s*\[/);
  if (mm && mm.index !== undefined) {
    const open = raw.indexOf("[", mm.index);
    const end = findArrayEnd(raw, open);
    if (end >= 0) {
      let at = end + 1;
      if (raw[at] === ",") at++; // keep models' comma before our block
      writeFileSync(ARCH, raw.slice(0, at) + "\n  " + block + "," + raw.slice(at), "utf8");
      return;
    }
  }
  // Otherwise insert as the first top-level key, right after `{`.
  const brace = raw.indexOf("{");
  if (brace < 0) {
    loudFail("dataset: ARCHITECTURE.json has no root object");
    throw new Error("no root object");
  }
  const nl = raw.indexOf("\n", brace);
  const insertAt = nl < 0 ? brace + 1 : nl + 1;
  writeFileSync(ARCH, raw.slice(0, insertAt) + "  " + block + ",\n" + raw.slice(insertAt), "utf8");
}

function find(rows: Dataset[], id: string): Dataset | undefined {
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

// rows can be a count or a free-text size band — store a number when numeric.
function coerceRows(v: string): number | string {
  const n = Number(v);
  return v.trim() !== "" && !Number.isNaN(n) ? n : v;
}

// truthy flag → boolean (bare --lang-verified, or =true/yes/1)
function truthy(v: string | undefined): boolean {
  return v === undefined || v === "true" || v === "yes" || v === "1";
}

function stamp(d: Dataset): Dataset {
  d.updated = new Date().toISOString();
  return d;
}

function badge(d: Dataset): string {
  const rows = d.rows === undefined ? "?" : String(d.rows);
  const lv = d.lang_verified === true ? "✓lang" : d.lang_verified === false ? "✗lang" : "";
  return [d.size, `${rows} rows`, d.visibility, lv].filter(Boolean).join(" · ");
}

function usage(): number {
  info(
    [
      "sidecar dataset — per-repo dataset registry (SSOT = ARCHITECTURE.json .datasets[])",
      "  list [--lang ko|en] [--register general|sns] [--json]   모든 데이터셋 + 4칸 lang×register 그리드",
      "  show <id>                            한 데이터셋 전체 JSON",
      "  add  <id> [--repo_id --lang --register --rows --size --visibility --role --note --lang-verified --features a,b,c]",
      "  set  <id> <field> <value...>         핵심 필드 갱신 (repo_id/lang/register/rows/size/visibility/role/note)",
      "  feat <id> <tag...> [--add]           특징 태그 set (또는 --add 로 추가)",
      "  rm <id> --yes                        registry 항목 제거",
    ].join("\n"),
  );
  return 1;
}

export async function runDataset(args: string[]): Promise<number> {
  const sub = args[0] ?? "list";
  const rest = args.slice(1);

  if (sub === "list") {
    const { f } = flags(rest);
    let rows = load();
    if (f.lang) rows = rows.filter((r) => r.lang === f.lang);
    if (f.register) rows = rows.filter((r) => r.register === f.register);
    if (f.json) {
      process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
      return 0;
    }
    if (!rows.length) {
      info(`dataset: registry empty (${ARCH_REL} .datasets[]). \`sidecar dataset add <id> --lang … --register …\``);
      return 0;
    }
    info(`DATASETS — ${rows.length} (SSOT ${ARCH_REL} .datasets[])`);
    for (const d of rows) {
      const tags = (d.features ?? []).join(",");
      process.stdout.write(
        `  · ${d.id.padEnd(26)} ${d.lang ?? "?"}/${d.register ?? "?"}  (${badge(d)})\n` +
          (tags ? `     특징 ${tags}\n` : "") +
          (d.repo_id ? `     hf   ${d.repo_id}\n` : ""),
      );
    }
    // 4-cell lang × register coverage grid (only when not filtered to one axis).
    if (!f.lang && !f.register) {
      const all = load();
      process.stdout.write("  4칸 (lang × register):\n");
      for (const lang of ["ko", "en"]) {
        for (const reg of ["general", "sns"]) {
          const hit = all.find((d) => d.lang === lang && d.register === reg);
          const mark = hit ? "🟢" : "⚪";
          const detail = hit ? `${hit.id} · ${hit.rows ?? "?"} rows` : "(empty)";
          process.stdout.write(`    ${mark} ${lang}/${reg}: ${detail}\n`);
        }
      }
    }
    return 0;
  }

  if (sub === "show") {
    const id = rest[0];
    const d = id ? find(load(), id) : undefined;
    if (!d) {
      info(`dataset: no entry for ${id ?? "<id>"}`);
      return 1;
    }
    process.stdout.write(JSON.stringify(d, null, 2) + "\n");
    return 0;
  }

  if (sub === "add") {
    const { _, f } = flags(rest);
    const id = _[0];
    if (!id) return usage();
    const rows = load();
    if (find(rows, id)) {
      loudFail(`dataset: ${id} already exists — use \`sidecar dataset set ${id} …\``);
      return 1;
    }
    const d: Dataset = { id };
    for (const k of CORE) if (f[k] !== undefined) (d as Record<string, unknown>)[k] = k === "rows" ? coerceRows(f[k]) : f[k];
    if (f["lang-verified"] !== undefined) d.lang_verified = truthy(f["lang-verified"]);
    if (f.features) d.features = f.features.split(",").map((s) => s.trim()).filter(Boolean);
    rows.push(stamp(d));
    save(rows);
    ok(`dataset + ${id} → ${ARCH_REL} .datasets[]`);
    return 0;
  }

  if (sub === "set") {
    const id = rest[0];
    const field = rest[1];
    const value = rest.slice(2).join(" ");
    const rows = load();
    const d = id ? find(rows, id) : undefined;
    if (!d || !field) return usage();
    if (field === "lang-verified" || field === "lang_verified") {
      d.lang_verified = truthy(value);
    } else if ((CORE as readonly string[]).includes(field)) {
      (d as Record<string, unknown>)[field] = field === "rows" ? coerceRows(value) : value;
    } else {
      loudFail(`dataset: '${field}' is not a core field (use feat for tags, lang-verified for the flag). core: ${CORE.join(" ")}`);
      return 1;
    }
    stamp(d);
    save(rows);
    ok(`dataset ${id}: ${field} = ${value}`);
    return 0;
  }

  if (sub === "feat") {
    const { _, f } = flags(rest);
    const id = _[0];
    const tags = _.slice(1);
    const rows = load();
    const d = id ? find(rows, id) : undefined;
    if (!d || !tags.length) return usage();
    d.features = f.add ? Array.from(new Set([...(d.features ?? []), ...tags])) : tags;
    stamp(d);
    save(rows);
    ok(`dataset ${id}: 특징 ${d.features.join(",")}`);
    return 0;
  }

  if (sub === "rm") {
    const { _, f } = flags(rest);
    const id = _[0];
    const rows = load();
    if (!id || !find(rows, id)) return usage();
    if (!f.yes) {
      loudFail(`dataset: refuse rm ${id} without --yes (removes registry entry; data files untouched)`);
      return 1;
    }
    save(rows.filter((r) => r.id !== id));
    ok(`dataset − ${id} (registry entry removed)`);
    return 0;
  }

  return usage();
}
