// harness research {arxiv <query|id> [--n N] | yt <url|id> [lang]}
// Fetch external research material (sidecar research-skill parity), no API key:
//   arxiv  search the official arXiv API by free-text, or fetch by id — returns
//          title / authors / date / categories / pdf link / abstract.
//   yt     extract a YouTube caption transcript via the InnerTube `player` API
//          (ANDROID client; the watch-page baseUrl serves empty timedtext, the
//          ANDROID client's caption-track baseUrls still serve content).
// Network-dependent — fails gracefully when offline. Don't burst >5 arxiv/min.
import { info, ok, loudFail } from "../lib/log.ts";

const ANDROID_VERSION = "20.10.38";

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}
const clean = (s: string) => decodeEntities(s.replace(/\s+/g, " ").trim());

function tagText(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? clean(m[1]) : "";
}
function allTagText(block: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out.push(clean(m[1]));
  return out;
}

// ── arXiv ──────────────────────────────────────────────────────────────────
function looksLikeArxivId(s: string): boolean {
  return /^\d{4}\.\d{4,5}(v\d+)?$/.test(s) || /^[a-z-]+(\.[A-Z]{2})?\/\d{7}(v\d+)?$/.test(s);
}

async function arxiv(args: string[]): Promise<number> {
  let n = 5;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--n" || args[i] === "-n") && i + 1 < args.length) n = parseInt(args[++i], 10) || 5;
    else rest.push(args[i]);
  }
  const q = rest.join(" ").trim();
  if (!q) {
    info("usage: harness research arxiv <query | arxiv-id> [--n N]");
    return 1;
  }
  const query = looksLikeArxivId(q)
    ? `id_list=${encodeURIComponent(q)}`
    : `search_query=${encodeURIComponent("all:" + q)}&sortBy=submittedDate&sortOrder=descending`;
  const url = `https://export.arxiv.org/api/query?${query}&max_results=${Math.max(1, Math.min(50, n))}`;
  let xml: string;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "harness-research/1.0" } });
    xml = await r.text();
  } catch (e) {
    loudFail(`research arxiv: network error — ${String(e).slice(0, 120)}`);
    return 1;
  }
  const entries = xml.split("<entry>").slice(1).map((b) => b.split("</entry>")[0]);
  if (!entries.length) {
    info(`research arxiv: no results for "${q}"`);
    return 0;
  }
  info(`research arxiv: ${entries.length} result(s) for "${q}"`);
  for (const e of entries) {
    const title = tagText(e, "title");
    const authors = allTagText(e, "name");
    const published = tagText(e, "published").slice(0, 10);
    const cats = [...e.matchAll(/<category[^>]*term="([^"]+)"/g)].map((m) => m[1]).filter((c) => !c.includes("arxiv"));
    const idUrl = tagText(e, "id");
    const pdf = (e.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/) || [])[1] || idUrl.replace("/abs/", "/pdf/");
    const summary = tagText(e, "summary");
    info("");
    info(`  ▸ ${title}`);
    info(`    ${authors.slice(0, 6).join(", ")}${authors.length > 6 ? ", …" : ""}  ·  ${published}  ·  ${cats.slice(0, 4).join(" ")}`);
    info(`    ${pdf}`);
    info(`    ${summary.slice(0, 320)}${summary.length > 320 ? "…" : ""}`);
  }
  return 0;
}

// ── YouTube transcript ───────────────────────────────────────────────────────
function videoId(s: string): string {
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m =
    s.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    s.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

async function yt(args: string[]): Promise<number> {
  const src = args[0];
  const lang = args[1] ?? "";
  if (!src) {
    info("usage: harness research yt <youtube-url-or-id> [lang]");
    return 1;
  }
  const vid = videoId(src);
  if (!vid) {
    loudFail(`research yt: could not parse a video id from '${src}'`);
    return 1;
  }
  const body = JSON.stringify({
    videoId: vid,
    context: { client: { clientName: "ANDROID", clientVersion: ANDROID_VERSION, androidSdkVersion: 34, hl: "en" } },
  });
  let pr: Record<string, unknown>;
  try {
    const r = await fetch("https://www.youtube.com/youtubei/v1/player", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": `com.google.android.youtube/${ANDROID_VERSION} (Linux; U; Android 14)` },
      body,
    });
    pr = (await r.json()) as Record<string, unknown>;
  } catch (e) {
    loudFail(`research yt: network error — ${String(e).slice(0, 120)}`);
    return 1;
  }
  const tracks =
    ((pr.captions as any)?.playerCaptionsTracklistRenderer?.captionTracks as Array<{ baseUrl: string; languageCode: string; kind?: string }>) ?? [];
  if (!tracks.length) {
    const status = (pr.playabilityStatus as any)?.status ?? "?";
    info(`research yt: no caption tracks for ${vid} (playability=${status})`);
    return 0;
  }
  const track = (lang && tracks.find((t) => t.languageCode === lang)) || tracks.find((t) => t.languageCode === "en") || tracks[0];
  const capUrl = track.baseUrl.replace(/&fmt=[^&]*/, "") + "&fmt=json3";
  let lines: string[] = [];
  try {
    const r = await fetch(capUrl);
    const text = await r.text();
    try {
      const j = JSON.parse(text);
      lines = (j.events ?? [])
        .map((ev: any) => (ev.segs ?? []).map((s: any) => s.utf8 ?? "").join("").trim())
        .filter(Boolean);
    } catch {
      // XML timedtext fallback
      lines = decodeEntities(text.replace(/<\/p>|<\/text>/g, "\n").replace(/<[^>]+>/g, ""))
        .split("\n").map((l) => l.trim()).filter(Boolean);
    }
  } catch (e) {
    loudFail(`research yt: caption fetch failed — ${String(e).slice(0, 120)}`);
    return 1;
  }
  if (!lines.length) {
    info(`research yt: empty transcript for ${vid}`);
    return 0;
  }
  // dedup consecutive identical lines (ASR rolling repeats)
  const out: string[] = [];
  for (const l of lines) if (l !== out[out.length - 1]) out.push(l);
  ok(`research yt: ${vid} transcript (${track.languageCode}${track.kind === "asr" ? " · auto" : ""}) — ${out.length} lines`);
  process.stdout.write(out.join("\n") + "\n");
  return 0;
}

export async function runResearch(args: string[]): Promise<number> {
  const sub = args[0];
  if (sub === "arxiv") return arxiv(args.slice(1));
  if (sub === "yt" || sub === "youtube") return yt(args.slice(1));
  info("usage: harness research {arxiv <query|id> [--n N] | yt <url|id> [lang]}");
  return 1;
}
