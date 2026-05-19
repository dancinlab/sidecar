#!/usr/bin/env python3
# wilson-research :: YouTube transcript extractor.
#
# Pure stdlib (Decision 46): no pip deps, no external binary (yt-dlp).
# The transport is stdlib HTTP throughout — only the *endpoint* changed
# during build: the watch-page `ytInitialPlayerResponse` path stopped
# serving timedtext (YouTube returns an empty body for a watch-page
# baseUrl), so we POST to the InnerTube `player` API with the ANDROID
# client instead — its caption-track baseUrls still serve content.
#
# Fragility note: the only YouTube-internal coupling is the ANDROID
# client name/version below; isolated in player_response().
import html
import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

INNERTUBE = "https://www.youtube.com/youtubei/v1/player"
# ANDROID client — its player response carries caption baseUrls that
# still serve timedtext. Bump the version if YouTube starts rejecting it.
ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)"
ANDROID_CLIENT = {
    "clientName": "ANDROID",
    "clientVersion": "20.10.38",
    "androidSdkVersion": 34,
    "hl": "en",
}


def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": ANDROID_UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


def video_id(s):
    """Accept a bare 11-char id or any common YouTube URL form."""
    s = s.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", s):
        return s
    m = re.search(r"(?:v=|/shorts/|youtu\.be/|/embed/|/live/)"
                  r"([A-Za-z0-9_-]{11})", s)
    return m.group(1) if m else None


def player_response(vid):
    """POST the InnerTube player API with the ANDROID client."""
    body = json.dumps({"videoId": vid,
                       "context": {"client": ANDROID_CLIENT}}).encode()
    req = urllib.request.Request(
        INNERTUBE, data=body, method="POST",
        headers={"Content-Type": "application/json",
                 "User-Agent": ANDROID_UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def caption_tracks(vid):
    """(tracks, None) on success, (None, reason) on any failure."""
    pr = player_response(vid)
    status = (pr.get("playabilityStatus") or {})
    if status.get("status") and status["status"] != "OK":
        return None, ("video not playable: %s"
                      % (status.get("reason") or status["status"]))
    tracks = (((pr.get("captions") or {})
               .get("playerCaptionsTracklistRenderer") or {})
              .get("captionTracks"))
    if not tracks:
        return None, "this video has no caption tracks"
    return tracks, None


def pick_track(tracks, lang):
    """Honour an explicit language code; else prefer a human-authored
    English track, then any English, then whatever is first."""
    if lang:
        for t in tracks:
            if t.get("languageCode", "").lower() == lang.lower():
                return t
    for asr_ok in (False, True):
        for t in tracks:
            if t.get("languageCode", "").startswith("en") \
                    and (asr_ok or t.get("kind") != "asr"):
                return t
    return tracks[0]


def _parse_json3(raw):
    out = []
    for ev in json.loads(raw).get("events", []):
        segs = ev.get("segs")
        if not segs:
            continue
        line = "".join(s.get("utf8", "") for s in segs).strip()
        if line:
            out.append(line)
    return out


def _parse_xml(raw):
    # timedtext format 3 (<p>) or legacy (<text>); <p>/<text> may wrap
    # per-word <s>/segment children — itertext() gathers them all.
    root = ET.fromstring(raw)
    out, prev = [], None
    for el in root.iter():
        if el.tag not in ("p", "text"):
            continue
        line = html.unescape("".join(el.itertext())).strip()
        if line and line != prev:   # drop ASR rolling-window repeats
            out.append(line)
            prev = line
    return out


def transcript_text(track):
    """Fetch a caption track and flatten it to one line per cue.
    Forces json3; falls back to parsing whatever XML is returned."""
    url = re.sub(r"&fmt=[^&]*", "", track["baseUrl"]) + "&fmt=json3"
    raw = _get(url).strip()
    if raw.startswith("{"):
        lines = _parse_json3(raw)
    elif raw.startswith("<"):
        lines = _parse_xml(raw)
    else:
        lines = []
    return "\n".join(lines)


def main():
    args = [a for a in sys.argv[1:] if a.strip()]
    if not args:
        print("wilson-research/yt: usage: /wilson-research:yt "
              "<youtube-url-or-id> [lang]")
        return
    vid = video_id(args[0])
    if not vid:
        print("wilson-research/yt: could not parse a video id from %r"
              % args[0])
        return
    lang = args[1] if len(args) > 1 else None
    try:
        tracks, err = caption_tracks(vid)
        if err:
            print("wilson-research/yt: %s" % err)
            return
        track = pick_track(tracks, lang)
        text = transcript_text(track)
    except urllib.error.URLError as e:
        print("wilson-research/yt: network error — %s" % e)
        return
    except (ValueError, ET.ParseError) as e:
        print("wilson-research/yt: failed to parse the transcript — %s" % e)
        return
    avail = ", ".join(sorted({t.get("languageCode", "?") for t in tracks}))
    print("# YouTube transcript — %s" % vid)
    print("# track: %s (%s)  ·  available: %s"
          % (track.get("languageCode", "?"),
             "auto" if track.get("kind") == "asr" else "manual", avail))
    print("# https://www.youtube.com/watch?v=%s" % vid)
    print()
    print(text if text else "(the transcript track was empty)")


if __name__ == "__main__":
    main()
