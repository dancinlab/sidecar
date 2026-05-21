---
name: research
description: |
  Research-fetch trigger. Invoke when the user wants to pull external
  research material into the conversation — recent papers ("find the
  latest on X"), a specific arXiv id ("look up 2401.12345"), or a
  YouTube talk/paper-review/lecture transcript ("get the transcript
  of <video>", "what does <speaker> say in <talk>"). Two verbs:
  `/research:arxiv <query|id>` searches the official arXiv API or
  fetches by id (title · authors · date · categories · pdf · abstract);
  `/research:yt <url-or-id>` extracts caption transcript. Pure Python
  stdlib — no pip deps, no API keys, no binaries.
allowed-tools: Bash
---

# research — arXiv + YouTube transcript

## When to use

The user asks for external research material:
- *"find latest papers on <topic>"* → `/research:arxiv <topic>`
- *"look up arxiv 2401.12345"* → `/research:arxiv 2401.12345`
- *"transcript of this talk: <youtube-url>"* → `/research:yt <url>`
- *"what does the speaker say in <video-id>"* → `/research:yt <id>`

Run the slash command directly — the backend writes the fetched material to stdout, which lands in the conversation context for the model to read.

## Verbs

```
/research:arxiv <query | arxiv-id> [--n N]   # N defaults to 5, max 30
/research:yt    <youtube-url-or-id> [lang]   # lang = ISO code (en, ko, ja, ...)
```

## Backend

`bin/_arxiv.py` — calls `http://export.arxiv.org/api/query`, parses the Atom XML feed with stdlib `xml.etree`. A query matching `\d{4}\.\d{4,5}` is treated as an id; anything else is a free-text relevance search.

`bin/_yt.py` — calls the InnerTube `player` API with the ANDROID client (the watch-page `baseUrl` path returns empty bodies — the ANDROID client's caption-track baseUrls still serve content). Caption track XML is plaintext-decoded. Fragility note: only YouTube-internal coupling is the ANDROID client name/version, isolated in `player_response()`.

Both helpers are Python stdlib only — `urllib`, `xml.etree`, `json`, `re`. No `pip install`, no `yt-dlp`, no API key.

## Guardrails

- **Rate limits.** arXiv API caps unauthenticated traffic to ~1 req/sec. `_arxiv.py` does single-call fetches; bursts of >5 invocations per minute may get throttled.
- **YouTube fragility.** If `_yt.py` starts returning empty transcripts, the ANDROID client version in the source may need a bump (line near `ANDROID_CLIENT`).
- **Network required.** Both verbs are network calls — fail gracefully when offline.
