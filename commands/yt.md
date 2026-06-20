---
description: Fetch a YouTube video's caption transcript (InnerTube ANDROID client) by URL or video id, optional language code. Returns plain transcript text the agent can read. No API key needed. Triggers — "유튜브 자막", "영상 자막 가져와", "youtube transcript", "transcript of this video", "/yt".
argument-hint: "<url | video-id> [lang]"
allowed-tools: Bash
---

!`command -v harness >/dev/null 2>&1 && harness research yt $ARGUMENTS || echo "harness CLI not found — install dancinlab/harness (~/.harness/cli + ~/.local/bin/harness on PATH)"`
