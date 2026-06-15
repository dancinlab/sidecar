// harness watch <url|path> [question…] [flags]
// Give the agent the ability to WATCH a video (sidecar /watch parity): download
// with yt-dlp (any platform it supports + local files), extract auto-scaled
// frames with ffmpeg, and pull a timestamped transcript (native captions first,
// optional Whisper via Groq/OpenAI). Prints the frame paths + transcript so the
// agent can Read the frames and answer grounded in what's on screen and said.
// Captions-first; a missing Whisper key NEVER fails the run (degrades to
// captions-only, then frames-only). Keys via env or the `secret` CLI.
// flags: --start S --end S --max-frames N --fps F --resolution W
//        --whisper groq|openai --no-whisper --out-dir DIR
import { execShell } from "../lib/exec.ts";
import { secretGet } from "./secret.ts";
import { info, ok, warn, loudFail } from "../lib/log.ts";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { resolve, basename } from "node:path";
import { tmpdir } from "node:os";

async function has(bin: string): Promise<boolean> {
  return (await execShell(`command -v ${bin} 2>/dev/null`)).stdout.trim().length > 0;
}

function frameBudget(dur: number): number {
  if (dur <= 30) return 30;
  if (dur <= 60) return 40;
  if (dur <= 180) return 60;
  if (dur <= 600) return 80;
  return 100;
}

// "MM:SS" / "HH:MM:SS" / "SS" → seconds (0 if empty/unparseable)
function toSec(t: string): number {
  if (!t) return 0;
  const p = t.split(":").map(Number);
  if (p.some(isNaN)) return 0;
  return p.reduce((a, b) => a * 60 + b, 0);
}

function ts(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// VTT → "[mm:ss] text" lines (dedup consecutive)
function parseVtt(vtt: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (const raw of vtt.split("\n")) {
    const line = raw.trim();
    const tm = line.match(/^(\d{2}):(\d{2}):(\d{2})[.,]\d+\s*-->/);
    if (tm) {
      cur = ts(parseInt(tm[1]) * 3600 + parseInt(tm[2]) * 60 + parseInt(tm[3]));
      continue;
    }
    if (!line || line === "WEBVTT" || /^\d+$/.test(line) || line.startsWith("Kind:") || line.startsWith("Language:")) continue;
    const text = line.replace(/<[^>]+>/g, "").trim();
    if (text && text !== out[out.length - 1]?.replace(/^\[\d+:\d+\]\s/, "")) out.push(`[${cur}] ${text}`);
  }
  return out;
}

async function whisper(audio: string, backend: string): Promise<string[]> {
  const cfg = backend === "openai"
    ? { url: "https://api.openai.com/v1/audio/transcriptions", key: "openai.api_key", env: "OPENAI_API_KEY", model: "whisper-1" }
    : { url: "https://api.groq.com/openai/v1/audio/transcriptions", key: "groq.api_key", env: "GROQ_API_KEY", model: "whisper-large-v3" };
  const key = process.env[cfg.env] || (await secretGet(cfg.key));
  if (!key) {
    warn(`watch: no ${backend} key (env ${cfg.env} / secret ${cfg.key}) — skipping Whisper, frames-only.`);
    return [];
  }
  const r = await execShell(
    `curl -sS --max-time 300 ${JSON.stringify(cfg.url)} -H ${JSON.stringify("Authorization: Bearer " + key)} -F file=@${JSON.stringify(audio)} -F model=${cfg.model} -F response_format=text`,
    { timeoutMs: 320_000 }
  );
  if (r.code !== 0) {
    warn(`watch: Whisper(${backend}) failed (curl ${r.code}) — frames-only.`);
    return [];
  }
  return r.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
}

export async function runWatch(args: string[]): Promise<number> {
  // parse
  let start = "", end = "", maxFrames = 0, fpsOverride = 0, res = "640", whisperBackend = "groq", useWhisper = true, outDir = "";
  const pos: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--start") start = args[++i];
    else if (a === "--end") end = args[++i];
    else if (a === "--max-frames") maxFrames = parseInt(args[++i], 10) || 0;
    else if (a === "--fps") fpsOverride = parseFloat(args[++i]) || 0;
    else if (a === "--resolution") res = args[++i];
    else if (a === "--whisper") whisperBackend = args[++i];
    else if (a === "--no-whisper") useWhisper = false;
    else if (a === "--out-dir") outDir = args[++i];
    else pos.push(a);
  }
  const source = pos[0];
  const question = pos.slice(1).join(" ");
  if (!source) {
    info("usage: harness watch <url|path> [question] [--start S --end S --max-frames N --fps F --resolution W --whisper groq|openai --no-whisper --out-dir DIR]");
    return 1;
  }
  if (!(await has("ffmpeg")) || !(await has("ffprobe"))) {
    loudFail("watch: ffmpeg/ffprobe not found — install: brew install ffmpeg (or apt/dnf install ffmpeg)");
    return 1;
  }

  const out = outDir ? resolve(outDir) : resolve(tmpdir(), `harness-watch-${process.pid}`);
  mkdirSync(out, { recursive: true });
  const isLocal = existsSync(source);
  let video = "";
  const subs: string[] = [];

  if (isLocal) {
    video = resolve(source);
  } else {
    if (!(await has("yt-dlp"))) {
      loudFail("watch: yt-dlp not found (needed for URLs) — install: brew install yt-dlp (or pipx install yt-dlp)");
      return 1;
    }
    info(`watch: downloading ${source} …`);
    // subtitles are best-effort (--ignore-errors so a 429 on subs never aborts
    // the video); narrow to english variants to avoid a per-language request burst.
    const dl = await execShell(
      `yt-dlp -q --no-warnings --ignore-errors -f "bv*[height<=720]+ba/b[height<=720]/b" --write-subs --write-auto-subs --sub-langs "en.*,en" --sub-format "vtt" -o ${JSON.stringify(out + "/video.%(ext)s")} ${JSON.stringify(source)}`,
      { timeoutMs: 420_000 }
    );
    const files = readdirSync(out);
    video = out + "/" + (files.find((f) => /video\.(mp4|mkv|webm|mov)$/.test(f)) ?? "");
    for (const f of files) if (f.endsWith(".vtt")) subs.push(out + "/" + f);
    // proceed as long as the VIDEO downloaded — a subtitle failure is non-fatal.
    if (!existsSync(video)) {
      loudFail(`watch: download produced no video file (yt-dlp exit ${dl.code})\n${dl.stderr.slice(0, 400)}`);
      return 1;
    }
    if (dl.code !== 0) warn("watch: yt-dlp reported non-fatal errors (likely subtitles) — continuing with the downloaded video.");
  }

  // duration
  const probe = await execShell(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 ${JSON.stringify(video)}`);
  const dur = parseFloat(probe.stdout.trim()) || 0;
  // effective window = the selected [start,end] span when given, else full duration
  const winEnd = toSec(end) || dur;
  const win = Math.max(1, winEnd - toSec(start));
  const cap = maxFrames || frameBudget(win);
  const fps = fpsOverride || Math.min(2, cap / win);

  // frames
  const ss = start ? `-ss ${JSON.stringify(start)} ` : "";
  const to = end ? `-to ${JSON.stringify(end)} ` : "";
  const fr = await execShell(
    `ffmpeg -y -loglevel error ${ss}${to}-i ${JSON.stringify(video)} -vf ${JSON.stringify(`fps=${fps},scale=${res}:-2`)} -pix_fmt yuvj420p -frames:v ${cap} ${JSON.stringify(out + "/frame_%04d.jpg")}`,
    { timeoutMs: 300_000 }
  );
  if (fr.code !== 0) {
    loudFail(`watch: ffmpeg frame extraction failed (exit ${fr.code})\n${fr.stderr.slice(0, 300)}`);
    return 1;
  }
  const frames = readdirSync(out).filter((f) => /^frame_\d+\.jpg$/.test(f)).sort();

  // transcript: captions-first, optional whisper fallback
  let transcript: string[] = [];
  for (const s of subs) {
    try {
      transcript = parseVtt(readFileSync(s, "utf8"));
      if (transcript.length) break;
    } catch { /* next */ }
  }
  if (!transcript.length && useWhisper) {
    const audio = out + "/audio.mp3";
    const ax = await execShell(`ffmpeg -y -loglevel error ${ss}${to}-i ${JSON.stringify(video)} -vn -ac 1 -ar 16000 -b:a 64k ${JSON.stringify(audio)}`, { timeoutMs: 180_000 });
    if (ax.code === 0 && existsSync(audio)) transcript = await whisper(audio, whisperBackend);
  }

  // report
  ok(`watch: ${basename(video)} · ${dur ? ts(dur) : "?"} · ${frames.length} frames @ ${fps.toFixed(2)}fps · transcript ${transcript.length} lines`);
  info(`frames dir: ${out}`);
  info("frames (Read these images to see the video):");
  for (const f of frames) info(`  ${out}/${f}`);
  if (question) info(`\nquestion: ${question}`);
  if (transcript.length) {
    info("\n── transcript ──");
    process.stdout.write(transcript.join("\n") + "\n");
  } else {
    info("\n(no transcript — frames-only; pass --whisper groq with a key for audio, or the video has no captions)");
  }
  return 0;
}
