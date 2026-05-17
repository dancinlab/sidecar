#!/usr/bin/env python3
# wilson-lsp — minimal LSP server (stdio JSON-RPC) for dancinlab formats.
#
#   python3 _lsp.py <fmt>     fmt ∈ tape | n6 | hxc | kosmos
#
# Capabilities: textDocumentSync=full + publishDiagnostics. No deps. Real,
# spec-grounded structural diagnostics (conservative — only clear
# violations, near-zero false positives). `.hexa` is NOT here — it has a
# first-class `hexa lsp` server which .lsp.json wires directly.
import json
import re
import sys

# ── shared edge alphabet (n6 / tape) ─────────────────────────────────
EDGE_PREFIXES = ("<-", "->", "=>", "==", "~>", "|>", "!!")
N6_TYPES = set("PCLFRSXQ?")          # primitive/constant/law/formula/
#                                      relation/symmetry/crossing/?-open
TAPE_TYPES = set("SUATRHDKP?")       # session/user/assistant/tool/result/
#                                      hook/decision/cost/provider/anomaly
TAPE_STATES = {"ok", "err", "denied", "cancelled", "partial", "superseded"}

HDR = re.compile(r"^@(?P<t>\S)\s+\S.*::\s*\S+\s*\[[^\]]+\]\s*$")


def _diag(line, col, end, msg, sev=1):
    return {
        "range": {"start": {"line": line, "character": col},
                  "end": {"line": line, "character": end}},
        "severity": sev, "source": "wilson-lsp", "message": msg,
    }


def _atline(text):
    return text.split("\n")


# ── n6 / tape share a family grammar ─────────────────────────────────
def _validate_n6_family(text, types, is_tape):
    out = []
    for i, raw in enumerate(_atline(text)):
        s = raw.rstrip("\r")
        t = s.strip()
        if t == "" or t.startswith("#"):
            continue
        indent = len(s) - len(s.lstrip(" "))
        if s.startswith("@"):
            if indent != 0:
                out.append(_diag(i, 0, len(s),
                                 "entry header must start at column 0"))
                continue
            ty = s[1] if len(s) > 1 else ""
            if ty not in types:
                out.append(_diag(i, 1, 2,
                    "unknown entry type @%s (expected one of @%s)"
                    % (ty, "/@".join(sorted(types)))))
            if not HDR.match(s):
                out.append(_diag(i, 0, len(s),
                    "malformed header — expected "
                    "`@<type> <id> [= expr] :: <domain> [<grade>]`"))
            elif is_tape:
                br = s[s.rfind("[") + 1:s.rfind("]")].split()
                st = br[-1] if br else ""
                if st not in TAPE_STATES:
                    out.append(_diag(i, s.rfind("["), len(s),
                        "unknown delivery-state %r (expected %s)"
                        % (st, "/".join(sorted(TAPE_STATES)))))
        else:
            # continuation: indented edge or quoted string
            if indent != 2:
                out.append(_diag(i, 0, len(s),
                    "continuation/edge must be indented exactly 2 spaces"))
                continue
            if t.startswith('"'):
                continue
            if not any(t.startswith(p) for p in EDGE_PREFIXES):
                out.append(_diag(i, indent, len(s),
                    "edge must start with one of %s (or be a \"string\")"
                    % " ".join(EDGE_PREFIXES)))
    return out


# ── hxc: `# schema:<id> k1 k2 ...` then `@<id> v|v|...` ───────────────
def _validate_hxc(text):
    out, arity = [], {}
    for i, raw in enumerate(_atline(text)):
        s = raw.rstrip("\r")
        t = s.strip()
        if t == "":
            continue
        m = re.match(r"^#\s*schema:(\S+)\s+(.+)$", t)
        if m:
            arity[m.group(1)] = len(m.group(2).split())
            continue
        if t.startswith("#"):
            continue
        m = re.match(r"^@(\S+)\s+(.*)$", t)
        if not m:
            out.append(_diag(i, 0, len(s),
                "expected `@<schema-id> v1|v2|...` or `# schema:<id> ...`"))
            continue
        sid, rest = m.group(1), m.group(2)
        if sid not in arity:
            out.append(_diag(i, 1, 1 + len(sid),
                "schema %r used before its `# schema:%s ...` declaration"
                % (sid, sid)))
            continue
        n = len(rest.split("|"))
        if n != arity[sid]:
            out.append(_diag(i, 0, len(s),
                "schema %r expects %d fields, got %d"
                % (sid, arity[sid], n)))
    return out


# ── kosmos: one anchor; coord + @payload <modality> := ... ───────────
def _validate_kosmos(text):
    out, has_coord, payloads = [], False, 0
    for i, raw in enumerate(_atline(text)):
        s = raw.rstrip("\r")
        t = s.strip()
        if t == "" or t.startswith("#"):
            continue
        if re.match(r"^coord\s*[:=]", t):
            has_coord = True
        if t.startswith("@payload"):
            payloads += 1
            if not re.match(r"^@payload\s+\S+\s*:=", t):
                out.append(_diag(i, 0, len(s),
                    "payload must be `@payload <modality> := ...`"))
    if not has_coord:
        out.append(_diag(0, 0, 1,
            "kosmos anchor has no `coord` placement line", sev=2))
    if payloads == 0:
        out.append(_diag(0, 0, 1,
            "kosmos anchor declares no `@payload <modality> :=`", sev=2))
    return out


VALIDATORS = {
    "tape": lambda x: _validate_n6_family(x, TAPE_TYPES, True),
    "n6": lambda x: _validate_n6_family(x, N6_TYPES, False),
    "hxc": _validate_hxc,
    "kosmos": _validate_kosmos,
}


# ── minimal LSP JSON-RPC over stdio ──────────────────────────────────
def _read_msg():
    headers = {}
    while True:
        line = sys.stdin.buffer.readline()
        if not line:
            return None
        line = line.decode("ascii", "replace").strip()
        if line == "":
            break
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip().lower()] = v.strip()
    n = int(headers.get("content-length", "0"))
    body = sys.stdin.buffer.read(n) if n else b""
    try:
        return json.loads(body.decode("utf-8", "replace"))
    except Exception:
        return {}


def _send(obj):
    data = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(
        b"Content-Length: %d\r\n\r\n" % len(data) + data)
    sys.stdout.buffer.flush()


def _publish(uri, validate, text):
    try:
        diags = validate(text)
    except Exception as e:
        diags = [_diag(0, 0, 1, "wilson-lsp internal: %s" % e, sev=2)]
    _send({"jsonrpc": "2.0", "method": "textDocument/publishDiagnostics",
           "params": {"uri": uri, "diagnostics": diags}})


def main():
    fmt = sys.argv[1] if len(sys.argv) > 1 else ""
    validate = VALIDATORS.get(fmt)
    if validate is None:
        sys.stderr.write("wilson-lsp: unknown format %r\n" % fmt)
        sys.exit(2)
    while True:
        msg = _read_msg()
        if msg is None:
            break
        m = msg.get("method")
        if m == "initialize":
            _send({"jsonrpc": "2.0", "id": msg.get("id"),
                   "result": {"capabilities": {"textDocumentSync": 1},
                              "serverInfo": {"name": "wilson-lsp/" + fmt}}})
        elif m == "shutdown":
            _send({"jsonrpc": "2.0", "id": msg.get("id"), "result": None})
        elif m == "exit":
            break
        elif m == "textDocument/didOpen":
            d = msg["params"]["textDocument"]
            _publish(d["uri"], validate, d.get("text", ""))
        elif m == "textDocument/didChange":
            p = msg["params"]
            ch = p.get("contentChanges") or [{}]
            _publish(p["textDocument"]["uri"], validate,
                     ch[-1].get("text", ""))
        elif m == "textDocument/didClose":
            _send({"jsonrpc": "2.0",
                   "method": "textDocument/publishDiagnostics",
                   "params": {"uri": msg["params"]["textDocument"]["uri"],
                              "diagnostics": []}})
        # other requests: ignore (notifications) or no-op


if __name__ == "__main__":
    main()
