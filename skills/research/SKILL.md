---
name: research
description: Fetch external research material — /arxiv <query|id> searches the official arXiv API or fetches by id; /yt <url-or-id> extracts a YouTube caption transcript. Triggers — "find the latest on X", "look up 2401.12345", "get the transcript of <video>", "what does <speaker> say in <talk>".
allowed-tools: Bash
---

@D research := "fetch arXiv + YouTube transcript material" :: skill
  do   = "`/arxiv <query|id>` for papers · `/yt <url|id>` for caption transcript"
  dont = "burst >5 arXiv calls/min (rate-limited) · assume network — fail gracefully when offline"
