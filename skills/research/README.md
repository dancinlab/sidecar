# research

Research-fetch tools — pull external material (arXiv papers, YouTube transcripts) directly into the Claude Code conversation.

## Verbs

```
/research:arxiv <query | arxiv-id> [--n N]   # N defaults to 5, max 30
/research:yt    <youtube-url-or-id> [lang]   # lang = ISO code (en, ko, ja, ...)
```

## Examples

```
/research:arxiv quantum error correction --n 10
/research:arxiv 2401.12345
/research:yt https://www.youtube.com/watch?v=dQw4w9WgXcQ
/research:yt dQw4w9WgXcQ en
```

## Implementation

- `bin/_arxiv.py` — `http://export.arxiv.org/api/query` + stdlib `xml.etree`.
- `bin/_yt.py` — InnerTube `player` API (ANDROID client) + timedtext XML decode.

Pure Python stdlib. No pip deps, no API keys, no binaries. Bump the `ANDROID_CLIENT` version in `_yt.py` if YouTube starts rejecting requests.
