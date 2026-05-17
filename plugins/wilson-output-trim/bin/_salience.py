#!/usr/bin/env python3
# wilson-output-trim :: salience filter (stdin -> stdout).
#
# Faithful Python port of wilson's compaction-prefilter kernel
# (TF-IDF line-salience + MinHash near-dup paragraph dedup). The wilson
# plugin runs this on the transcript at compaction time; Claude Code does
# NOT expose a transcript-transform point, so sidecar applies the SAME
# kernel at the only real lever: large Bash output, piped through here by
# the PreToolUse hook BEFORE the model ingests it.
#
# Contract: read all of stdin; if it is small (< THRESHOLD chars) pass it
# through VERBATIM (tiny outputs carry exact-value semantics — git SHAs,
# counts). Otherwise: MinHash-dedup duplicate paragraphs, then TF-IDF
# line-salience truncate by bucket. Only replace when it actually shrank.
# ALWAYS exit 0 so `set -o pipefail` surfaces the original command's code.
import math
import sys

# ── tunables (hive tfidf.archive.txt DEFAULTS) ───────────────────────
MIN_LEN = 3
TRUNC_HIGH = 400
TRUNC_MID = 200
TRUNC_LOW = 80
THRESHOLD = 8000          # below this many chars → verbatim passthrough
STOPWORDS = set((
    "the a an is are was were be been being have has had do does did will "
    "would could should may might shall can to of in for on with at by from "
    "as into about that this it its or and but if not no so up out i you he "
    "she we they me him her us them my your his our their what which who when "
    "where how all each every both few more most other some such than too "
    "very just also now then here there only"
).split())

# ── MinHash dedup tunables (hive minhash-daemon.hexa parity) ─────────
MASK32 = 0xFFFFFFFF
MERSENNE31 = 0x7FFFFFFF
FNV_OFFSET = 2166136261
FNV_PRIME = 16777619
SEED = 3735928559
K = 128
SHINGLE = 5
DEDUP_MINLEN = 80
DEDUP_T = 0.85
SIG_MAXCHARS = 4096


def _is_word_ch(c):
    o = ord(c)
    return (97 <= o <= 122) or (48 <= o <= 57) or o == 95 or o == 39  # a-z 0-9 _ '


def tokenize(text):
    lower = text.lower()
    toks, start = [], -1
    n = len(lower)
    for i in range(n):
        if _is_word_ch(lower[i]):
            if start < 0:
                start = i
        elif start > -1:
            w = lower[start:i]
            if len(w) > MIN_LEN - 1 and w not in STOPWORDS:
                toks.append(w)
            start = -1
    if start > -1:
        w = lower[start:n]
        if len(w) > MIN_LEN - 1 and w not in STOPWORDS:
            toks.append(w)
    return toks


def term_freq(toks):
    m = {}
    for t in toks:
        m[t] = m.get(t, 0) + 1
    return m


def pct(arr, p):  # arr ascending; idx = clamp(floor(n*p), 0, n-1)
    n = len(arr)
    if n == 0:
        return 0.0
    idx = int(n * p)
    return arr[max(0, min(idx, n - 1))]


def truncate(line, budget):
    if len(line) < budget + 1:
        return line
    if budget < 5:
        return line[:budget]
    return line[: budget - 1] + "…"


def compact(messages):
    # pass 1 — split into lines, tokenize, build global df
    msg_lines, all_tokens, df = [], [], {}
    for content in messages:
        lines = content.split("\n")
        msg_lines.append(lines)
        for ln in lines:
            toks = tokenize(ln)
            all_tokens.append(toks)
            for t in set(toks):
                df[t] = df.get(t, 0) + 1
    total = len(all_tokens)
    if total == 0:
        return messages
    n_f = float(total)

    # pass 2a — TF-IDF score per global line
    scores, nonzero = [], []
    for toks in all_tokens:
        if not toks:
            scores.append(0.0)
            continue
        tf = term_freq(toks)
        sc = sum(tf[t] * math.log(n_f / float(df.get(t, 1))) for t in tf)
        scores.append(sc)
        if sc > 0.0:
            nonzero.append(sc)
    nonzero.sort()
    cutoff_low = pct(nonzero, 0.3)
    cutoff_mid = pct(nonzero, 0.7)

    # pass 2b — rebuild, truncating by salience bucket; fences verbatim
    out, gidx = [], 0
    for lines in msg_lines:
        new_lines, in_fence = [], False
        for line in lines:
            if line.strip().startswith("```"):
                in_fence = not in_fence
                new_lines.append(line)
            elif in_fence:
                new_lines.append(line)
            else:
                sc = scores[gidx]
                tc = len(all_tokens[gidx])
                if tc == 0:
                    new_lines.append(
                        truncate(line, TRUNC_LOW)
                        if len(line) > TRUNC_LOW else line
                    )
                else:
                    budget = TRUNC_LOW
                    if sc > cutoff_mid:
                        budget = TRUNC_HIGH
                    elif sc > cutoff_low:
                        budget = TRUNC_MID
                    new_lines.append(truncate(line, budget))
            gidx += 1
        out.append("\n".join(new_lines))
    return out


# ── MinHash near-duplicate paragraph dedup ───────────────────────────
def _normalize(text):
    out, in_ws, started = [], False, False
    for ch in text.lower():
        if ch in " \t\n\r\f\v":
            in_ws = True
        else:
            if in_ws and started:
                out.append(" ")
            out.append(ch)
            started = True
            in_ws = False
    return "".join(out)


def _fnv1a32(s):
    h = FNV_OFFSET
    for ch in s:
        h ^= ord(ch) & 0xFF
        h = (h * FNV_PRIME) & MASK32
    return h


def _xs32(x):
    x &= MASK32
    if x == 0:
        x = 1
    x = (x ^ ((x << 13) & MASK32)) & MASK32
    x = (x ^ (x >> 17)) & MASK32
    x = (x ^ ((x << 5) & MASK32)) & MASK32
    return x


def _family():
    a, b, st = [], [], SEED & MASK32 or 1
    for _ in range(K):
        st = _xs32(st)
        av = st & MERSENNE31 or 1
        a.append(av)
        st = _xs32(st)
        b.append(st & MERSENNE31)
    return a, b


def _shingles(text, k):
    src = text[:SIG_MAXCHARS] if len(text) > SIG_MAXCHARS else text
    nz = _normalize(src)
    if len(nz) == 0:
        return []
    if len(nz) < k + 1:
        return [nz]
    return [nz[i:i + k] for i in range(0, len(nz) - k + 1)]


def _signature(text, a, b):
    shs = _shingles(text, SHINGLE)
    if not shs:
        return [0] * K
    sig = [MASK32] * K
    for sh in shs:
        hx = _fnv1a32(sh)
        for h in range(K):
            v = (a[h] * hx + b[h]) % MERSENNE31
            if v < sig[h]:
                sig[h] = v
    return sig


def _jaccard(x, y):
    n = len(x)
    if n == 0:
        return 0.0
    return sum(1 for i in range(n) if x[i] == y[i]) / float(n)


def _split_paras(content):
    paras, cur, have = [], "", False
    for ln in content.split("\n"):
        if len(ln.strip()) == 0:
            if have:
                paras.append(cur)
                cur, have = "", False
        else:
            cur = (cur + "\n" + ln) if have else ln
            have = True
    if have:
        paras.append(cur)
    return paras


def dedup(content):
    paras = _split_paras(content)
    if len(paras) < 2:
        return content
    a, b = _family()
    canon, out, pending = [], [], 0
    for p in paras:
        if len(p) < DEDUP_MINLEN:
            if pending > 0:
                out.append("[duplicate paragraph ×%d]" % pending)
                pending = 0
            out.append(p)
            continue
        sig = _signature(p, a, b)
        if any(_jaccard(sig, c) > DEDUP_T - 1e-6 for c in canon):
            pending += 1
        else:
            if pending > 0:
                out.append("[duplicate paragraph ×%d]" % pending)
                pending = 0
            canon.append(sig)
            out.append(p)
    if pending > 0:
        out.append("[duplicate paragraph ×%d]" % pending)
    return "\n\n".join(out)


def main():
    data = sys.stdin.buffer.read()
    text = data.decode("utf-8", errors="replace")
    if len(text) < THRESHOLD:
        sys.stdout.write(text)
        return
    before = len(text)
    reduced = compact([dedup(text)])[0]
    if len(reduced) < before:
        sys.stdout.write(reduced)
        sys.stdout.write(
            "\n\n[sidecar/wilson-output-trim: %d→%d chars "
            "(TF-IDF salience + MinHash dedup); rerun with "
            "SIDECAR_NO_OUTPUT_TRIM=1 for raw output]\n" % (before, len(reduced))
        )
    else:
        sys.stdout.write(text)


if __name__ == "__main__":
    main()
