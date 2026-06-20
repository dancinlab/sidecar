// harness imagine <prompt-file> <out.{png|mp4}> [-s size] [-b backend] [-m model] [-i image]
//                  | list | help | history
// Generic AI image+video generator (sidecar /imagine parity + video). Defaults:
//   IMAGE (out=.png/.jpg/…)        → fal queue · openai/gpt-image-2 ("image2", pinned)
//   VIDEO text-to-video (out=.mp4) → fal queue · bytedance/seedance-2.0/text-to-video ("시댄스 2.0", pinned)
//   VIDEO image-to-video (+ -i img)→ fal queue · bytedance/seedance-2.0/image-to-video (the -i image animates)
// Backends:
//   fal     (default) fal.ai queue+poll · image openai/gpt-image-2 · video Seedance 2.0
//   openai  api.openai.com /v1/images/generations · default model gpt-image-1 (images only)
// API keys come from the `secret` CLI (secret get fal.api_key / openai.api_key)
// — never inline, never logged. The PROMPT is read from a FILE (provenance, no
// argv leak) and POSTed via a mktemp JSON payload. The auth header is passed to
// curl through a `-K` config file so the key never appears in the process list.
// Canonical sizes: square_hd · square · landscape_16_9 · portrait_16_9.
// The fal default (openai/gpt-image-2) is user-pinned — override only via -m.
import { execShell } from "../lib/exec.ts";
import { secretGet, secretBin } from "./secret.ts";
import { info, ok, loudFail, appendJsonl, nowIso } from "../lib/log.ts";
import { readJsonl } from "../lib/json.ts";
import { LOG_DIR } from "../lib/paths.ts";
import { writeFileSync, mkdirSync, existsSync, statSync, readFileSync, rmSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { tmpdir } from "node:os";

const LEDGER = resolve(LOG_DIR, "imagine.jsonl");

const SIZES = ["square_hd", "square", "landscape_16_9", "portrait_16_9"];
const BACKENDS: Record<string, { keyName: string; defaultModel: string }> = {
  fal: { keyName: "fal.api_key", defaultModel: "openai/gpt-image-2" },
  openai: { keyName: "openai.api_key", defaultModel: "gpt-image-1" },
};
// VIDEO: when the output path is a video file, imagine routes to the fal queue
// with the pinned Seedance 2.0 default model (user-pinned, like gpt-image-2 for
// images — override only via `-m <fal-endpoint>`). Same queue+poll mechanism;
// only the payload and result-URL field differ (video.url / videos[].url).
const VIDEO_EXT = /\.(mp4|mov|webm|m4v|gif)$/i;
// 시댄스(Seedance) 2.0 — exact fal endpoints (standard tier, max quality). Fast tier:
// …/fast/{text|image}-to-video. Pinned defaults; override via `-m`.
//   no -i  → text-to-video · with -i <image> → image-to-video (the image animates).
const VIDEO_T2V_MODEL = "bytedance/seedance-2.0/text-to-video";
const VIDEO_I2V_MODEL = "bytedance/seedance-2.0/image-to-video";
const isVideoOut = (out: string): boolean => VIDEO_EXT.test(out);

let _tmpSeq = 0;
function tmp(content: string): string {
  const p = resolve(tmpdir(), `harness-imagine-${process.pid}-${_tmpSeq++}`);
  writeFileSync(p, content, "utf8");
  return p;
}

// curl config file (-K): keeps the auth header + url out of the process argv.
function curlConfig(opts: { url: string; headers: string[]; method?: string; dataFile?: string; maxTime?: number; output?: string; location?: boolean }): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const lines = ["silent", "show-error"];
  if (opts.method) lines.push(`request = "${esc(opts.method)}"`);
  lines.push(`url = "${esc(opts.url)}"`);
  for (const h of opts.headers) lines.push(`header = "${esc(h)}"`);
  if (opts.dataFile) lines.push(`data-binary = "@${esc(opts.dataFile)}"`);
  if (opts.output) lines.push(`output = "${esc(opts.output)}"`);
  if (opts.location) lines.push("location");
  lines.push(`max-time = ${opts.maxTime ?? 60}`);
  return lines.join("\n") + "\n";
}

async function curl(opts: Parameters<typeof curlConfig>[0]): Promise<{ code: number; out: string }> {
  const cfg = tmp(curlConfig(opts));
  try {
    const r = await execShell(`curl -K ${JSON.stringify(cfg)}`, { timeoutMs: (opts.maxTime ?? 60) * 1000 + 5000 });
    return { code: r.code, out: r.stdout + r.stderr };
  } finally {
    rmSync(cfg, { force: true });
  }
}

function field(json: string, key: string): string {
  try {
    const v = JSON.parse(json);
    return typeof v[key] === "string" ? v[key] : "";
  } catch {
    return "";
  }
}

function bytes(p: string): number {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}

// local provenance ledger — maps prompt/model/size → out file + request_id, so
// history is available even without the provider API (and openai, which has no
// list endpoint). Prompt is truncated; no API keys are ever recorded.
function recordImagine(e: { backend: string; model: string; size: string; out: string; prompt: string; request_id?: string; status: string; bytes: number }): void {
  appendJsonl(LEDGER, { kind: "imagine", ts: nowIso(), ...e, prompt: e.prompt.slice(0, 280) });
}

// resolve an image-to-video input to a URL fal accepts: http(s) passed through;
// a local file is inlined as a base64 data URI (fal accepts data: URIs for image_url).
function resolveImageInput(ref: string, cwd: string): string {
  if (/^https?:\/\//i.test(ref) || ref.startsWith("data:")) return ref;
  const p = resolve(cwd, ref);
  if (!existsSync(p)) {
    loudFail(`imagine: -i image not found: ${p} (pass an http(s) URL or a local image file)`);
    return "";
  }
  const ext = (p.split(".").pop() ?? "png").toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  return `data:${mime};base64,${readFileSync(p).toString("base64")}`;
}

// extract the asset URL from a fal result — image (images[].url) or video (video.url / videos[].url)
function falAssetUrl(resOut: string, kind: "image" | "video"): string {
  const direct = field(resOut, "url");
  if (direct) return direct;
  try {
    const j = JSON.parse(resOut);
    if (kind === "video") return j?.video?.url ?? j?.videos?.[0]?.url ?? "";
    return j?.images?.[0]?.url ?? "";
  } catch {
    return "";
  }
}

// ── fal.ai queue+poll (image + video; video supports image-to-video via imageUrl) ──
async function backendFal(promptFile: string, out: string, size: string, model: string, kind: "image" | "video" = "image", imageUrl = ""): Promise<number> {
  const key = await secretGet("fal.api_key");
  if (!key) {
    loudFail("imagine[fal]: `secret get fal.api_key` empty — set with `secret set fal.api_key`");
    return 1;
  }
  const promptText = readFileSync(promptFile, "utf8");
  // image payload pins size/format/quality; video (Seedance 2.0) needs the prompt
  // (+ image_url for image-to-video); fal applies endpoint defaults for the rest.
  const body = kind === "video"
    ? (imageUrl ? { prompt: promptText, image_url: imageUrl } : { prompt: promptText })
    : { prompt: promptText, image_size: size, num_images: 1, output_format: "png", quality: "high" };
  const payload = tmp(JSON.stringify(body));
  const auth = `Authorization: Key ${key}`;
  // video generation is much slower — poll longer.
  const maxPolls = kind === "video" ? 240 : 80;
  const sleepSec = kind === "video" ? 5 : 3;
  try {
    const submit = await curl({ method: "POST", url: `https://queue.fal.run/${model}`, headers: [auth, "Content-Type: application/json"], dataFile: payload, maxTime: 60 });
    if (submit.code !== 0) {
      loudFail(`imagine[fal]: submit failed (curl ${submit.code})`);
      return 1;
    }
    const rid = field(submit.out, "request_id");
    const statusUrl = field(submit.out, "status_url");
    const resultUrl = field(submit.out, "response_url");
    if (!rid || !statusUrl || !resultUrl) {
      loudFail(`imagine[fal]: submit response missing fields: ${submit.out.slice(0, 300)}`);
      return 1;
    }
    info(`imagine[fal]: queued ${basename(out)} (${kind}) model=${model}${kind === "image" ? ` size=${size}` : ""} request_id=${rid}`);

    let done = false;
    for (let k = 0; k < maxPolls && !done; k++) {
      const st = await curl({ url: statusUrl, headers: [auth], maxTime: 30 });
      const status = field(st.out, "status");
      if (status === "COMPLETED") done = true;
      else if (status === "FAILED" || status === "ERROR") {
        loudFail(`imagine[fal]: ${basename(out)} ${status} — ${st.out.slice(0, 300)}`);
        return 2;
      } else await execShell(`sleep ${sleepSec}`);
    }
    if (!done) {
      loudFail(`imagine[fal]: ${basename(out)} timed out after ${maxPolls} polls`);
      return 2;
    }

    const res = await curl({ url: resultUrl, headers: [auth], maxTime: 30 });
    const url = falAssetUrl(res.out, kind);
    if (!url) {
      loudFail(`imagine[fal]: no ${kind} URL in result: ${res.out.slice(0, 300)}`);
      return 3;
    }
    const dl = await curl({ url, headers: [], output: out, location: true, maxTime: kind === "video" ? 300 : 60 });
    if (dl.code !== 0 || bytes(out) === 0) {
      loudFail(`imagine[fal]: download failed (curl ${dl.code})`);
      return 3;
    }
    recordImagine({ backend: "fal", model, size: kind === "video" ? "-" : size, out, prompt: promptText, request_id: rid, status: "ok", bytes: bytes(out) });
  } finally {
    rmSync(payload, { force: true });
  }
  ok(`imagine[fal]: wrote ${out} (${kind} · ${bytes(out)} bytes)`);
  return 0;
}

// ── openai /v1/images/generations (sync) ───────────────────────────────────
function openaiSize(size: string): string {
  if (size === "landscape_16_9") return "1536x1024";
  if (size === "portrait_16_9") return "1024x1536";
  return "1024x1024"; // square / square_hd
}

async function backendOpenai(promptFile: string, out: string, size: string, model: string): Promise<number> {
  const key = await secretGet("openai.api_key");
  if (!key) {
    loudFail("imagine[openai]: `secret get openai.api_key` empty — set with `secret set openai.api_key`");
    return 1;
  }
  const promptText = readFileSync(promptFile, "utf8");
  const payload = tmp(JSON.stringify({ model, prompt: promptText, size: openaiSize(size), n: 1 }));
  try {
    const r = await curl({ method: "POST", url: "https://api.openai.com/v1/images/generations", headers: [`Authorization: Bearer ${key}`, "Content-Type: application/json"], dataFile: payload, maxTime: 180 });
    if (r.code !== 0) {
      loudFail(`imagine[openai]: request failed (curl ${r.code})`);
      return 1;
    }
    let item: { b64_json?: string; url?: string } | undefined;
    try {
      item = JSON.parse(r.out)?.data?.[0];
    } catch {
      /* fall through */
    }
    if (!item) {
      loudFail(`imagine[openai]: bad response: ${r.out.slice(0, 300)}`);
      return 2;
    }
    if (item.b64_json) {
      writeFileSync(out, Buffer.from(item.b64_json, "base64"));
    } else if (item.url) {
      const dl = await curl({ url: item.url, headers: [], output: out, location: true, maxTime: 60 });
      if (dl.code !== 0) {
        loudFail(`imagine[openai]: download failed (curl ${dl.code})`);
        return 3;
      }
    } else {
      loudFail(`imagine[openai]: no image in response: ${r.out.slice(0, 300)}`);
      return 2;
    }
    recordImagine({ backend: "openai", model, size, out, prompt: promptText, status: "ok", bytes: bytes(out) });
  } finally {
    rmSync(payload, { force: true });
  }
  ok(`imagine[openai]: wrote ${out} (${bytes(out)} bytes)`);
  return 0;
}

// fal.ai request history — GET /v1/models/requests/by-endpoint (expand=payloads
// returns json_input so the PROMPT is visible). endpoint_id is required by fal,
// defaults to the imagine fal default model; override with -m a,b. openai has no
// list endpoint → falls back to the local ledger.
async function history(args: string[]): Promise<number> {
  let backend = "fal";
  let endpoints = "";
  let start = "";
  let limit = "20";
  let status = "";
  let local = false;
  let asJson = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === "-b" || a === "--backend") && i + 1 < args.length) backend = args[++i];
    else if ((a === "-m" || a === "--endpoint") && i + 1 < args.length) endpoints = args[++i];
    else if (a === "--start" && i + 1 < args.length) start = args[++i];
    else if (a === "--limit" && i + 1 < args.length) limit = args[++i];
    else if (a === "--status" && i + 1 < args.length) status = args[++i];
    else if (a === "--local") local = true;
    else if (a === "--json") asJson = true;
  }

  if (local || backend === "openai") {
    const rows = readJsonl<Record<string, unknown>>(LEDGER).slice(-parseInt(limit, 10) || -20).reverse();
    if (backend === "openai" && !local) info("imagine: openai has no provider history endpoint — showing local ledger.");
    if (!rows.length) {
      info(`imagine history (local): none recorded yet → ${LEDGER}`);
      return 0;
    }
    if (asJson) {
      process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
      return 0;
    }
    info(`imagine history (local · ${LEDGER}):`);
    for (const r of rows) info(`  ${r.ts}  ${r.backend}/${r.model}  ${r.size}  ${r.status}  ${r.out}\n    "${String(r.prompt ?? "").slice(0, 120)}"`);
    return 0;
  }

  // fal provider history
  const key = await secretGet("fal.api_key");
  if (!key) {
    loudFail("imagine history: `secret get fal.api_key` empty.");
    return 1;
  }
  const ids = (endpoints || BACKENDS.fal.defaultModel).split(",").map((s) => s.trim()).filter(Boolean);
  const qs = new URLSearchParams();
  for (const id of ids) qs.append("endpoint_id", id);
  qs.set("limit", limit);
  qs.set("expand", "payloads");
  if (start) qs.set("start", start);
  if (status) qs.set("status", status);
  const r = await curl({ url: `https://api.fal.ai/v1/models/requests/by-endpoint?${qs.toString()}`, headers: [`Authorization: Key ${key}`], maxTime: 30 });
  if (r.code !== 0) {
    loudFail(`imagine history: request failed (curl ${r.code})`);
    return 1;
  }
  let items: Array<Record<string, unknown>> = [];
  try {
    const j = JSON.parse(r.out);
    if (j.error) {
      loudFail(`imagine history: fal error — ${JSON.stringify(j.error)}`);
      return 1;
    }
    items = j.items ?? [];
  } catch {
    loudFail(`imagine history: bad response: ${r.out.slice(0, 300)}`);
    return 1;
  }
  if (asJson) {
    process.stdout.write(JSON.stringify(items, null, 2) + "\n");
    return 0;
  }
  if (!items.length) {
    info(`imagine history (fal · ${ids.join(",")}): no requests in window (default last 24h; --start to widen).`);
    return 0;
  }
  info(`imagine history (fal · ${ids.join(",")} · ${items.length}):`);
  for (const it of items) {
    const inp = (it.json_input ?? {}) as Record<string, unknown>;
    const prompt = String(inp.prompt ?? "").replace(/\s+/g, " ").slice(0, 120);
    info(`  ${it.ended_at ?? it.started_at ?? ""}  ${it.status_code ?? "?"}  ${it.request_id}  ${it.endpoint_id}\n    "${prompt}"`);
  }
  return 0;
}

function usage(): void {
  info("harness imagine <prompt-file> <out.{png|mp4}> [-s size] [-b backend] [-m model] [-i image]");
  info("  list · help");
  info("  history [-b fal|openai] [-m endpoint_id,…] [--start <iso>] [--limit N] [--status success|error] [--local] [--json]");
  info("          fal: provider request history w/ prompts (GET /v1/models/requests/by-endpoint) · openai/--local: local ledger");
  info(`  image:    out=.png/.jpg → fal · default openai/gpt-image-2 (image2)   sizes: ${SIZES.join(" · ")} (default square_hd)`);
  info("  video t2v: out=.mp4/.mov/.webm → fal · default bytedance/seedance-2.0/text-to-video (시댄스 2.0)");
  info("  video i2v: + -i <image-file|url> → fal · default bytedance/seedance-2.0/image-to-video (the image animates)");
  info("  backend:  fal (default — image openai/gpt-image-2 · video Seedance 2.0) · openai (gpt-image-1, images only)");
  info("  keys:     secret get fal.api_key · secret get openai.api_key");
  info("  prompt is read from a FILE (provenance, no argv leak); model -m overrides the pinned default");
}

export async function runImagine(args: string[]): Promise<number> {
  const sub = args[0];
  if (!sub || sub === "help" || sub === "-h" || sub === "--help") {
    usage();
    return 0;
  }
  if (sub === "history" || sub === "hist") return history(args.slice(1));
  if (sub === "list") {
    info("imagine backends:");
    for (const [name, b] of Object.entries(BACKENDS)) info(`  ${name}  default image model ${b.defaultModel}  key: secret get ${b.keyName}`);
    info(`imagine video (out=.mp4/.mov/.webm): fal · t2v ${VIDEO_T2V_MODEL} · i2v(+ -i) ${VIDEO_I2V_MODEL} (시댄스 2.0 · fast tier: …/fast/…)`);
    info(`imagine sizes: ${SIZES.join(" · ")}`);
    return 0;
  }

  const pos: string[] = [];
  let size = "square_hd";
  let backend = "fal";
  let model = "";
  let imageRef = ""; // -i <image>: input image → image-to-video (Seedance 2.0)
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === "-s" || a === "--size") && i + 1 < args.length) size = args[++i];
    else if ((a === "-b" || a === "--backend") && i + 1 < args.length) backend = args[++i];
    else if ((a === "-m" || a === "--model") && i + 1 < args.length) model = args[++i];
    else if ((a === "-i" || a === "--image") && i + 1 < args.length) imageRef = args[++i];
    else pos.push(a);
  }
  const [promptArg, outArg] = pos;
  if (!promptArg || !outArg) {
    loudFail("imagine: usage: <prompt-file> <out.{png|mp4}> [-s size] [-b backend] [-m model]");
    return 1;
  }
  // VIDEO path: out is a video file → fal queue + Seedance 2.0 default (no image-size).
  const video = isVideoOut(outArg);
  if (!video && !SIZES.includes(size)) {
    loudFail(`imagine: unknown size '${size}' — one of: ${SIZES.join(" · ")}`);
    return 1;
  }
  if (video && backend === "openai") {
    loudFail("imagine: video output is fal-only (openai backend is images) — drop `-b openai` for video.");
    return 1;
  }
  if (imageRef && !video) {
    loudFail("imagine: -i <image> is for image-to-video — give a video output (e.g. out.mp4).");
    return 1;
  }
  if (!BACKENDS[backend]) {
    loudFail(`imagine: unknown backend '${backend}' — one of: ${Object.keys(BACKENDS).join(" · ")} (run 'harness imagine list')`);
    return 1;
  }
  if (!(await secretBin())) {
    loudFail("imagine: `secret` CLI not found (needed for API keys) — install dancinlab/secret or `hx install secret`");
    return 1;
  }

  const cwd = process.env.PWD ?? process.cwd();
  const promptFile = resolve(cwd, promptArg);
  if (!existsSync(promptFile)) {
    loudFail(`imagine: prompt file not found: ${promptFile} (pass a FILE, not an inline prompt)`);
    return 1;
  }
  const out = resolve(cwd, outArg);
  mkdirSync(dirname(out), { recursive: true });

  if (video) {
    const imageUrl = imageRef ? resolveImageInput(imageRef, cwd) : "";
    if (imageRef && !imageUrl) return 1; // resolveImageInput already reported
    const resolvedModel = model || (imageUrl ? VIDEO_I2V_MODEL : VIDEO_T2V_MODEL);
    return backendFal(promptFile, out, size, resolvedModel, "video", imageUrl);
  }
  const resolvedModel = model || BACKENDS[backend].defaultModel;
  return backend === "openai"
    ? backendOpenai(promptFile, out, size, resolvedModel)
    : backendFal(promptFile, out, size, resolvedModel, "image");
}
