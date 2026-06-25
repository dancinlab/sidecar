// sidecar paper <new|build|cover|list|publish|update|unpublish|status|help>
//
// Demiurge-house-style scientific-paper tool. Bakes the hard-won paper
// discipline into the sidecar so it is never hand-rolled per campaign:
//   • new   — scaffold PAPERS/<slug>/ with the house arxiv template
//             (emoji title · g5 tier-badge discs · TikZ+pgfplots · fal.ai cover
//              include · references.bib · PAPER.md), generate the cover via
//              `sidecar imagine` (fal), then build.
//   • build — xelatex → bibtex → xelatex → xelatex, report pages + refs + result
//             figures, and enforce TWO hard content floors: ≥10 pages (g51) AND
//             ≥9 result figures (= NeuroLM bar). Either miss = build fails (exit 3);
//             waive with --min-pages 0 / --min-figures 0.
//   • cover — (re)generate figures/cover.png via `sidecar imagine`.
//   • list  — list papers under the papers dir.
//
// Distribution lifecycle (keys via the `secret` CLI — never inline · commons git-safety):
//   • publish   — deploy the built paper. `--to zenodo` runs the full Zenodo REST
//                 lifecycle (create deposition → upload main.pdf [+ --source tarball]
//                 → metadata → publish → mint DOI). `--to arxiv` packages a
//                 submission-ready tarball + prints the upload guide (arXiv has NO
//                 submission API — SWORDv1 was retired; web upload is the only path,
//                 reported honestly, never faked).
//   • update    — Zenodo new-version (replace files + bump publication, fresh versioned DOI).
//   • unpublish — delete a Zenodo DRAFT deposition (published records cannot be deleted
//                 via API — only withdrawn by Zenodo support; reported, not faked).
//   • status    — show the per-paper publish ledger (PAPERS/<slug>/publish.json).
//   Tokens: `secret get zenodo.token` (prod) / `zenodo.sandbox_token` (--sandbox).
//
// Rationale (commons "self-improving tool" principle): every paper this repo
// family ships used the same template, the same xelatex+bibtex×3 build, the same
// ≥10-page g51 gate, and a fal.ai cover. Encoding that once here removes the
// per-paper hand-assembly that kept regressing (missing calc lib, emoji glyph
// warnings, bbl deleted before page-count, etc.).
//
// Quality target: templates/paper/_reference_samples/2409.00101_neurolm.pdf
// (NeuroLM, Jiang et al., ICLR 2025 — a third-party arxiv paper, read-only).
// The `new` template mirrors its section structure (Intro · Background · Method ·
// Experiments · Ablation · Discussion) and its RESULT-figure discipline (every
// figure caption ties to a specific result). A teaser/marketing cover is still
// ALLOWED (the cover include + `cover` verb stay) — that is a deliberate local
// divergence from NeuroLM, which ships cover-free.
import { execShell } from "../lib/exec.ts";
import { runImagine } from "./imagine.ts";
import { secretGet } from "./secret.ts";
import { info, ok, loudFail, warn } from "../lib/log.ts";
import { REPO_ROOT } from "../lib/paths.ts";
import { writeFileSync, mkdirSync, existsSync, readFileSync, statSync, rmSync } from "node:fs";
import { resolve, basename, isAbsolute } from "node:path";
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";

const DEFAULT_DIR = "PAPERS";
const DEFAULT_MIN_PAGES = 10; // commons g51
const DEFAULT_MIN_FIGURES = 9; // result-figure floor = NeuroLM quality bar (9+)

// ── demiurge house template (xelatex; emoji-native) ─────────────────────────
// Mirrors the SENOLYX/HERPES/NUMB/ANIMA preamble verbatim so every paper shares
// one look: emoji title, tier-badge discs, TikZ (+calc), pgfplots, natbib.
function mainTexTemplate(slug: string, title: string, subtitle: string): string {
  return String.raw`\documentclass[11pt,a4paper]{article}

% ---------- arxiv-style preamble (xelatex; emoji-native) — demiurge house style ----------
\usepackage[margin=1in]{geometry}
\usepackage{amsmath,amssymb,amsthm}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{siunitx}
\usepackage{hyperref}
\usepackage{xcolor}
\usepackage[numbers,sort&compress]{natbib}
\usepackage{tikz}
\usetikzlibrary{positioning,arrows.meta,fit,backgrounds,calc}
\usepackage{pgfplots}
\pgfplotsset{compat=1.18}
\usepgfplotslibrary{fillbetween}
\usepackage{caption}
\captionsetup{font=small,labelfont=bf}
\usepackage{array}

\hypersetup{colorlinks=true,linkcolor=blue!50!black,citecolor=blue!50!black,urlcolor=blue!50!black}

% ---------- g5 tier badges (engine-agnostic colored discs) ----------
\newcommand{\tierdisc}[1]{\textcolor{#1}{\rule[0.05ex]{1.0ex}{1.0ex}}}
\newcommand{\tierBlue}{\tierdisc{blue!70!black}}   % closed-form / constant
\newcommand{\tierGreen}{\tierdisc{green!60!black}} % model-verified
\newcommand{\tierYellow}{\tierdisc{yellow!85!black}} % citation/sibling-locked
\newcommand{\tierOrange}{\tierdisc{orange!90!black}} % inconclusive
\newcommand{\tierRed}{\tierdisc{red!80!black}}     % closed-negative

\title{
  \textbf{` + title + String.raw`} \\[6pt]
  \large ` + subtitle + String.raw`
}
\author{
  \texttt{` + slug + String.raw`} maintainers\\
  \normalsize\textit{dancinlab}
}
\date{\today}

\begin{document}
\maketitle

% Cover (optional teaser/marketing cover IS allowed here — generate via:
%   sidecar paper cover ` + slug + String.raw`). Remove this block if you ship cover-free.
\begin{figure}[h]
\centering
\includegraphics[width=0.82\textwidth]{figures/cover.png}
\caption{TODO cover caption.}
\label{fig:cover}
\end{figure}

\begin{abstract}
TODO abstract. State the falsifiable hypothesis, the measurement, and the finding
(a $\Delta$ vs baseline OR a closed-negative ruling out an axis). Copy verdict
numbers verbatim; show a closed-negative as a closed-negative.
\end{abstract}

% ---------- section structure mirrors the NeuroLM quality target ----------
% (templates/paper/_reference_samples/2409.00101_neurolm.pdf · ICLR 2025):
% Intro → Background → Method → Experiments → Ablation → Discussion → refs,
% heavy on RESULT figures (caption tied to a specific result), not decoration.
\section{Introduction}
TODO. End with a \textbf{Contributions} paragraph (bulleted).

\section{Background and Related Work}
TODO. Position against the closest prior work; cite inline with \citep{placeholder2026}.

\section{Method}
TODO. Ship $\ge 1$ architecture block diagram (Fig.~\ref{fig:arch}).

\begin{figure}[t]
\centering
\begin{tikzpicture}[node distance=10mm, every node/.style={font=\small,draw,rounded corners,minimum height=7mm}]
\node (in) {input};
\node[right=of in] (proc) {method};
\node[right=of proc] (out) {result};
\draw[-{Latex}] (in) -- (proc);
\draw[-{Latex}] (proc) -- (out);
\end{tikzpicture}
\caption{TODO architecture — replace with the real pipeline (this is the NeuroLM-style block diagram).}
\label{fig:arch}
\end{figure}

\section{Experiments}
TODO setup + main quantitative results. Every figure caption ties to a specific result.

\begin{figure}[t]
\centering
\begin{tikzpicture}
\begin{axis}[width=0.72\linewidth,height=5cm,ybar,bar width=16pt,
  symbolic x coords={baseline,method A,this work},xtick=data,
  ymin=0,enlarge x limits=0.28,ylabel={metric (units)},nodes near coords,
  every axis plot/.append style={fill=blue!55!black,draw=black}]
\addplot coordinates {(baseline,0.42) (method A,0.71) (this work,0.96)};
\end{axis}
\end{tikzpicture}
\caption{TODO headline result (baseline vs.\ this work). Result figure, not decoration.}
\label{fig:main}
\end{figure}

\section{Ablation}
TODO. Knock out one component at a time; report the $\Delta$ for each.

\section{Tier ledger}
Every headline claim carries a g5 tier verdict (\tierBlue{} closed-form ·
\tierGreen{} model-verified · \tierYellow{} citation-locked · \tierOrange{}
inconclusive · \tierRed{} closed-negative).
\begin{table}[h]
\centering\small
\caption{Headline verdicts.}
\begin{tabular}{@{}lll@{}}
\toprule
Claim & Evidence & Tier \\
\midrule
TODO & TODO & \tierGreen{} \\
\bottomrule
\end{tabular}
\end{table}

\section{Discussion}
TODO. What generalises beyond this measurement; what it does \emph{not} claim.

\section{Limitations}
TODO. Be explicit about scope; do not over-claim.

\section{Conclusion}
TODO.

\bibliographystyle{unsrtnat}
\bibliography{references}

\end{document}
`;
}

function refsTemplate(): string {
  return String.raw`@misc{placeholder2026,
  title={TODO replace with real references}, author={{dancinlab}}, year={2026},
  note={\url{https://github.com/dancinlab}}
}
`;
}

function paperMd(slug: string, title: string): string {
  return `# ${slug} — paper status\n\n@title: ${title}\n@goal: TODO.\n\n- [ ] draft v1\n- [ ] cover (sidecar paper cover ${slug}) — teaser cover allowed\n- [ ] result figures (≥9 · caption tied to a result · = NeuroLM bar)\n- [ ] references (≥10)\n- [ ] compile clean (sidecar paper build ${slug} — ≥10 pages, g51)\n\nquality target: templates/paper/_reference_samples/2409.00101_neurolm.pdf (NeuroLM, ICLR 2025).\nprovenance: TODO. 검증 수치는 verbatim 복사(c9), closed-negative는 그대로 표기.\n`;
}

// ── path helpers ────────────────────────────────────────────────────────────
function paperDir(target: string, dir: string): string {
  // accept either a slug (→ <dir>/<slug>) or an explicit path containing a sep
  if (target.includes("/") || isAbsolute(target)) {
    return isAbsolute(target) ? target : resolve(REPO_ROOT, target);
  }
  return resolve(REPO_ROOT, dir, target);
}

function bytes(p: string): number {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}

// ── tool availability ────────────────────────────────────────────────────────
async function have(bin: string): Promise<boolean> {
  const r = await execShell(`command -v ${bin}`);
  return r.code === 0 && r.stdout.trim().length > 0;
}

// ── build: xelatex → bibtex → xelatex → xelatex ─────────────────────────────
async function build(dir: string, minPages: number, minFigures: number): Promise<number> {
  if (!existsSync(resolve(dir, "main.tex"))) {
    loudFail(`paper build: no main.tex in ${dir}`);
    return 1;
  }
  if (!(await have("xelatex"))) {
    loudFail("paper build: xelatex not found — install a TeX distribution (e.g. MacTeX / TeX Live).");
    return 1;
  }
  const q = (s: string) => JSON.stringify(s);
  const xe = `xelatex -interaction=nonstopmode -halt-on-error=false main.tex`;
  const run = (cmd: string) => execShell(`cd ${q(dir)} && ${cmd} >/dev/null 2>&1; true`, { timeoutMs: 180000 });
  info(`paper build: ${basename(dir)} — xelatex → bibtex → xelatex ×2 ...`);
  await run(xe);
  if (await have("bibtex")) await run(`bibtex main`);
  await run(xe);
  // last pass: keep the log for error reporting
  const last = await execShell(`cd ${q(dir)} && ${xe} 2>&1 | tail -200; true`, { timeoutMs: 180000 });

  const pdf = resolve(dir, "main.pdf");
  const reportErrors = () => {
    const errs = last.stdout.split("\n").filter((l) => /^! |Error:|Undefined control|tikz Error|cannot find|not found/.test(l)).slice(0, 12);
    for (const e of errs) info(`  ${e}`);
  };
  if (!existsSync(pdf) || bytes(pdf) < 1000) {
    // a few-byte stub is xelatex's failure residue, not a real PDF
    loudFail("paper build: main.pdf not produced (or empty) — compile failed. Errors:");
    reportErrors();
    if (!existsSync(resolve(dir, "figures", "cover.png"))) info("  (no figures/cover.png — run `sidecar paper cover <slug>` first)");
    return 2;
  }

  const hasPdfinfo = await have("pdfinfo");
  let pages = 0;
  if (hasPdfinfo) {
    const pi = await execShell(`pdfinfo ${q(pdf)} 2>/dev/null | awk '/Pages/{print $2}'`);
    pages = parseInt(pi.stdout.trim(), 10) || 0;
    if (pages === 0) {
      loudFail("paper build: pdfinfo could not read main.pdf (corrupt output) — compile failed. Errors:");
      reportErrors();
      if (!existsSync(resolve(dir, "figures", "cover.png"))) info("  (no figures/cover.png — run `sidecar paper cover <slug>` first)");
      return 2;
    }
  }
  let refs = 0;
  const bbl = resolve(dir, "main.bbl");
  if (existsSync(bbl)) {
    refs = (readFileSync(bbl, "utf8").match(/\\bibitem/g) || []).length;
  }

  // result-figure count = every \begin{figure} in main.tex MINUS the cover block
  // (the teaser cover is identified by its \label{fig:cover} and does NOT count as
  // a result figure — NeuroLM discipline: figures back results, not promotion).
  let figs = 0;
  const texPath = resolve(dir, "main.tex");
  if (existsSync(texPath)) {
    const tex = readFileSync(texPath, "utf8");
    const total = (tex.match(/\\begin\{figure\*?\}/g) || []).length;
    const covers = (tex.match(/\\label\{fig:cover\}/g) || []).length;
    figs = Math.max(0, total - covers);
  }

  const fatal = last.stdout.split("\n").filter((l) => /^! LaTeX Error|^! Package .*Error|tikz Error/.test(l));
  const sizeKb = Math.round(bytes(pdf) / 1024);
  ok(`paper build: ${basename(dir)} → ${pages || "?"} pages · ${figs} result figs · ${refs} refs · ${sizeKb}KB`);
  if (fatal.length) {
    warn(`paper build: ${fatal.length} LaTeX/tikz error line(s) survived (PDF still produced):`);
    for (const e of fatal.slice(0, 8)) info(`  ${e}`);
  }

  // ---- hard content-floor gates (both ENFORCED; tune via --min-pages / --min-figures, 0 = waive) ----
  const failures: string[] = [];
  if (minPages > 0 && pages && pages < minPages) failures.push(`${pages} pages < ${minPages} (g51 page floor)`);
  if (minPages > 0 && !pages) info("paper build: page floor unenforced — pdfinfo absent (install poppler to gate pages).");
  if (minFigures > 0 && figs < minFigures) failures.push(`${figs} result figs < ${minFigures} (NeuroLM quality bar = 9+)`);
  if (failures.length) {
    loudFail(`paper build: content-floor gate FAILED — ${failures.join(" · ")}. Expand before shipping (waive with --min-pages 0 / --min-figures 0).`);
    return 3;
  }
  info(`paper build: content floors PASS (≥${minPages} pages · ≥${minFigures} result figs).`);
  return 0;
}

// ── cover: generate figures/cover.png via sidecar imagine (fal) ──────────────
async function cover(dir: string, promptText: string, size: string): Promise<number> {
  mkdirSync(resolve(dir, "figures"), { recursive: true });
  const out = resolve(dir, "figures", "cover.png");
  const pf = resolve(tmpdir(), `sidecar-paper-cover-${process.pid}.txt`);
  writeFileSync(pf, promptText, "utf8");
  try {
    // delegate to `sidecar imagine` (fal backend, key via secret) — no key handling here
    const rc = await runImagine([pf, out, "-s", size]);
    if (rc !== 0) {
      loudFail("paper cover: imagine failed (see above). Need `secret set fal.api_key`.");
      return rc;
    }
  } finally {
    rmSync(pf, { force: true });
  }
  ok(`paper cover: wrote ${out} (${bytes(out)} bytes)`);
  return 0;
}

function defaultCoverPrompt(title: string): string {
  return `Abstract conceptual cover art for a scientific paper. Minimal, elegant, museum-poster aesthetic, dark background, fine technical line-work and subtle data-visualization motifs, deep indigo and teal palette, high detail, no text, no letters. Theme: ${title.replace(/[{}\\]/g, "")}.`;
}

// ── new: scaffold + cover + build ───────────────────────────────────────────
async function scaffold(slug: string, opts: { dir: string; title: string; subtitle: string; minPages: number; minFigures: number; doCover: boolean; coverPrompt?: string; coverSize: string }): Promise<number> {
  const dir = paperDir(slug, opts.dir);
  if (existsSync(resolve(dir, "main.tex"))) {
    loudFail(`paper new: ${dir}/main.tex already exists — use 'sidecar paper build ${slug}' or pick another slug.`);
    return 1;
  }
  mkdirSync(resolve(dir, "figures"), { recursive: true });
  writeFileSync(resolve(dir, "main.tex"), mainTexTemplate(slug, opts.title, opts.subtitle), "utf8");
  writeFileSync(resolve(dir, "references.bib"), refsTemplate(), "utf8");
  writeFileSync(resolve(dir, "PAPER.md"), paperMd(slug, opts.title), "utf8");
  ok(`paper new: scaffolded ${dir} (main.tex · references.bib · PAPER.md · figures/)`);

  if (opts.doCover) {
    const rc = await cover(dir, opts.coverPrompt || defaultCoverPrompt(opts.title), opts.coverSize);
    if (rc !== 0) warn("paper new: cover generation failed — placeholder include left; run `sidecar paper cover` later.");
  } else {
    info("paper new: --no-cover — add figures/cover.png or run `sidecar paper cover` before build.");
  }
  // only build if a cover exists (the template \includegraphics would otherwise fail)
  if (existsSync(resolve(dir, "figures", "cover.png"))) {
    const rc = await build(dir, opts.minPages, opts.minFigures);
    // a fresh TODO scaffold is EXPECTED to miss the content floors — that is not a
    // `new` failure (it compiled). Surface it as a next-step, propagate real fails only.
    if (rc === 3) {
      info(`paper new: scaffolded + compiles, but content floors not yet met (expected for a draft) — fill, then: sidecar paper build ${slug}`);
      return 0;
    }
    return rc;
  }
  info(`paper new: skip build (no cover yet). After adding one: sidecar paper build ${slug}`);
  return 0;
}

function listPapers(dir: string): number {
  const base = resolve(REPO_ROOT, dir);
  if (!existsSync(base)) {
    info(`paper list: no ${dir}/ under ${REPO_ROOT}`);
    return 0;
  }
  const rows = readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(base, d.name, "main.tex")))
    .map((d) => {
      const pdf = resolve(base, d.name, "main.pdf");
      return `  ${d.name}${existsSync(pdf) ? `  (${Math.round(bytes(pdf) / 1024)}KB pdf)` : "  (no pdf)"}`;
    });
  if (!rows.length) {
    info(`paper list: no papers under ${dir}/`);
    return 0;
  }
  info(`papers under ${dir}/:`);
  for (const r of rows) info(r);
  return 0;
}

// ── publish lifecycle: zenodo (full REST) + arxiv (submission package + guide) ─
// Keys come from the `secret` CLI only (commons git-safety: never inline a token).
const ZENODO_HOST = { prod: "https://zenodo.org", sandbox: "https://sandbox.zenodo.org" } as const;

async function zenodoToken(sandbox: boolean): Promise<string> {
  // canonical key + a tolerated alias, per env
  const keys = sandbox ? ["zenodo.sandbox_token", "zenodo.sandbox_api_token"] : ["zenodo.token", "zenodo.api_token"];
  for (const k of keys) {
    const t = await secretGet(k);
    if (t) return t;
  }
  return "";
}

type PublishRecord = {
  zenodo?: { id: number; doi?: string; concept_doi?: string; state?: string; html?: string; sandbox: boolean; version: number };
  arxiv?: { package: string; bytes: number };
};

function recordPath(dir: string): string {
  return resolve(dir, "publish.json");
}
function readRecord(dir: string): PublishRecord {
  const p = recordPath(dir);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")) as PublishRecord;
  } catch {
    return {};
  }
}
function writeRecord(dir: string, rec: PublishRecord): void {
  writeFileSync(recordPath(dir), JSON.stringify(rec, null, 2) + "\n", "utf8");
}

// strip a small set of LaTeX wrappers so a Zenodo title/abstract is clean prose
// (keep emoji + unicode — Zenodo accepts them; just drop \commands and braces).
function stripTex(s: string): string {
  return s
    .replace(/%.*$/gm, "")
    .replace(/\\(textbf|textit|emph|texttt|large|normalsize|textbackslash)\b/g, "")
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\\\\/g, " ")
    .replace(/\$[^$]*\$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// pull title/description from PAPER.md (@title) + main.tex (\title, abstract).
function paperMeta(dir: string): { title: string; description: string } {
  let title = basename(dir);
  let description = "";
  const md = resolve(dir, "PAPER.md");
  if (existsSync(md)) {
    const m = readFileSync(md, "utf8");
    const t = m.match(/@title:\s*(.+)/);
    if (t) title = stripTex(t[1]);
  }
  const texPath = resolve(dir, "main.tex");
  if (existsSync(texPath)) {
    const src = readFileSync(texPath, "utf8");
    if (title === basename(dir)) {
      const tt = src.match(/\\title\{([\s\S]*?)\n\}/);
      if (tt) title = stripTex(tt[1]);
    }
    const ab = src.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
    if (ab) description = stripTex(ab[1]);
  }
  return { title: title || basename(dir), description };
}

// Zenodo deposition metadata — defaults, overridable per-paper via PAPERS/<slug>/zenodo.json.
function buildZenodoMetadata(dir: string): Record<string, unknown> {
  const { title, description } = paperMeta(dir);
  const base: Record<string, unknown> = {
    upload_type: "publication",
    publication_type: "preprint",
    title: title || basename(dir),
    description: description || title || basename(dir),
    creators: [{ name: "dancinlab", affiliation: "dancinlab" }],
    keywords: [basename(dir), "dancinlab"],
    access_right: "open",
    license: "cc-by-4.0",
  };
  const ov = resolve(dir, "zenodo.json");
  if (existsSync(ov)) {
    try {
      Object.assign(base, JSON.parse(readFileSync(ov, "utf8")));
    } catch {
      warn(`paper publish[zenodo]: ${ov} is not valid JSON — using default metadata.`);
    }
  }
  return base;
}

// thin JSON fetch wrapper — returns status + parsed body (or raw text on non-JSON).
async function zFetch(url: string, init: RequestInit): Promise<{ status: number; ok: boolean; body: any }> {
  const r = await fetch(url, init);
  const text = await r.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: r.status, ok: r.ok, body };
}

function snip(v: unknown): string {
  return (typeof v === "string" ? v : JSON.stringify(v) || "").slice(0, 280);
}

// upload main.pdf (+ optional source tarball) to a deposition's file bucket.
async function uploadFiles(dir: string, bucket: string, auth: Record<string, string>, withSource: boolean): Promise<boolean> {
  const pdf = resolve(dir, "main.pdf");
  const data = readFileSync(pdf);
  const up = await fetch(`${bucket}/${basename(pdf)}`, { method: "PUT", headers: auth, body: data });
  if (!up.ok) {
    loudFail(`paper publish[zenodo]: pdf upload failed HTTP ${up.status}`);
    return false;
  }
  info(`paper publish[zenodo]: uploaded ${basename(pdf)} (${Math.round(data.length / 1024)}KB)`);
  if (withSource) {
    const tar = await arxivTarball(dir); // reuse the flattened source bundle
    if (tar) {
      const sdata = readFileSync(tar);
      const sup = await fetch(`${bucket}/${basename(tar)}`, { method: "PUT", headers: auth, body: sdata });
      if (sup.ok) info(`paper publish[zenodo]: uploaded ${basename(tar)} (${Math.round(sdata.length / 1024)}KB source)`);
      else warn(`paper publish[zenodo]: source upload failed HTTP ${sup.status} (pdf is up — continuing).`);
    }
  }
  return true;
}

async function zenodoPublish(dir: string, sandbox: boolean, withSource: boolean): Promise<number> {
  const env = sandbox ? "sandbox" : "prod";
  const token = await zenodoToken(sandbox);
  if (!token) {
    loudFail(`paper publish[zenodo]: \`secret get zenodo.${sandbox ? "sandbox_" : ""}token\` empty — set with 'secret set zenodo.${sandbox ? "sandbox_" : ""}token <token>'`);
    info("  token: Zenodo → Applications → Personal access tokens → scopes deposit:write + deposit:actions");
    return 1;
  }
  if (!existsSync(resolve(dir, "main.pdf"))) {
    loudFail(`paper publish[zenodo]: no main.pdf in ${dir} — run 'sidecar paper build' first.`);
    return 1;
  }
  const host = ZENODO_HOST[env];
  const auth = { Authorization: `Bearer ${token}` };
  const jsonAuth = { ...auth, "Content-Type": "application/json" };

  const create = await zFetch(`${host}/api/deposit/depositions`, { method: "POST", headers: jsonAuth, body: "{}" });
  if (create.status >= 300) {
    loudFail(`paper publish[zenodo]: create deposition failed HTTP ${create.status} — ${snip(create.body)}`);
    return 2;
  }
  const id = create.body.id as number;
  const bucket = create.body?.links?.bucket as string;
  info(`paper publish[zenodo]: created draft deposition ${id} (${env})`);

  if (!(await uploadFiles(dir, bucket, auth, withSource))) return 2;

  const meta = buildZenodoMetadata(dir);
  const setm = await zFetch(`${host}/api/deposit/depositions/${id}`, { method: "PUT", headers: jsonAuth, body: JSON.stringify({ metadata: meta }) });
  if (setm.status >= 300) {
    loudFail(`paper publish[zenodo]: metadata update failed HTTP ${setm.status} — ${snip(setm.body)}`);
    return 2;
  }
  info(`paper publish[zenodo]: metadata set (title='${snip(meta.title)}')`);

  const pub = await zFetch(`${host}/api/deposit/depositions/${id}/actions/publish`, { method: "POST", headers: auth });
  if (pub.status >= 300) {
    loudFail(`paper publish[zenodo]: publish action failed HTTP ${pub.status} — ${snip(pub.body)}. Draft ${id} kept; fix metadata then 'sidecar paper update'.`);
    return 2;
  }
  const rec = readRecord(dir);
  rec.zenodo = { id, doi: pub.body.doi, concept_doi: pub.body.conceptdoi, state: pub.body.state, html: pub.body?.links?.html, sandbox, version: 1 };
  writeRecord(dir, rec);
  ok(`paper publish[zenodo]: PUBLISHED → DOI ${pub.body.doi} · ${pub.body?.links?.html}`);
  return 0;
}

async function zenodoUpdate(dir: string, sandbox: boolean, withSource: boolean): Promise<number> {
  const rec = readRecord(dir);
  if (!rec.zenodo?.id) {
    loudFail("paper update[zenodo]: no prior publish in publish.json — run 'sidecar paper publish --to zenodo' first.");
    return 1;
  }
  const env = rec.zenodo.sandbox ? "sandbox" : "prod";
  const token = await zenodoToken(rec.zenodo.sandbox);
  if (!token) {
    loudFail(`paper update[zenodo]: \`secret get zenodo.${rec.zenodo.sandbox ? "sandbox_" : ""}token\` empty.`);
    return 1;
  }
  const host = ZENODO_HOST[env];
  const auth = { Authorization: `Bearer ${token}` };
  const jsonAuth = { ...auth, "Content-Type": "application/json" };

  const nv = await zFetch(`${host}/api/deposit/depositions/${rec.zenodo.id}/actions/newversion`, { method: "POST", headers: auth });
  if (nv.status >= 300) {
    loudFail(`paper update[zenodo]: newversion failed HTTP ${nv.status} — ${snip(nv.body)}`);
    return 2;
  }
  const draftUrl = nv.body?.links?.latest_draft as string;
  const draft = await zFetch(draftUrl, { method: "GET", headers: auth });
  const newId = draft.body.id as number;
  const bucket = draft.body?.links?.bucket as string;
  info(`paper update[zenodo]: new draft version ${newId} (from ${rec.zenodo.id})`);

  // replace inherited files with the freshly built ones
  for (const f of (draft.body.files || []) as Array<{ links?: { self?: string } }>) {
    if (f.links?.self) await fetch(f.links.self, { method: "DELETE", headers: auth });
  }
  if (!(await uploadFiles(dir, bucket, auth, withSource))) return 2;

  const meta = buildZenodoMetadata(dir);
  const setm = await zFetch(`${host}/api/deposit/depositions/${newId}`, { method: "PUT", headers: jsonAuth, body: JSON.stringify({ metadata: meta }) });
  if (setm.status >= 300) {
    loudFail(`paper update[zenodo]: metadata update failed HTTP ${setm.status} — ${snip(setm.body)}`);
    return 2;
  }
  const pub = await zFetch(`${host}/api/deposit/depositions/${newId}/actions/publish`, { method: "POST", headers: auth });
  if (pub.status >= 300) {
    loudFail(`paper update[zenodo]: publish failed HTTP ${pub.status} — ${snip(pub.body)}. Draft ${newId} kept.`);
    return 2;
  }
  rec.zenodo = { id: newId, doi: pub.body.doi, concept_doi: pub.body.conceptdoi ?? rec.zenodo.concept_doi, state: pub.body.state, html: pub.body?.links?.html, sandbox: rec.zenodo.sandbox, version: rec.zenodo.version + 1 };
  writeRecord(dir, rec);
  ok(`paper update[zenodo]: PUBLISHED v${rec.zenodo.version} → DOI ${pub.body.doi} · ${pub.body?.links?.html}`);
  return 0;
}

async function zenodoUnpublish(dir: string): Promise<number> {
  const rec = readRecord(dir);
  if (!rec.zenodo?.id) {
    loudFail("paper unpublish[zenodo]: nothing recorded in publish.json.");
    return 1;
  }
  const token = await zenodoToken(rec.zenodo.sandbox);
  if (!token) {
    loudFail(`paper unpublish[zenodo]: \`secret get zenodo.${rec.zenodo.sandbox ? "sandbox_" : ""}token\` empty.`);
    return 1;
  }
  const host = ZENODO_HOST[rec.zenodo.sandbox ? "sandbox" : "prod"];
  const del = await fetch(`${host}/api/deposit/depositions/${rec.zenodo.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  if (del.status === 204 || del.status === 200 || del.status === 201) {
    delete rec.zenodo;
    writeRecord(dir, rec);
    ok(`paper unpublish[zenodo]: deleted draft deposition.`);
    return 0;
  }
  if (del.status === 403) {
    loudFail("paper unpublish[zenodo]: deposition is PUBLISHED — Zenodo does not allow API deletion of published records (DOI is permanent). To withdraw, contact Zenodo support; the ledger is kept.");
    return 2;
  }
  loudFail(`paper unpublish[zenodo]: delete failed HTTP ${del.status}.`);
  return 2;
}

// arXiv has NO submission API (SWORDv1 retired) — build a submission-ready tarball
// (flattened main.tex + main.bbl + figures so arXiv needs no local .bib resolve).
async function arxivTarball(dir: string): Promise<string | null> {
  if (!existsSync(resolve(dir, "main.tex"))) {
    loudFail(`paper publish[arxiv]: no main.tex in ${dir}.`);
    return null;
  }
  const q = (s: string) => JSON.stringify(s);
  const files = ["main.tex"];
  for (const f of ["main.bbl", "references.bib"]) if (existsSync(resolve(dir, f))) files.push(f);
  if (existsSync(resolve(dir, "figures"))) files.push("figures");
  const out = resolve(dir, "arxiv-submission.tar.gz");
  const r = await execShell(`cd ${q(dir)} && tar -czf arxiv-submission.tar.gz ${files.join(" ")}`, { timeoutMs: 60000 });
  if (r.code !== 0 || !existsSync(out)) {
    loudFail(`paper publish[arxiv]: tar failed — ${r.stderr.slice(0, 200)}`);
    return null;
  }
  if (!existsSync(resolve(dir, "main.bbl"))) warn("paper publish[arxiv]: no main.bbl — run 'sidecar paper build' first so arXiv needs no .bib pass.");
  return out;
}

async function arxivPublish(dir: string): Promise<number> {
  const tar = await arxivTarball(dir);
  if (!tar) return 2;
  const kb = Math.round(bytes(tar) / 1024);
  const rec = readRecord(dir);
  rec.arxiv = { package: tar, bytes: bytes(tar) };
  writeRecord(dir, rec);
  ok(`paper publish[arxiv]: packaged → ${tar} (${kb}KB)`);
  info("arXiv has NO submission API — upload this tarball manually (web is the only path):");
  info("  1. https://arxiv.org/submit  (log in)");
  info("  2. Start New Submission → upload arxiv-submission.tar.gz");
  info("  3. pick the primary category · fill metadata · submit for moderation");
  return 0;
}

function publishStatus(dir: string): number {
  const rec = readRecord(dir);
  if (!rec.zenodo && !rec.arxiv) {
    info(`paper status: ${basename(dir)} — not yet published (no publish.json record).`);
    return 0;
  }
  info(`paper status: ${basename(dir)}`);
  if (rec.zenodo) info(`  zenodo : v${rec.zenodo.version} · ${rec.zenodo.state ?? "?"} · DOI ${rec.zenodo.doi ?? "?"} · ${rec.zenodo.sandbox ? "sandbox" : "prod"} · ${rec.zenodo.html ?? ""}`);
  if (rec.arxiv) info(`  arxiv  : packaged ${rec.arxiv.package} (${Math.round(rec.arxiv.bytes / 1024)}KB · upload at https://arxiv.org/submit)`);
  return 0;
}

// dispatch a publish/update verb across the requested targets (zenodo · arxiv · both).
async function runPublish(verb: "publish" | "update" | "unpublish", dir: string, to: string, sandbox: boolean, withSource: boolean): Promise<number> {
  if (!existsSync(dir)) {
    loudFail(`paper ${verb}: dir not found: ${dir}`);
    return 1;
  }
  const targets = to === "both" ? ["zenodo", "arxiv"] : [to];
  let rc = 0;
  for (const t of targets) {
    if (verb === "unpublish") {
      if (t === "arxiv") {
        warn("paper unpublish: arXiv submissions cannot be withdrawn via API — use the arXiv web UI; skipping.");
        continue;
      }
      rc = (await zenodoUnpublish(dir)) || rc;
    } else if (t === "zenodo") {
      rc = (await (verb === "update" ? zenodoUpdate(dir, sandbox, withSource) : zenodoPublish(dir, sandbox, withSource))) || rc;
    } else if (t === "arxiv") {
      if (verb === "update") info("paper update[arxiv]: re-packaging (arXiv replacement is a web action — upload the fresh tarball as a new version).");
      rc = (await arxivPublish(dir)) || rc;
    } else {
      loudFail(`paper ${verb}: unknown target '${t}' — one of: zenodo · arxiv · both`);
      rc = 1;
    }
  }
  return rc;
}

function usage(): void {
  info("sidecar paper <new|build|cover|list|publish|update|unpublish|status|help>");
  info("  new <slug> [--title T] [--subtitle S] [--dir D] [--min-pages N] [--min-figures N] [--no-cover] [--cover-prompt-file F] [-s size]");
  info("            scaffold demiurge-house template (NeuroLM-mirrored sections · g5 tier badges · TikZ+pgfplots result figs · fal.ai cover) → cover → build");
  info("  build <slug|dir> [--min-pages N] [--min-figures N] [--dir D]   xelatex→bibtex→xelatex×2; HARD gates: ≥N pages (g51) + ≥N result figs (0 waives)");
  info("  cover <slug|dir> [--cover-prompt-file F] [-p \"prompt\"] [-s size] [--dir D]   (re)generate figures/cover.png via `sidecar imagine`");
  info("  list [--dir D]");
  info("  publish <slug|dir> [--to zenodo|arxiv|both] [--sandbox] [--source] [--dir D]   deploy: Zenodo create→upload→metadata→publish (mints DOI) · arXiv submission tarball + guide");
  info("  update <slug|dir> [--to zenodo|arxiv] [--sandbox] [--source] [--dir D]   Zenodo new-version (replace files, fresh versioned DOI) · arXiv re-package");
  info("  unpublish <slug|dir> [--dir D]   delete a Zenodo DRAFT deposition (published records are permanent — API cannot delete them)");
  info("  status <slug|dir> [--dir D]   show the per-paper publish ledger (publish.json)");
  info(`  defaults: dir=${DEFAULT_DIR} · min-pages=${DEFAULT_MIN_PAGES} (g51) · min-figures=${DEFAULT_MIN_FIGURES} (NeuroLM bar 9+) · cover size=landscape_16_9 · cover backend=fal (secret get fal.api_key)`);
  info("  keys (secret CLI · never inline): zenodo.token (prod) · zenodo.sandbox_token (--sandbox) · scopes deposit:write+deposit:actions");
}

function parseFlags(args: string[]): { pos: string[]; flags: Record<string, string>; bools: Set<string> } {
  const pos: string[] = [];
  const flags: Record<string, string> = {};
  const bools = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--no-cover") bools.add("no-cover");
    else if (a === "--sandbox") bools.add("sandbox");
    else if (a === "--source") bools.add("source");
    else if ((a === "--to" || a === "--target") && i + 1 < args.length) flags["to"] = args[++i];
    else if ((a === "--title" || a === "--subtitle" || a === "--dir" || a === "--min-pages" || a === "--min-figures" || a === "--cover-prompt-file" || a === "-p" || a === "--prompt" || a === "-s" || a === "--size") && i + 1 < args.length) {
      const key = a.replace(/^-+/, "").replace("prompt", "p") === "p" ? "p" : a.replace(/^-+/, "");
      flags[key === "size" ? "s" : key] = args[++i];
    } else pos.push(a);
  }
  return { pos, flags, bools };
}

export async function runPaper(args: string[]): Promise<number> {
  const sub = args[0];
  if (!sub || sub === "help" || sub === "-h" || sub === "--help") {
    usage();
    return 0;
  }
  const { pos, flags, bools } = parseFlags(args.slice(1));
  const dir = flags["dir"] || DEFAULT_DIR;
  // allow an explicit 0 (= waive the gate); only fall back to the default on absent/NaN.
  const intFlag = (key: string, def: number): number => {
    if (flags[key] == null) return def;
    const n = parseInt(flags[key], 10);
    return Number.isNaN(n) ? def : n;
  };
  const minPages = intFlag("min-pages", DEFAULT_MIN_PAGES);
  const minFigures = intFlag("min-figures", DEFAULT_MIN_FIGURES);
  const size = flags["s"] || "landscape_16_9";

  if (sub === "list") return listPapers(dir);

  if (sub === "new") {
    const slug = pos[0];
    if (!slug) {
      loudFail("paper new: usage: sidecar paper new <slug> [--title T] [--subtitle S]");
      return 1;
    }
    const title = flags["title"] || `\u{1F4C4} ${slug}`; // 📄 default emoji title
    const subtitle = flags["subtitle"] || "TODO subtitle";
    let coverPrompt: string | undefined;
    if (flags["cover-prompt-file"]) {
      const pf = isAbsolute(flags["cover-prompt-file"]) ? flags["cover-prompt-file"] : resolve(process.env.PWD ?? process.cwd(), flags["cover-prompt-file"]);
      if (existsSync(pf)) coverPrompt = readFileSync(pf, "utf8");
      else warn(`paper new: cover-prompt-file not found: ${pf} — using default prompt.`);
    }
    return scaffold(slug, { dir, title, subtitle, minPages, minFigures, doCover: !bools.has("no-cover"), coverPrompt, coverSize: size });
  }

  if (sub === "build") {
    const target = pos[0];
    if (!target) {
      loudFail("paper build: usage: sidecar paper build <slug|dir> [--min-pages N]");
      return 1;
    }
    return build(paperDir(target, dir), minPages, minFigures);
  }

  if (sub === "cover") {
    const target = pos[0];
    if (!target) {
      loudFail("paper cover: usage: sidecar paper cover <slug|dir> [--cover-prompt-file F] [-p \"prompt\"]");
      return 1;
    }
    const pdir = paperDir(target, dir);
    if (!existsSync(pdir)) {
      loudFail(`paper cover: dir not found: ${pdir}`);
      return 1;
    }
    let prompt = flags["p"] || "";
    if (!prompt && flags["cover-prompt-file"]) {
      const pf = isAbsolute(flags["cover-prompt-file"]) ? flags["cover-prompt-file"] : resolve(process.env.PWD ?? process.cwd(), flags["cover-prompt-file"]);
      if (existsSync(pf)) prompt = readFileSync(pf, "utf8");
    }
    if (!prompt) prompt = defaultCoverPrompt(basename(pdir));
    return cover(pdir, prompt, size);
  }

  if (sub === "publish" || sub === "update" || sub === "unpublish" || sub === "status") {
    const target = pos[0];
    if (!target) {
      loudFail(`paper ${sub}: usage: sidecar paper ${sub} <slug|dir> [--to zenodo|arxiv|both] [--sandbox] [--source]`);
      return 1;
    }
    const pdir = paperDir(target, dir);
    if (sub === "status") return publishStatus(pdir);
    const to = (flags["to"] || "zenodo").toLowerCase();
    return runPublish(sub, pdir, to, bools.has("sandbox"), bools.has("source"));
  }

  loudFail(`paper: unknown subcommand '${sub}' — one of: new · build · cover · list · publish · update · unpublish · status · help`);
  return 1;
}
