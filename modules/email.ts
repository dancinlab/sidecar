// harness email send --to <a[,b]> --subject <s> [--from <a>] [--text <file>|-m <inline>]
//                    [--html <file>] [--cc <a>] [--bcc <a>] [--reply-to <a>] [--tag <t>]
//                    [--stream <id>] [--attach <file>]... [--dry]
//              | history [--count N] [--offset N] [--tag t] [--json] | list | help
// Transactional email sender over the Postmark REST API (POST /email). The server
// token comes from the `secret` CLI (`secret get postmark.server_token`) — never
// inline, never logged. The token is passed to curl through a `-K` config file so
// it never appears in the process list (same technique as `imagine`). The body is
// read from a FILE (provenance, no argv leak) for --text/--html; -m allows a short
// inline text body for convenience. --dry renders the payload without sending.
import { execShell } from "../lib/exec.ts";
import { secretGet, secretBin } from "./secret.ts";
import { info, ok, warn, loudFail, appendJsonl, nowIso } from "../lib/log.ts";
import { readJsonl } from "../lib/json.ts";
import { LOG_DIR } from "../lib/paths.ts";
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, basename } from "node:path";
import { tmpdir } from "node:os";

const LEDGER = resolve(LOG_DIR, "email.jsonl");
const API = "https://api.postmarkapp.com";
const TOKEN_KEY = "postmark.server_token"; // secret store key
const FROM_KEY = "postmark.from"; // optional default From address
const DEFAULT_STREAM = "outbound";

let _tmpSeq = 0;
function tmp(content: string): string {
  const p = resolve(tmpdir(), `harness-email-${process.pid}-${_tmpSeq++}`);
  writeFileSync(p, content, "utf8");
  return p;
}

// curl config file (-K): keeps the auth token + url out of the process argv.
function curlConfig(opts: { url: string; headers: string[]; method?: string; dataFile?: string; maxTime?: number }): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const lines = ["silent", "show-error"];
  if (opts.method) lines.push(`request = "${esc(opts.method)}"`);
  lines.push(`url = "${esc(opts.url)}"`);
  for (const h of opts.headers) lines.push(`header = "${esc(h)}"`);
  if (opts.dataFile) lines.push(`data-binary = "@${esc(opts.dataFile)}"`);
  lines.push(`max-time = ${opts.maxTime ?? 30}`);
  return lines.join("\n") + "\n";
}

async function curl(opts: Parameters<typeof curlConfig>[0]): Promise<{ code: number; out: string }> {
  const cfg = tmp(curlConfig(opts));
  try {
    const r = await execShell(`curl -K ${JSON.stringify(cfg)}`, { timeoutMs: (opts.maxTime ?? 30) * 1000 + 5000 });
    return { code: r.code, out: r.stdout + r.stderr };
  } finally {
    rmSync(cfg, { force: true });
  }
}

const MIME: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", txt: "text/plain",
  csv: "text/csv", json: "application/json", html: "text/html", md: "text/markdown",
  zip: "application/zip", doc: "application/msword", xls: "application/vnd.ms-excel",
};
function mimeOf(p: string): string {
  return MIME[(p.split(".").pop() ?? "").toLowerCase()] ?? "application/octet-stream";
}

// read a body file relative to cwd; loudFail + return null if missing.
function readBody(ref: string, cwd: string, label: string): string | null {
  const p = resolve(cwd, ref);
  if (!existsSync(p)) {
    loudFail(`email: ${label} file not found: ${p} (pass a FILE)`);
    return null;
  }
  return readFileSync(p, "utf8");
}

function recordEmail(e: Record<string, unknown>): void {
  appendJsonl(LEDGER, { kind: "email", ts: nowIso(), ...e });
}

function usage(): void {
  info("harness email send --to <a[,b]> --subject <s> [--from <a>] [--text <file>|-m <inline>] [--html <file>]");
  info("                   [--cc <a[,b]>] [--bcc <a[,b]>] [--reply-to <a>] [--tag <t>] [--stream <id>] [--attach <file>]... [--dry]");
  info("  history [--count N] [--offset N] [--tag <t>] [--json]   Postmark outbound messages API");
  info("  list                                                    show config (token presence · default From · stream)");
  info("  help");
  info(`  token: secret get ${TOKEN_KEY}   ·   optional default From: secret get ${FROM_KEY}`);
  info("  body is read from a FILE (--text/--html, provenance · no argv leak); -m gives a short inline text body");
  info(`  default message stream: ${DEFAULT_STREAM}   ·   --dry renders the payload without sending`);
}

async function send(args: string[]): Promise<number> {
  let to = "", from = "", subject = "", textRef = "", htmlRef = "", inlineText = "";
  let cc = "", bcc = "", replyTo = "", tag = "", stream = DEFAULT_STREAM, dry = false;
  const attach: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = () => args[++i];
    if (a === "--to" || a === "-t") to = next();
    else if (a === "--from" || a === "-f") from = next();
    else if (a === "--subject" || a === "-s") subject = next();
    else if (a === "--text") textRef = next();
    else if (a === "-m" || a === "--message") inlineText = next();
    else if (a === "--html") htmlRef = next();
    else if (a === "--cc") cc = next();
    else if (a === "--bcc") bcc = next();
    else if (a === "--reply-to") replyTo = next();
    else if (a === "--tag") tag = next();
    else if (a === "--stream") stream = next();
    else if (a === "--attach" || a === "-a") attach.push(next());
    else if (a === "--dry" || a === "--dry-run") dry = true;
    else {
      loudFail(`email: unknown flag '${a}' (run 'harness email help')`);
      return 1;
    }
  }

  const cwd = process.env.PWD ?? process.cwd();
  if (!from) from = await secretGet(FROM_KEY); // optional default sender
  if (!to) { loudFail("email: --to <addr> required"); return 1; }
  if (!from) { loudFail(`email: --from <addr> required (or set a default: secret set ${FROM_KEY})`); return 1; }
  if (!subject) { loudFail("email: --subject <s> required"); return 1; }

  const body: Record<string, unknown> = {
    From: from,
    To: to,
    Subject: subject,
    MessageStream: stream,
  };
  if (cc) body.Cc = cc;
  if (bcc) body.Bcc = bcc;
  if (replyTo) body.ReplyTo = replyTo;
  if (tag) body.Tag = tag;

  if (textRef) {
    const t = readBody(textRef, cwd, "--text");
    if (t === null) return 1;
    body.TextBody = t;
  } else if (inlineText) {
    body.TextBody = inlineText;
  }
  if (htmlRef) {
    const h = readBody(htmlRef, cwd, "--html");
    if (h === null) return 1;
    body.HtmlBody = h;
  }
  if (!body.TextBody && !body.HtmlBody) {
    loudFail("email: a body is required — pass --text <file>, --html <file>, or -m <inline text>");
    return 1;
  }

  if (attach.length) {
    const list: Array<Record<string, string>> = [];
    for (const ref of attach) {
      const p = resolve(cwd, ref);
      if (!existsSync(p)) { loudFail(`email: --attach file not found: ${p}`); return 1; }
      list.push({ Name: basename(p), Content: readFileSync(p).toString("base64"), ContentType: mimeOf(p) });
    }
    body.Attachments = list;
  }

  if (dry) {
    // never print Attachments' base64 — summarize them instead.
    const preview = { ...body, Attachments: attach.length ? `[${attach.map((a) => basename(a)).join(", ")}]` : undefined };
    info("email: --dry (not sent) — payload:");
    process.stdout.write(JSON.stringify(preview, null, 2) + "\n");
    return 0;
  }

  if (!(await secretBin())) {
    loudFail("email: `secret` CLI not found (needed for the Postmark token) — install dancinlab/secret or `hx install secret`");
    return 1;
  }
  const token = await secretGet(TOKEN_KEY);
  if (!token) {
    loudFail(`email: \`secret get ${TOKEN_KEY}\` empty — set with \`secret set ${TOKEN_KEY}\``);
    return 1;
  }

  const payload = tmp(JSON.stringify(body));
  try {
    const r = await curl({
      method: "POST",
      url: `${API}/email`,
      headers: ["Accept: application/json", "Content-Type: application/json", `X-Postmark-Server-Token: ${token}`],
      dataFile: payload,
      maxTime: 30,
    });
    if (r.code !== 0) {
      loudFail(`email: request failed (curl ${r.code})`);
      return 1;
    }
    let resp: { ErrorCode?: number; Message?: string; MessageID?: string; SubmittedAt?: string };
    try {
      resp = JSON.parse(r.out);
    } catch {
      loudFail(`email: bad response: ${r.out.slice(0, 300)}`);
      return 2;
    }
    if (resp.ErrorCode && resp.ErrorCode !== 0) {
      loudFail(`email: Postmark error ${resp.ErrorCode} — ${resp.Message ?? r.out.slice(0, 200)}`);
      recordEmail({ to, from, subject, tag, stream, status: "error", error_code: resp.ErrorCode, message: resp.Message });
      return 2;
    }
    recordEmail({ to, from, subject, tag, stream, status: "ok", message_id: resp.MessageID, submitted_at: resp.SubmittedAt, attachments: attach.length });
    ok(`email: sent to ${to}  (MessageID ${resp.MessageID ?? "?"} · ${subject})`);
  } finally {
    rmSync(payload, { force: true });
  }
  return 0;
}

// Postmark outbound messages API: GET /messages/outbound?count=&offset=&tag=
async function history(args: string[]): Promise<number> {
  let count = "20", offset = "0", tag = "", asJson = false, local = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--count" && i + 1 < args.length) count = args[++i];
    else if (a === "--offset" && i + 1 < args.length) offset = args[++i];
    else if (a === "--tag" && i + 1 < args.length) tag = args[++i];
    else if (a === "--json") asJson = true;
    else if (a === "--local") local = true;
  }

  if (local) {
    const rows = readJsonl<Record<string, unknown>>(LEDGER).slice(-(parseInt(count, 10) || 20)).reverse();
    if (!rows.length) { info(`email history (local): none recorded yet → ${LEDGER}`); return 0; }
    if (asJson) { process.stdout.write(JSON.stringify(rows, null, 2) + "\n"); return 0; }
    info(`email history (local · ${LEDGER}):`);
    for (const r of rows) info(`  ${r.ts}  ${r.status}  ${r.to}  "${String(r.subject ?? "").slice(0, 80)}"`);
    return 0;
  }

  const token = await secretGet(TOKEN_KEY);
  if (!token) { loudFail(`email history: \`secret get ${TOKEN_KEY}\` empty — use --local for the local ledger.`); return 1; }
  const qs = new URLSearchParams({ count, offset });
  if (tag) qs.set("tag", tag);
  const r = await curl({ url: `${API}/messages/outbound?${qs.toString()}`, headers: ["Accept: application/json", `X-Postmark-Server-Token: ${token}`], maxTime: 30 });
  if (r.code !== 0) { loudFail(`email history: request failed (curl ${r.code})`); return 1; }
  let j: { TotalCount?: number; Messages?: Array<Record<string, unknown>>; Message?: string };
  try {
    j = JSON.parse(r.out);
  } catch {
    loudFail(`email history: bad response: ${r.out.slice(0, 300)}`);
    return 1;
  }
  const msgs = j.Messages ?? [];
  if (asJson) { process.stdout.write(JSON.stringify(msgs, null, 2) + "\n"); return 0; }
  if (!msgs.length) { info(`email history (Postmark): no outbound messages${tag ? ` for tag '${tag}'` : ""}.`); return 0; }
  info(`email history (Postmark · ${msgs.length}/${j.TotalCount ?? "?"}):`);
  for (const m of msgs) {
    const recips = Array.isArray(m.Recipients) ? (m.Recipients as string[]).join(",") : "";
    info(`  ${m.ReceivedAt ?? ""}  ${m.Status ?? "?"}  ${recips}  "${String(m.Subject ?? "").slice(0, 80)}"`);
  }
  return 0;
}

export async function runEmail(args: string[]): Promise<number> {
  const sub = args[0];
  if (!sub || sub === "help" || sub === "-h" || sub === "--help") {
    usage();
    return 0;
  }
  if (sub === "history" || sub === "hist") return history(args.slice(1));
  if (sub === "list") {
    const hasBin = !!(await secretBin());
    const hasToken = hasBin && !!(await secretGet(TOKEN_KEY));
    const from = hasBin ? await secretGet(FROM_KEY) : "";
    info("email (Postmark transactional sender):");
    info(`  secret CLI:     ${hasBin ? "found" : "MISSING (install dancinlab/secret)"}`);
    info(`  server token:   ${hasToken ? "set ✓" : `NOT set — secret set ${TOKEN_KEY}`}`);
    info(`  default From:   ${from || `(none — pass --from or secret set ${FROM_KEY})`}`);
    info(`  message stream: ${DEFAULT_STREAM}  ·  API: ${API}/email`);
    return 0;
  }
  // default verb is `send`; allow both `email send …` and `email --to …`
  return send(sub === "send" ? args.slice(1) : args);
}
