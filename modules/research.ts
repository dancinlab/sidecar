// sidecar research {arxiv <query|id> [--n N] [--sort relevance|date|updated] | yt <url|id> [lang] | web <query> [--n N] | fetch <url>}
// Fetch external research material, no API key:
//   arxiv  search the official arXiv API by free-text (relevance-ranked, per-term AND),
//          or fetch by id — returns title / authors / date / categories / pdf / abstract.
//   yt     extract a YouTube caption transcript via the InnerTube `player` API
//          (ANDROID client; the watch-page baseUrl serves empty timedtext, the
//          ANDROID client's caption-track baseUrls still serve content).
//   web    keyless web SEARCH via the DuckDuckGo lite endpoint — returns ranked
//          title / url / snippet rows (the WebSearch half of an agent's web tools).
//   fetch  keyless page FETCH — GET a url and strip HTML to readable text
//          (the WebFetch half). Claude Code already has native WebSearch/WebFetch;
//          these mirror them as a deterministic CLI usable from any agent runtime.
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
  // Default sort = relevance. A free-text query wants the BEST-matching papers, not
  // the newest — sortBy=submittedDate returned the latest arXiv uploads regardless of
  // the query terms (a "DiffusionGemma" paper for an "inhibitory plasticity" query).
  // --sort date|updated restores recency ordering when the caller genuinely wants it.
  let sort = "relevance";
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--n" || args[i] === "-n") && i + 1 < args.length) n = parseInt(args[++i], 10) || 5;
    else if ((args[i] === "--sort" || args[i] === "-s") && i + 1 < args.length) {
      const v = args[++i].toLowerCase();
      sort = v === "date" || v === "submitteddate" ? "submittedDate"
        : v === "updated" || v === "lastupdateddate" ? "lastUpdatedDate"
        : "relevance";
    } else rest.push(args[i]);
  }
  const q = rest.join(" ").trim();
  if (!q) {
    info("usage: sidecar research arxiv <query | arxiv-id> [--n N] [--sort relevance|date|updated]");
    return 1;
  }
  let query: string;
  if (looksLikeArxivId(q)) {
    query = `id_list=${encodeURIComponent(q)}`;
  } else {
    // arXiv joins bare space-separated terms with OR (so "a b c" matches a OR b OR c —
    // noisy). Prefix each term with the all: field and join with AND for a precise
    // conjunctive search; a "quoted phrase" is kept as one all:"…" term.
    const terms = q.match(/"[^"]+"|\S+/g) ?? [q];
    const searchExpr = terms.map((t) => `all:${t}`).join(" AND ");
    const sortPart = sort === "relevance" ? "sortBy=relevance" : `sortBy=${sort}&sortOrder=descending`;
    query = `search_query=${encodeURIComponent(searchExpr)}&${sortPart}`;
  }
  const url = `https://export.arxiv.org/api/query?${query}&max_results=${Math.max(1, Math.min(50, n))}`;
  // arXiv throttles bursts (>~1 req / 3s) with a bare "Rate exceeded." body — which
  // is NOT an empty result set. Two-part handling so an AI agent recognizes + recovers:
  //   1) auto-retry with backoff (3s, 6s) — a transient burst self-heals, and each
  //      backoff EMITS a notice so the agent knows it's rate-limited, not stuck/broken.
  //   2) if it persists, loudFail with a clear rate-limit error (exit 1) — never the
  //      misleading "no results" (which reads as "the paper doesn't exist").
  const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
  // A throttle (text "Rate exceeded." OR a 5xx page) is NOT a valid Atom feed.
  const isThrottle = (status: number, body: string): boolean =>
    status >= 500 || /rate exceeded/i.test(body) || (!body.includes("<feed") && !body.includes("<entry"));
  let xml = "";
  let throttled = false;
  for (let attempt = 0; attempt <= 2; attempt++) {
    let status = 0;
    try {
      const r = await fetch(url, { headers: { "User-Agent": "sidecar-research/1.0" } });
      status = r.status;
      xml = await r.text();
    } catch (e) {
      loudFail(`research arxiv: network error — ${String(e).slice(0, 120)}`);
      return 1;
    }
    throttled = isThrottle(status, xml);
    if (!throttled) break; // valid Atom feed (possibly empty) — proceed
    if (attempt < 2) {
      const backoff = (attempt + 1) * 3;
      info(`research arxiv: ⏳ arXiv rate-limited (burst${status ? " · HTTP " + status : ""}) — backing off ${backoff}s, auto-retry ${attempt + 1}/2 (keep calls ≤1 req/3s)`);
      await sleep(backoff * 1000);
    }
  }
  if (throttled) {
    loudFail(`research arxiv: arXiv still rate-limiting after 2 retries — this is a RATE limit (not a missing paper / not a bug). Wait ~30s and retry; keep calls to ≤1 req/3s`);
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
    info("usage: sidecar research yt <youtube-url-or-id> [lang]");
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

// ── Web search (keyless · DuckDuckGo lite) ───────────────────────────────────
// The WebSearch half of an agent's web tools. DDG's lite endpoint is keyless and
// returns plain HTML rows: <a … class='result-link'>TITLE</a> + <td class='result-snippet'>…</td>.
function stripTags(s: string): string {
  return clean(decodeEntities(s.replace(/<[^>]+>/g, " ")));
}

async function web(args: string[]): Promise<number> {
  let n = 8;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--n" || args[i] === "-n") && i + 1 < args.length) n = parseInt(args[++i], 10) || 8;
    else rest.push(args[i]);
  }
  const q = rest.join(" ").trim();
  if (!q) {
    info("usage: sidecar research web <query> [--n N]");
    return 1;
  }
  let page: string;
  try {
    const r = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0" },
      body: new URLSearchParams({ q }).toString(),
    });
    page = await r.text();
  } catch (e) {
    loudFail(`research web: network error — ${String(e).slice(0, 120)}`);
    return 1;
  }
  // class quoting varies ('…' or "…"); match either. Links and snippets line up by order.
  const links = [...page.matchAll(/<a[^>]*href="([^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/g)];
  const snips = [...page.matchAll(/class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]));
  if (!links.length) {
    info(`research web: no results for '${q}'`);
    return 0;
  }
  const shown = Math.min(links.length, n);
  ok(`research web: '${q}' — ${shown} results (DuckDuckGo)`);
  for (let i = 0; i < shown; i++) {
    const url = decodeEntities(links[i][1]);
    const title = stripTags(links[i][2]);
    const snip = snips[i] ?? "";
    info("");
    info(`  ▸ ${title}`);
    info(`    ${url}`);
    if (snip) info(`    ${snip.slice(0, 300)}${snip.length > 300 ? "…" : ""}`);
  }
  return 0;
}

// ── Page fetch (keyless · HTML → readable text) ──────────────────────────────
// The WebFetch half — GET a url, strip script/style + tags to readable text.
async function fetchPage(args: string[]): Promise<number> {
  const url = args[0];
  if (!url || !/^https?:\/\//.test(url)) {
    info("usage: sidecar research fetch <http(s)-url>");
    return 1;
  }
  let body: string;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; sidecar-research)" } });
    if (!r.ok) {
      loudFail(`research fetch: HTTP ${r.status} for ${url}`);
      return 1;
    }
    body = await r.text();
  } catch (e) {
    loudFail(`research fetch: network error — ${String(e).slice(0, 120)}`);
    return 1;
  }
  const titleM = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const text = decodeEntities(
    body
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer)>/gi, "\n")
      .replace(/<br[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const CAP = 15000;
  ok(`research fetch: ${url}${titleM ? ` — ${clean(titleM[1])}` : ""} (${text.length} chars)`);
  process.stdout.write(text.slice(0, CAP) + (text.length > CAP ? "\n…[truncated]" : "") + "\n");
  return 0;
}

export async function runResearch(args: string[]): Promise<number> {
  const sub = args[0];
  if (sub === "arxiv") return arxiv(args.slice(1));
  if (sub === "yt" || sub === "youtube") return yt(args.slice(1));
  if (sub === "web" || sub === "search") return web(args.slice(1));
  if (sub === "fetch" || sub === "url") return fetchPage(args.slice(1));
  info("usage: sidecar research {arxiv <query|id> [--n N] [--sort relevance|date|updated] | yt <url|id> [lang] | web <query> [--n N] | fetch <url>}");
  return 1;
}
