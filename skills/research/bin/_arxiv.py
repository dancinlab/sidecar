#!/usr/bin/env python3
# research :: arXiv search / fetch.
#
# Pure stdlib: the official arXiv API (export.arxiv.org/api/query)
# returns an Atom XML feed; parse it with xml.etree. No pip deps, no
# API key. A query that looks like an arXiv id (`2401.12345`) becomes
# an id_list lookup; anything else is a free-text relevance search.
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

API = "http://export.arxiv.org/api/query"
ATOM = "{http://www.w3.org/2005/Atom}"
ARXIV_ID = re.compile(r"(?:arxiv:)?(\d{4}\.\d{4,5}(?:v\d+)?)$", re.I)
MAX_AUTHORS = 12


def _get(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "sidecar research plugin"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", "replace")


def build_url(args):
    """Parse `<terms...> [--n N]` into an arXiv API URL, or None."""
    n, terms, i = 5, [], 0
    while i < len(args):
        if args[i] in ("--n", "-n") and i + 1 < len(args):
            try:
                n = max(1, min(30, int(args[i + 1])))
            except ValueError:
                pass
            i += 2
            continue
        terms.append(args[i])
        i += 1
    q = " ".join(terms).strip()
    if not q:
        return None
    m = ARXIV_ID.match(q)
    if m:
        return "%s?id_list=%s&max_results=%d" % (API, m.group(1), n)
    return "%s?search_query=%s&start=0&max_results=%d&sortBy=relevance" % (
        API, urllib.parse.quote("all:" + q), n)


def _clean(s):
    return re.sub(r"\s+", " ", (s or "").strip())


def fmt_entry(idx, e):
    title = _clean(e.findtext(ATOM + "title"))
    summary = _clean(e.findtext(ATOM + "summary"))
    published = (e.findtext(ATOM + "published") or "")[:10]
    aid = (e.findtext(ATOM + "id") or "").rsplit("/", 1)[-1]
    authors = [_clean(a.findtext(ATOM + "name"))
               for a in e.findall(ATOM + "author")]
    if len(authors) > MAX_AUTHORS:
        authors = authors[:MAX_AUTHORS] + ["… (+%d more)"
                                           % (len(authors) - MAX_AUTHORS)]
    cats = [c.get("term") for c in e.findall(ATOM + "category")
            if c.get("term")]
    pdf = ""
    for link in e.findall(ATOM + "link"):
        if link.get("title") == "pdf":
            pdf = link.get("href", "")
    lines = ["## [%d] %s" % (idx, title or "(untitled)"),
             "   id: %s · %s · %s" % (aid, published or "?",
                                      ", ".join(cats) or "?"),
             "   authors: %s" % (", ".join(authors) or "?")]
    if pdf:
        lines.append("   pdf: %s" % pdf)
    lines.append("   abstract: %s" % (summary or "(none)"))
    return "\n".join(lines)


def main():
    args = [a for a in sys.argv[1:] if a.strip()]
    if not args:
        print("research/arxiv: usage: /research:arxiv "
              "<query | arxiv-id> [--n N]")
        return
    url = build_url(args)
    if not url:
        print("research/arxiv: empty query")
        return
    try:
        root = ET.fromstring(_get(url))
    except urllib.error.URLError as e:
        print("research/arxiv: network error — %s" % e)
        return
    except ET.ParseError as e:
        print("research/arxiv: unexpected API response — %s" % e)
        return
    entries = root.findall(ATOM + "entry")
    if not entries:
        print("research/arxiv: no results")
        return
    print("# arXiv — %d result(s)" % len(entries))
    for idx, e in enumerate(entries, 1):
        print()
        print(fmt_entry(idx, e))


if __name__ == "__main__":
    main()
