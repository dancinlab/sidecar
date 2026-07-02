// sidecar accounts [list|status|code <n|email>|add|retire <n>|init|help] — multi-account
// roster management over the `secret` CLI. DOMAIN-AGNOSTIC: which accounts exist is
// DATA — group patterns live in ~/.sidecar/accounts.json (host-global, like companions),
// and roster membership is DERIVED from secret-store keys matching the group's
// `secretPrefix` pattern (`{n}` = index). No dual SSOT: add/retire are pure secret-store
// operations; retired accounts move to the `legacyPrefix` namespace.
// Masking: emails print; passwords NEVER print (no verb reveals them — `secret get` is
// the only door). `code` fetches the newest verification OTP for an account via the
// configured source (gmail: OAuth creds from secret, curl -K — nothing in argv).
import { execShell } from "../lib/exec.ts";
import { secretGet, secretBin } from "./secret.ts";
import { info, ok, warn, loudFail, appendJsonl, nowIso } from "../lib/log.ts";
import { readJsonOr } from "../lib/json.ts";
import { LOG_DIR } from "../lib/paths.ts";
import { existsSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { homedir, tmpdir } from "node:os";

const CONFIG_PATH = resolve(homedir(), ".sidecar", "accounts.json");
const LEDGER = resolve(LOG_DIR, "accounts.jsonl");

interface GmailFetch {
  clientIdKey: string;
  clientSecretKey: string;
  refreshTokenKey: string;
  query?: string; // template: {email} {window}
  fromHint?: string;
  codeRegex?: string;
}
interface PostmarkFetch {
  serverTokenKey: string; // secret key holding the inbound server's token
  fromHint?: string;
  codeRegex?: string;
}
interface Group {
  label?: string;
  emailPattern: string; // e.g. "svc{n}@example.com"
  secretPrefix: string; // e.g. "svc{n}" → keys svc{n}.email / svc{n}.password
  legacyPrefix: string; // e.g. "legacy.svc{n}"
  fields?: string[]; // default ["email","password"]
  codeFetch?: { source: "gmail" | "postmark"; gmail?: GmailFetch; postmark?: PostmarkFetch };
}
interface AccountsConfig {
  groups: Record<string, Group>;
}

interface Account {
  index: number;
  email: string;
  hasFields: Record<string, boolean>;
  hasLegacy: boolean;
}

const EXAMPLE: AccountsConfig = {
  groups: {
    myservice: {
      label: "Example service accounts",
      emailPattern: "myservice{n}@example.com",
      secretPrefix: "myservice{n}",
      legacyPrefix: "legacy.myservice{n}",
      fields: ["email", "password"],
      codeFetch: {
        source: "gmail",
        gmail: {
          clientIdKey: "gmail.client_id",
          clientSecretKey: "gmail.client_secret",
          refreshTokenKey: "gmail.refresh_token",
          query: "to:{email} newer_than:{window}",
          fromHint: "example.com",
          codeRegex: "\\b(\\d{6,8})\\b",
        },
      },
    },
  },
};

const render = (pattern: string, n: number): string => pattern.split("{n}").join(String(n));
const escRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// "svc{n}" → /^svc(\d+)$/ applied against a key's prefix part.
const indexRe = (pattern: string, suffix: string): RegExp =>
  new RegExp("^" + pattern.split("{n}").map(escRe).join("(\\d+)") + escRe(suffix) + "$");

function loadConfig(): AccountsConfig | null {
  const c = readJsonOr<AccountsConfig | null>(CONFIG_PATH, null);
  if (!c || typeof c.groups !== "object" || !Object.keys(c.groups ?? {}).length) return null;
  return c;
}

function pickGroup(c: AccountsConfig, flag: string): [string, Group] | null {
  const names = Object.keys(c.groups);
  if (flag) {
    if (c.groups[flag]) return [flag, c.groups[flag]];
    loudFail(`accounts: unknown group '${flag}' (configured: ${names.join(", ")})`);
    return null;
  }
  if (names.length === 1) return [names[0], c.groups[names[0]]];
  loudFail(`accounts: --group required (configured: ${names.join(", ")})`);
  return null;
}

async function secretKeys(): Promise<string[]> {
  const bin = await secretBin();
  if (!bin) return [];
  const r = await execShell(`${JSON.stringify(bin)} list`);
  return r.code === 0 ? r.stdout.split("\n").map((s) => s.trim()).filter(Boolean) : [];
}

// Derive the roster: every index whose `<secretPrefix>.email` key exists.
async function roster(g: Group): Promise<Account[]> {
  const keys = await secretKeys();
  const keySet = new Set(keys);
  const fields = g.fields?.length ? g.fields : ["email", "password"];
  const re = indexRe(g.secretPrefix, ".email");
  const indices = new Set<number>();
  for (const k of keys) {
    const m = re.exec(k);
    if (m) indices.add(parseInt(m[1], 10));
  }
  const out: Account[] = [];
  for (const n of [...indices].sort((a, b) => a - b)) {
    const prefix = render(g.secretPrefix, n);
    const email = await secretGet(`${prefix}.email`);
    const hasFields: Record<string, boolean> = {};
    for (const f of fields) hasFields[f] = keySet.has(`${prefix}.${f}`);
    out.push({ index: n, email, hasFields, hasLegacy: keySet.has(`${render(g.legacyPrefix, n)}.email`) });
  }
  return out;
}

function record(e: Record<string, unknown>): void {
  appendJsonl(LEDGER, { kind: "accounts", ts: nowIso(), ...e });
}

function parseFlags(args: string[]): { pos: string[]; flags: Record<string, string | boolean> } {
  const pos: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--json" || a === "--force") flags[a.slice(2)] = true;
    else if (a.startsWith("--")) flags[a.slice(2)] = args[++i] ?? "";
    else pos.push(a);
  }
  return { pos, flags };
}

function usage(): void {
  info("sidecar accounts [list] [--group g] [--json]        roster (emails visible · passwords never)");
  info("  status [--group g] [--json]                       integrity check (pair-complete · code-fetch readiness)");
  info("  code <n|email> [--group g] [--window 10m] [--wait <sec>] [--json]   fetch newest verification OTP");
  info("  inbox [--group g] [--window 15m] [--wait <sec>] [--json]   quick check: verification mail across ALL accounts (age·n·code·from)");
  info("  add [--group g] [--index n]                       next index → email from pattern + `secret rotate` password");
  info("  retire <n> [--group g] [--force]                  move fields to the legacy namespace (store-to-store)");
  info("  init                                              scaffold ~/.sidecar/accounts.json example");
  info(`  config: ${CONFIG_PATH} (groups = data — the module carries zero domain literals)`);
}

// ---------------------------------------------------------------- list / status

async function list(g: Group, name: string, asJson: boolean): Promise<number> {
  const accs = await roster(g);
  const fields = g.fields?.length ? g.fields : ["email", "password"];
  if (asJson) {
    const rows = accs.map((a) => ({
      index: a.index,
      email: a.email,
      ...Object.fromEntries(fields.filter((f) => f !== "email").map((f) => [`has${f[0].toUpperCase()}${f.slice(1)}`, a.hasFields[f]])),
      hasLegacy: a.hasLegacy,
    }));
    process.stdout.write(JSON.stringify({ group: name, accounts: rows }) + "\n");
    return 0;
  }
  info(`accounts · group ${name}${g.label ? ` (${g.label})` : ""} — ${accs.length} active`);
  if (!accs.length) {
    info(`  none yet — sidecar accounts add${Object.keys(loadConfig()?.groups ?? {}).length > 1 ? ` --group ${name}` : ""}`);
    return 0;
  }
  const extra = fields.filter((f) => f !== "email");
  info(`  n    email${" ".repeat(Math.max(1, 30 - 5))}${extra.join("  ")}  legacy`);
  for (const a of accs) {
    const cells = extra.map((f) => (a.hasFields[f] ? "✓" : "✗").padEnd(f.length + 2)).join("");
    info(`  ${String(a.index).padEnd(4)} ${a.email.padEnd(30)}${cells}${a.hasLegacy ? "✓" : "-"}`);
  }
  return 0;
}

async function status(g: Group, name: string, asJson: boolean): Promise<number> {
  const accs = await roster(g);
  const fields = g.fields?.length ? g.fields : ["email", "password"];
  const problems: string[] = [];
  for (const a of accs)
    for (const f of fields)
      if (!a.hasFields[f]) problems.push(`index ${a.index}: missing ${render(g.secretPrefix, a.index)}.${f}`);
  // code-fetch readiness: the configured secret keys exist (presence only).
  const cf = g.codeFetch;
  const needKeys =
    cf?.source === "gmail" && cf.gmail ? [cf.gmail.clientIdKey, cf.gmail.clientSecretKey, cf.gmail.refreshTokenKey]
    : cf?.source === "postmark" && cf.postmark ? [cf.postmark.serverTokenKey]
    : null;
  const keys = await secretKeys();
  const fetchReady = needKeys ? needKeys.every((k) => keys.includes(k)) : false;
  if (needKeys && !fetchReady) problems.push(`code-fetch(${cf?.source}): missing one of ${needKeys.join(" / ")}`);
  if (asJson) {
    process.stdout.write(JSON.stringify({ group: name, active: accs.length, codeFetchReady: fetchReady, problems }) + "\n");
    return problems.length ? 1 : 0;
  }
  if (!accs.length) warn(`accounts status: group '${name}': no accounts yet — sidecar accounts add`);
  for (const p of problems) warn(`accounts status: ${p}`);
  if (!problems.length) ok(`accounts status: group ${name} — ${accs.length} active, all field pairs complete${needKeys ? `, code-fetch ready (${cf?.source})` : ""}`);
  return problems.length ? 1 : 0;
}

// ---------------------------------------------------------------- code (OTP fetch)

let _tmpSeq = 0;
function tmp(content: string): string {
  const p = resolve(tmpdir(), `sidecar-accounts-${process.pid}-${_tmpSeq++}`);
  writeFileSync(p, content, "utf8");
  return p;
}

// curl -K config file: token/query never in argv (same technique as email/imagine).
async function curlCfg(lines: string[], timeoutSec = 30): Promise<{ code: number; out: string }> {
  const cfg = tmp(["silent", "show-error", `max-time = ${timeoutSec}`, ...lines].join("\n") + "\n");
  try {
    const r = await execShell(`curl -K ${JSON.stringify(cfg)}`, { timeoutMs: timeoutSec * 1000 + 5000 });
    return { code: r.code, out: r.stdout + r.stderr };
  } finally {
    rmSync(cfg, { force: true });
  }
}
const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

async function gmailToken(gm: GmailFetch): Promise<string | null> {
  const [id, sec, ref] = await Promise.all([secretGet(gm.clientIdKey), secretGet(gm.clientSecretKey), secretGet(gm.refreshTokenKey)]);
  if (!id || !sec || !ref) {
    loudFail(`accounts code: gmail creds incomplete — need secret keys ${gm.clientIdKey} / ${gm.clientSecretKey} / ${gm.refreshTokenKey}`);
    return null;
  }
  const body = `client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(sec)}&refresh_token=${encodeURIComponent(ref)}&grant_type=refresh_token`;
  const dataFile = tmp(body);
  try {
    const r = await curlCfg([`url = ${q("https://oauth2.googleapis.com/token")}`, `data-binary = ${q("@" + dataFile)}`]);
    const j = JSON.parse(r.out || "{}");
    if (!j.access_token) {
      loudFail(`accounts code: gmail token refresh failed${j.error ? ` (${j.error})` : ""} — re-auth and update the 3 gmail secret keys`);
      return null;
    }
    return j.access_token as string;
  } catch {
    loudFail("accounts code: gmail token endpoint returned non-JSON");
    return null;
  } finally {
    rmSync(dataFile, { force: true });
  }
}

// walk MIME parts for the first text/plain body (base64url).
function textOf(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data)
    return Buffer.from(String(payload.body.data).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  for (const p of payload.parts ?? []) {
    const t = textOf(p);
    if (t) return t;
  }
  return "";
}

// window like "10m" / "2h" / "7d" → milliseconds.
function parseWindow(w: string): number {
  const m = /^(\d+)([smhd])$/.exec(w.trim());
  if (!m) return 15 * 60_000;
  return parseInt(m[1], 10) * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2] as "s" | "m" | "h" | "d"];
}

// Postmark Inbound Messages API scan (server token from secret · curl -K).
async function postmarkScan(pm: PostmarkFetch, accs: Account[], window: string, minMs: number, applyFromHint: boolean): Promise<InboxRow[] | "err"> {
  const token = await secretGet(pm.serverTokenKey);
  if (!token) {
    loudFail(`accounts: \`secret get ${pm.serverTokenKey}\` empty — store the inbound server token first`);
    return "err";
  }
  const auth = `header = ${q("X-Postmark-Server-Token: " + token)}`;
  const accept = `header = ${q("Accept: application/json")}`;
  // the default (no-status) listing shows only processed mail — messages awaiting/failing
  // webhook delivery sit in `scheduled`/`failed` and would be silently invisible. Query all
  // three states and dedup by MessageID (retry entries repeat).
  const msgs: any[] = [];
  const seen = new Set<string>();
  for (const st of ["", "scheduled", "failed"]) {
    const lr = await curlCfg([`url = ${q(`https://api.postmarkapp.com/messages/inbound?count=20&offset=0${st ? `&status=${st}` : ""}`)}`, accept, auth]);
    try {
      const lj = JSON.parse(lr.out || "{}");
      if (lj.ErrorCode) {
        loudFail(`accounts: Postmark inbound error ${lj.ErrorCode} — ${lj.Message ?? ""}`);
        return "err";
      }
      for (const m of lj.InboundMessages ?? []) {
        const id = String(m.MessageID ?? "");
        if (!seen.has(id)) {
          seen.add(id);
          msgs.push(m);
        }
      }
    } catch {
      loudFail(`accounts: Postmark inbound list failed: ${lr.out.slice(0, 200)}`);
      return "err";
    }
  }
  const re = new RegExp(pm.codeRegex ?? "\\b(\\d{6,8})\\b");
  const floor = Math.max(minMs, Date.now() - parseWindow(window));
  const rows: InboxRow[] = [];
  for (const m of msgs) {
    const internalMs = Date.parse(String(m.Date ?? "")) || 0;
    if (internalMs < floor) continue;
    const toLine = [...(m.ToFull ?? []).map((t: any) => String(t.Email ?? "")), String(m.To ?? "")].join(" ").toLowerCase();
    const acc = accs.find((a) => toLine.includes(a.email.toLowerCase()));
    if (!acc) continue;
    const from = String(m.From ?? "");
    if (applyFromHint && pm.fromHint && !from.toLowerCase().includes(pm.fromHint.toLowerCase())) continue;
    const subject = String(m.Subject ?? "");
    let hit = re.exec(subject);
    if (!hit) {
      // the body lives behind the details endpoint
      const dr = await curlCfg([`url = ${q(`https://api.postmarkapp.com/messages/inbound/${m.MessageID}/details`)}`, accept, auth]);
      try {
        const dj = JSON.parse(dr.out || "{}");
        hit = re.exec(String(dj.TextBody ?? "")) ?? re.exec(String(dj.HtmlBody ?? ""));
      } catch {
        hit = null;
      }
    }
    rows.push({ index: acc.index, email: acc.email, from, subject, code: hit ? hit[1] ?? hit[0] : null, receivedAt: new Date(internalMs).toISOString(), messageId: String(m.MessageID), internalMs });
  }
  return rows.sort((a, b) => b.internalMs - a.internalMs);
}

// Source dispatch — ONE scan API used by both `code` (single account · fromHint on)
// and `inbox` (all accounts · fromHint off, From shown instead).
async function sourceScan(g: Group, accs: Account[], window: string, minMs: number, applyFromHint: boolean): Promise<InboxRow[] | "err"> {
  if (g.codeFetch?.source === "gmail" && g.codeFetch.gmail) {
    const token = await gmailToken(g.codeFetch.gmail);
    if (!token) return "err";
    return inboxScan(g.codeFetch.gmail, token, accs, window, minMs, applyFromHint);
  }
  if (g.codeFetch?.source === "postmark" && g.codeFetch.postmark)
    return postmarkScan(g.codeFetch.postmark, accs, window, minMs, applyFromHint);
  loudFail(`accounts: no usable codeFetch source configured for this group (${CONFIG_PATH})`);
  return "err";
}

async function code(g: Group, name: string, target: string, flags: Record<string, string | boolean>): Promise<number> {
  if (!target) { loudFail("accounts code: <n|email> required"); return 1; }
  const accs = await roster(g);
  const acc = target.includes("@")
    ? accs.find((a) => a.email.toLowerCase() === target.toLowerCase())
    : accs.find((a) => a.index === parseInt(target, 10));
  if (!acc) { loudFail(`accounts code: no account '${target}' in group ${name}`); return 1; }

  const window = String(flags.window ?? "10m");
  const waitSec = parseInt(String(flags.wait ?? "0"), 10) || 0;
  const started = Date.now();
  // --wait accepts only mail newer than invocation start (−30 s slack): no stale-code replay.
  const minMs = waitSec ? started - 30_000 : 0;
  const deadline = started + waitSec * 1000;
  for (;;) {
    const rows = await sourceScan(g, [acc], window, minMs, true);
    if (rows === "err") return 2;
    const r = rows.find((x) => x.code);
    if (r) {
      record({ verb: "code", group: name, index: acc.index, email: acc.email, status: "ok", message_id: r.messageId });
      if (flags.json) process.stdout.write(JSON.stringify({ group: name, index: acc.index, email: acc.email, code: r.code, subject: r.subject, receivedAt: r.receivedAt, messageId: r.messageId }) + "\n");
      else {
        ok(`accounts code: ${acc.email} — "${r.subject}" (${r.receivedAt})`);
        process.stdout.write(r.code + "\n");
      }
      return 0;
    }
    if (Date.now() >= deadline) break;
    await new Promise((res) => setTimeout(res, 5000));
  }
  record({ verb: "code", group: name, index: acc.index, email: acc.email, status: "none" });
  loudFail(`accounts code: no matching mail for ${acc.email} (window ${window}${waitSec ? ` · waited ${waitSec}s` : ""}) — widen --window or use --wait`);
  return 3;
}

// ---------------------------------------------------------------- inbox (group-wide scan)

interface InboxRow { index: number; email: string; from: string; subject: string; code: string | null; receivedAt: string; messageId: string; internalMs: number }

// One gmail query over the given roster addresses: to:(a OR b OR …) — a single quick
// check of "did a login/verification mail just arrive, and for which account?".
async function inboxScan(gm: GmailFetch, token: string, accs: Account[], window: string, minMs: number, applyFromHint: boolean): Promise<InboxRow[] | "err"> {
  const orEmail = "(" + accs.map((a) => a.email).join(" OR ") + ")";
  const query = (gm.query ?? "to:{email} newer_than:{window}").split("{email}").join(orEmail).split("{window}").join(window);
  const auth = `header = ${q("Authorization: Bearer " + token)}`;
  const lr = await curlCfg([`url = ${q(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`)}`, auth]);
  let ids: string[];
  try {
    const lj = JSON.parse(lr.out || "{}");
    if (lj.error) {
      loudFail(`accounts inbox: gmail API error ${lj.error.code ?? "?"} — ${lj.error.message ?? ""} (token scopes? needs gmail.readonly)`);
      return "err";
    }
    ids = (lj.messages ?? []).map((m: any) => String(m.id));
  } catch {
    loudFail(`accounts inbox: gmail search failed: ${lr.out.slice(0, 200)}`);
    return "err";
  }
  const re = new RegExp(gm.codeRegex ?? "\\b(\\d{6,8})\\b");
  const rows: InboxRow[] = [];
  for (const id of ids) {
    const mr = await curlCfg([`url = ${q(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`)}`, auth]);
    let m: any;
    try {
      m = JSON.parse(mr.out || "{}");
    } catch {
      continue;
    }
    const hdr = (name: string) => String((m.payload?.headers ?? []).find((h: any) => h.name?.toLowerCase() === name)?.value ?? "");
    const internalMs = parseInt(String(m.internalDate ?? "0"), 10);
    if (internalMs < minMs) continue;
    const toLine = `${hdr("to")} ${hdr("delivered-to")}`.toLowerCase();
    const acc = accs.find((a) => toLine.includes(a.email.toLowerCase()));
    if (!acc) continue; // not addressed to a roster account
    if (applyFromHint && gm.fromHint && !hdr("from").toLowerCase().includes(gm.fromHint.toLowerCase())) continue;
    const subject = hdr("subject");
    // the code cell fills only when the OTP regex hits.
    const hit = re.exec(subject) ?? re.exec(textOf(m.payload));
    rows.push({ index: acc.index, email: acc.email, from: hdr("from"), subject, code: hit ? hit[1] ?? hit[0] : null, receivedAt: new Date(internalMs).toISOString(), messageId: String(m.id), internalMs });
  }
  return rows.sort((a, b) => b.internalMs - a.internalMs);
}

function age(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : `${Math.round(s / 3600)}h`;
}

async function inbox(g: Group, name: string, flags: Record<string, string | boolean>): Promise<number> {
  const accs = await roster(g);
  if (!accs.length) { loudFail(`accounts inbox: group '${name}' has no accounts`); return 1; }
  const window = String(flags.window ?? "15m");
  const waitSec = parseInt(String(flags.wait ?? "0"), 10) || 0;
  const started = Date.now();
  const minMs = waitSec ? started - 30_000 : 0; // --wait: only mail newer than invocation (−30 s slack)

  const deadline = started + waitSec * 1000;
  for (;;) {
    const rows = await sourceScan(g, accs, window, minMs, false);
    if (rows === "err") return 2;
    if (rows.length) {
      record({ verb: "inbox", group: name, status: "ok", mails: rows.length });
      if (flags.json) {
        process.stdout.write(JSON.stringify({ group: name, window, mails: rows.map(({ internalMs, ...r }) => r) }) + "\n");
        return 0;
      }
      info(`accounts inbox · group ${name} — ${rows.length} mail(s) in ${window}${waitSec ? " (waited)" : ""}`);
      info("  age   n    email                      code      from / subject");
      for (const r of rows) {
        const from = r.from.replace(/\s*<[^>]*>/, "").slice(0, 24);
        info(`  ${age(r.internalMs).padEnd(5)} ${String(r.index).padEnd(4)} ${r.email.padEnd(26)} ${(r.code ?? "-").padEnd(9)} ${from} · "${r.subject.slice(0, 48)}"`);
      }
      return 0;
    }
    if (Date.now() >= deadline) break;
    await new Promise((res) => setTimeout(res, 5000));
  }
  record({ verb: "inbox", group: name, status: "none" });
  loudFail(`accounts inbox: no mail to any of ${accs.length} accounts (window ${window}${waitSec ? ` · waited ${waitSec}s` : ""}) — widen --window or use --wait`);
  return 3;
}

// ---------------------------------------------------------------- add / retire

async function add(g: Group, name: string, flags: Record<string, string | boolean>): Promise<number> {
  const bin = await secretBin();
  if (!bin) { loudFail("accounts: `secret` CLI not found — install dancinlab/secret"); return 1; }
  const accs = await roster(g);
  const n = flags.index ? parseInt(String(flags.index), 10) : (accs.at(-1)?.index ?? 0) + 1;
  if (!Number.isInteger(n) || n < 1) { loudFail("accounts add: --index must be a positive integer"); return 1; }
  if (accs.some((a) => a.index === n)) { loudFail(`accounts add: index ${n} already active`); return 1; }
  const keys = await secretKeys();
  if (keys.includes(`${render(g.legacyPrefix, n)}.email`)) warn(`accounts add: index ${n} reuses a retired slot (${render(g.legacyPrefix, n)}.* keeps the history)`);
  const prefix = render(g.secretPrefix, n);
  const email = render(g.emailPattern, n);
  let r = await execShell(`${JSON.stringify(bin)} set ${JSON.stringify(`${prefix}.email`)} ${JSON.stringify(email)}`);
  if (r.code !== 0) { loudFail(`accounts add: secret set ${prefix}.email failed`); return 1; }
  r = await execShell(`${JSON.stringify(bin)} rotate ${JSON.stringify(`${prefix}.password`)} --bytes 24`);
  if (r.code !== 0) { loudFail(`accounts add: secret rotate ${prefix}.password failed`); return 1; }
  record({ verb: "add", group: name, index: n, email, status: "ok" });
  ok(`accounts add: ${email} (index ${n}) · password rotated (${prefix}.password — value never printed)`);
  info("accounts add: roster record only — create the mailbox/provider account itself manually");
  return 0;
}

async function retire(g: Group, name: string, target: string, force: boolean): Promise<number> {
  const bin = await secretBin();
  if (!bin) { loudFail("accounts: `secret` CLI not found — install dancinlab/secret"); return 1; }
  const n = parseInt(target, 10);
  if (!Number.isInteger(n)) { loudFail("accounts retire: <n> (index) required"); return 1; }
  const fields = g.fields?.length ? g.fields : ["email", "password"];
  const prefix = render(g.secretPrefix, n);
  const legacy = render(g.legacyPrefix, n);
  const keys = await secretKeys();
  const missing = fields.filter((f) => !keys.includes(`${prefix}.${f}`));
  if (missing.length) { loudFail(`accounts retire: index ${n} incomplete — missing ${missing.map((f) => `${prefix}.${f}`).join(", ")}`); return 1; }
  const occupied = fields.filter((f) => keys.includes(`${legacy}.${f}`));
  if (occupied.length && !force) {
    loudFail(`accounts retire: ${occupied.map((f) => `${legacy}.${f}`).join(", ")} already occupied (retired twice?) — --force to overwrite`);
    return 1;
  }
  const B = JSON.stringify(bin);
  for (const f of fields) {
    // store-to-store move: the value flows $(get) → set inside ONE shell — never into JS memory or logs.
    const mv = await execShell(`${B} set ${JSON.stringify(`${legacy}.${f}`)} "$(${B} get ${JSON.stringify(`${prefix}.${f}`)})" && ${B} delete ${JSON.stringify(`${prefix}.${f}`)}`);
    if (mv.code !== 0) { loudFail(`accounts retire: move ${prefix}.${f} → ${legacy}.${f} failed (store may be partially moved — check secret list)`); return 1; }
  }
  record({ verb: "retire", group: name, index: n, status: "ok", moved: fields.map((f) => `${prefix}.${f}→${legacy}.${f}`) });
  ok(`accounts retire: index ${n} → ${legacy}.* (${fields.length} keys moved)`);
  return 0;
}

// ---------------------------------------------------------------- entry

export async function runAccounts(args: string[]): Promise<number> {
  const { pos, flags } = parseFlags(args);
  const sub = pos[0] ?? "list";
  if (sub === "help" || sub === "-h" || sub === "--help") { usage(); return 0; }

  if (sub === "init") {
    if (existsSync(CONFIG_PATH)) { warn(`accounts init: ${CONFIG_PATH} already exists — edit it directly`); return 1; }
    await execShell(`mkdir -p ${JSON.stringify(resolve(homedir(), ".sidecar"))}`);
    writeFileSync(CONFIG_PATH, JSON.stringify(EXAMPLE, null, 2) + "\n", "utf8");
    ok(`accounts init: example written → ${CONFIG_PATH} (edit the group patterns, then \`sidecar accounts list\`)`);
    return 0;
  }

  const cfg = loadConfig();
  if (!cfg) { loudFail(`accounts: no config — scaffold with \`sidecar accounts init\` (${CONFIG_PATH})`); return 1; }
  const picked = pickGroup(cfg, String(flags.group ?? ""));
  if (!picked) return 1;
  const [name, g] = picked;

  if (sub === "list") return list(g, name, !!flags.json);
  if (sub === "status") return status(g, name, !!flags.json);
  if (sub === "code") return code(g, name, pos[1] ?? "", flags);
  if (sub === "inbox") return inbox(g, name, flags);
  if (sub === "add") return add(g, name, flags);
  if (sub === "retire") return retire(g, name, pos[1] ?? "", !!flags.force);
  loudFail(`accounts: unknown verb '${sub}' (run 'sidecar accounts help')`);
  return 1;
}
