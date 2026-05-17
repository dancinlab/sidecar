#!/usr/bin/env python3
# wilson-gpu core — rented-GPU cost guardrail + lifecycle for RunPod /
# Vast.ai.
#
#   SessionStart  → if any instance is still billing, inject a "## GPU"
#                   block (uptime + estimated cost so far) so a forgotten
#                   pod never leaks money silently.
#   /wilson-gpu   → status | provisioning on|off | up | down | attach |
#                   detach.
#
# SAFETY — the money action is double-gated:
#   * provisioning is a SEPARATE switch, OFF by default
#       (/wilson-gpu provisioning on);
#   * AND `up` still needs an explicit `--yes` in the same call.
#   The guardrail, the `down` kill switch and `attach` always work — only
#   `up` is gated. Inert unless the provider CLI is on PATH.
#
# Opt out per session: SIDECAR_NO_GPU=1
import json
import os
import shutil
import subprocess
import sys
import time


def disabled():
    try:
        return "gpu" in json.load(open(os.path.join(
            os.path.expanduser("~"), ".claude", "sidecar",
            "disabled.json"), encoding="utf-8"))
    except Exception:
        return False


def data_dir():
    d = os.environ.get("CLAUDE_PLUGIN_DATA") or os.path.join(
        os.path.expanduser("~"), ".claude", "plugin-data", "wilson-gpu")
    os.makedirs(d, exist_ok=True)
    return d


STATE = os.path.join(data_dir(), "gpu.json")


def load():
    try:
        with open(STATE, encoding="utf-8") as f:
            d = json.load(f)
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def save(d):
    try:
        with open(STATE, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=2)
            f.write("\n")
    except Exception:
        pass


def run(cmd, timeout=20):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True,
                            timeout=timeout)
        return p.returncode, p.stdout, p.stderr
    except Exception as e:
        return 1, "", str(e)


# --- operating strategy ------------------------------------------------
# watch (default) — visibility only.
# budget          — escalate the SessionStart warning vs a $ ceiling.
# idle-reaper     — flag (and, if `reaping` ON, auto-down) instances past
#                   `max_hours`.
# ephemeral       — flag (and, if `reaping` ON, auto-down) instances this
#                   plugin itself provisioned (`up`) that are still up.
# Any AUTO-down is gated by a SEPARATE off-by-default switch `reaping`
# (same philosophy as `provisioning`) — strategies only get LOUDER on
# their own; they never destroy a billing resource without `reaping` ON.
#
# fanout — a decision AID, not auto-execution: a shardable job can be
# split across N pool hosts to cut wall-clock. Equal $ only holds under
# perfect scaling + no spin-up/min-billing; realistically it costs more,
# so `fanout-tolerance` ($ or %) bounds the acceptable overrun. on/off,
# OFF by default; the user supplies the shard template (the plugin cannot
# know a command is shardable).
STRATS = ("watch", "budget", "idle-reaper", "ephemeral")
SPINUP_H = 0.10   # assumed per-instance boot/teardown billed overhead


def parse_tol(s, serial):
    """'0' -> 0 ; '$5' -> 5.0 ; '20%' -> serial*0.20."""
    s = (s or "0").strip()
    try:
        if s.endswith("%"):
            return max(0.0, serial * float(s[:-1]) / 100.0)
        return max(0.0, float(s.lstrip("$") or 0))
    except Exception:
        return 0.0


def extract_iid(text):
    """Best-effort: a long id-looking token from provider `create`
    output. Only ever matched against ids we actually list, so a wrong
    guess simply never matches → never reaps the wrong thing."""
    import re
    m = re.search(r"\b([0-9]{5,}|[a-z0-9]{8,})\b", text or "")
    return m.group(1) if m else None


# --- provider adapters -------------------------------------------------
# Each: name, cli, available(), list() -> [inst dict], create(argv),
# destroy(id). Output parsing is best-effort and degrades gracefully —
# the provider CLI semantics are the user's, this layer only guards,
# surfaces cost and bookkeeps.

def _hours(since):
    try:
        return max(0.0, (time.time() - float(since)) / 3600.0)
    except Exception:
        return None


class Vast:
    name, cli = "vast", "vastai"

    def available(self):
        return shutil.which(self.cli) is not None

    def list(self):
        rc, out, _ = run([self.cli, "show", "instances", "--raw"])
        if rc != 0 or not out.strip():
            return []
        try:
            rows = json.loads(out)
        except Exception:
            return [{"id": "?", "raw": out.strip()[:200]}]
        res = []
        for r in rows if isinstance(rows, list) else []:
            h = _hours(r.get("start_date"))
            dph = r.get("dph_total")
            res.append({
                "id": str(r.get("id", "?")),
                "gpu": r.get("gpu_name") or "?",
                "status": r.get("actual_status") or r.get("cur_state") or "?",
                "hours": h,
                "rate": dph,
                "cost": (round(h * dph, 2) if h is not None
                         and isinstance(dph, (int, float)) else None),
            })
        return res

    def create(self, argv):
        return run([self.cli, "create", "instance", *argv], timeout=120)

    def destroy(self, iid):
        return run([self.cli, "destroy", "instance", str(iid)], timeout=60)


class RunPod:
    name, cli = "runpod", "runpodctl"

    def available(self):
        return shutil.which(self.cli) is not None

    def list(self):
        rc, out, _ = run([self.cli, "get", "pod"])
        if rc != 0 or not out.strip():
            return []
        lines = [ln for ln in out.splitlines() if ln.strip()]
        res = []
        for ln in lines[1:]:                # skip header row
            tok = ln.split()
            if tok:
                res.append({"id": tok[0], "gpu": "?", "status": "running",
                            "hours": None, "rate": None, "cost": None,
                            "raw": ln.strip()[:120]})
        return res

    def create(self, argv):
        return run([self.cli, "create", "pod", *argv], timeout=120)

    def destroy(self, pid):
        return run([self.cli, "remove", "pod", str(pid)], timeout=60)


PROVIDERS = {p.name: p for p in (RunPod(), Vast())}


def avail_providers():
    return [p for p in PROVIDERS.values() if p.available()]


def all_instances():
    out = []
    for p in avail_providers():
        try:
            for i in p.list():
                i["provider"] = p.name
                out.append(i)
        except Exception:
            pass
    return out


# --- wilson-pool roster bridge ----------------------------------------
def pool_json_path():
    base = os.path.join(os.path.expanduser("~"), ".claude", "plugins",
                        "data", "wilson-pool-sidecar", "pool.json")
    legacy = os.path.join(os.path.expanduser("~"), ".claude",
                          "plugin-data", "wilson-pool", "pool.json")
    if os.path.isfile(base):
        return base
    if os.path.isfile(legacy):
        return legacy
    os.makedirs(os.path.dirname(base), exist_ok=True)
    return base


def pool_load():
    try:
        with open(pool_json_path(), encoding="utf-8") as f:
            d = json.load(f)
        return d if isinstance(d, dict) else {}
    except Exception:
        return {}


def pool_save(d):
    p = pool_json_path()
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


# --- SessionStart guardrail (strategy-aware) --------------------------
def owned_iids(st):
    out = set()
    for e in (st.get("journal") or []):
        if e.get("rc") == 0 and e.get("iid"):
            out.add(str(e["iid"]))
    return out


def hook():
    st = load()
    strat = st.get("strategy") or "watch"
    reaping = bool(st.get("reaping"))
    insts = all_instances()
    running = [i for i in insts
               if str(i.get("status", "")).lower() not in
               ("exited", "stopped", "terminated")]
    if not running:
        sys.exit(0)

    total, known = 0.0, False
    for i in running:
        if i.get("cost") is not None:
            total += i["cost"]
            known = True

    # which instances does the active strategy flag for action?
    flagged, why = [], ""
    if strat == "idle-reaper":
        mh = st.get("max_hours")
        if isinstance(mh, (int, float)):
            flagged = [i for i in running
                       if isinstance(i.get("hours"), (int, float))
                       and i["hours"] >= mh]
            why = "up ≥ %sh limit" % mh
    elif strat == "ephemeral":
        oi = owned_iids(st)
        flagged = [i for i in running if str(i.get("id")) in oi]
        why = "wilson-gpu-provisioned (session-scoped)"

    reaped = []
    if reaping and flagged:
        for i in flagged:
            pr = PROVIDERS.get(i["provider"])
            if pr and i.get("id"):
                rc, _, _ = pr.destroy(i["id"])
                if rc == 0:
                    reaped.append("%s %s" % (i["provider"], i["id"]))

    head = "## GPU — rented instance(s) RUNNING"
    over = (strat == "budget" and known
            and isinstance(st.get("budget"), (int, float))
            and total >= st["budget"])
    if over:
        head = "## ⚠ GPU OVER BUDGET — stop now"
    lines = [head, "",
             "%d instance(s) billing now (strategy: **%s**%s):"
             % (len(running), strat,
                ", reaping ON" if reaping else ""), ""]
    for i in running:
        bits = ["%s `%s`" % (i["provider"], i.get("id", "?"))]
        if i.get("gpu") and i["gpu"] != "?":
            bits.append(i["gpu"])
        if i.get("hours") is not None:
            bits.append("up %.1fh" % i["hours"])
        if i.get("cost") is not None:
            bits.append("~$%.2f" % i["cost"])
        if i.get("rate"):
            bits.append("(~$%s/hr)" % i["rate"])
        if i in flagged:
            bits.append("**← %s%s**"
                        % (why, ", REAPED" if ("%s %s" % (i["provider"],
                           i.get("id")) in reaped) else ""))
        lines.append("- " + " · ".join(bits))
    if known:
        lines.append("")
        b = st.get("budget")
        if strat == "budget" and isinstance(b, (int, float)):
            pct = (total / b * 100.0) if b else 0
            lines.append("**~$%.2f so far / $%.2f budget (%.0f%%)%s**"
                         % (total, b, pct,
                            " — OVER" if total >= b else
                            (" — near" if pct >= 80 else "")))
        else:
            lines.append("**estimated total so far: ~$%.2f**" % total)
    if flagged and not reaping:
        lines += ["",
                  "%d instance(s) flagged (%s) — `reaping` is OFF so "
                  "nothing was auto-stopped. Enable auto-stop: "
                  "`/wilson-gpu reaping on`." % (len(flagged), why)]
    if reaped:
        lines += ["", "auto-reaped: %s" % ", ".join(reaped)]
    if st.get("fanout"):
        lines += ["",
                  "fanout ON (tolerance %s) — for a *shardable* heavy job, "
                  "`/wilson-gpu fanout-plan <serial_hours> <rate> [N]` to "
                  "check if splitting across the pool stays within "
                  "tolerance." % (st.get("fanout_tolerance") or "0")]
    lines += ["",
              "Stop one: `/wilson-gpu down <provider> <id>`  ·  all: "
              "`/wilson-gpu down all --yes`",
              "(wilson-gpu — strategy `%s` · `SIDECAR_NO_GPU=1` to "
              "silence)" % strat]
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": "\n".join(lines) + "\n"}}))
    sys.exit(0)


# --- /wilson-gpu command ----------------------------------------------
def p(*a):
    print("wilson-gpu:", *a)


def cmd(args):
    sub = (args[0] if args else "status").strip().lower()
    st = load()

    if sub in ("", "status", "ls"):
        prov = ", ".join(n for n in PROVIDERS
                         if PROVIDERS[n].available()) or "(none on PATH)"
        print("wilson-gpu — providers detected: %s" % prov)
        print("  provisioning: %s" % ("ON" if st.get("provisioning")
                                       else "OFF (up disabled — "
                                       "/wilson-gpu provisioning on)"))
        print("  strategy:     %s" % (st.get("strategy") or "watch"))
        if isinstance(st.get("budget"), (int, float)):
            print("  budget:       $%.2f" % st["budget"])
        if isinstance(st.get("max_hours"), (int, float)):
            print("  max-hours:    %s" % st["max_hours"])
        print("  reaping:      %s" % ("ON (strategies may auto-down)"
                                      if st.get("reaping") else
                                      "OFF (flag only)"))
        print("  fanout:       %s%s" % (
            "ON" if st.get("fanout") else "OFF",
            (" · tolerance %s" % st["fanout_tolerance"])
            if st.get("fanout") and st.get("fanout_tolerance") else ""))
        insts = all_instances()
        if not insts:
            print("  no running instances (or no provider CLI configured).")
        for i in insts:
            line = "  %-7s %-14s %-10s" % (i["provider"], i.get("id", "?"),
                                           i.get("gpu", "?"))
            if i.get("hours") is not None:
                line += " up %.1fh" % i["hours"]
            if i.get("cost") is not None:
                line += " ~$%.2f" % i["cost"]
            if i.get("raw"):
                line += "  | " + i["raw"]
            print(line)
        pool = pool_load()
        hosts = [h.get("host") for h in (pool.get("hosts") or [])
                 if isinstance(h, dict)]
        if hosts:
            print("  wilson-pool roster: %s" % ", ".join(hosts))
        print("  state: %s" % STATE)
        return

    if sub == "provisioning":
        val = (args[1].strip().lower() if len(args) > 1 else "")
        if val not in ("on", "off"):
            p("usage: /wilson-gpu provisioning on|off  (currently %s)"
              % ("ON" if st.get("provisioning") else "OFF"))
            return
        st["provisioning"] = (val == "on")
        save(st)
        p("provisioning %s.%s" % (
            val.upper(),
            "" if val == "off" else
            "  `up` still also needs --yes (double gate)."))
        return

    if sub == "up":
        if len(args) < 2 or args[1] not in PROVIDERS:
            p("usage: /wilson-gpu up <%s> --yes -- <provider cli args>"
              % "|".join(PROVIDERS))
            return
        prov = PROVIDERS[args[1]]
        rest = args[2:]
        yes = "--yes" in rest
        rest = [a for a in rest if a != "--yes"]
        if rest and rest[0] == "--":
            rest = rest[1:]
        if not st.get("provisioning"):
            p("provisioning is OFF — this is the money switch. Enable it "
              "with `/wilson-gpu provisioning on`, then re-run with --yes.")
            return
        if not yes:
            p("DRY RUN — would run: %s create %s %s" % (
                prov.cli, "instance" if prov.name == "vast" else "pod",
                " ".join(rest)))
            p("re-run with --yes to actually provision (this spends money).")
            return
        if not prov.available():
            p("`%s` not on PATH — cannot provision." % prov.cli)
            return
        rc, out, err = prov.create(rest)
        j = st.setdefault("journal", [])
        j.append({"ts": int(time.time()), "provider": prov.name,
                  "argv": rest, "rc": rc,
                  "iid": extract_iid(out) if rc == 0 else None,
                  "owned": rc == 0,
                  "out": (out or err).strip()[:400]})
        save(st)
        p("%s create rc=%d" % (prov.cli, rc))
        print((out or err).strip()[:1200])
        if rc == 0:
            p("recorded. `/wilson-gpu status` to see it; `attach` it into "
              "wilson-pool to auto-route heavy Bash there.")
        return

    if sub == "down":
        if len(args) >= 2 and args[1] == "all":
            if "--yes" not in args:
                p("`down all` destroys EVERY tracked instance — re-run "
                  "`/wilson-gpu down all --yes`.")
                return
            n = 0
            for i in all_instances():
                pr = PROVIDERS.get(i["provider"])
                if pr:
                    pr.destroy(i.get("id"))
                    n += 1
            p("requested destroy on %d instance(s)." % n)
            return
        if len(args) < 3 or args[1] not in PROVIDERS:
            p("usage: /wilson-gpu down <%s> <id>   |   down all --yes"
              % "|".join(PROVIDERS))
            return
        prov = PROVIDERS[args[1]]
        if not prov.available():
            p("`%s` not on PATH." % prov.cli)
            return
        rc, out, err = prov.destroy(args[2])
        p("%s destroy %s — rc=%d" % (prov.cli, args[2], rc))
        if (out or err).strip():
            print((out or err).strip()[:400])
        return

    if sub == "attach":
        if len(args) < 2:
            p("usage: /wilson-gpu attach <ssh-target> [linux|macos]")
            return
        target = args[1].strip()
        plat = (args[2].strip().lower() if len(args) > 2 else "linux")
        pool = pool_load()
        hs = [h for h in (pool.get("hosts") or [])
              if isinstance(h, dict) and h.get("host") != target]
        hs.append({"host": target, "platform": plat})
        pool["hosts"] = hs
        pool_save(pool)
        p("attached `%s` (%s) to the wilson-pool roster (%d host(s)). "
          "Heavy Bash now routes there once wilson-pool workdir is set."
          % (target, plat, len(hs)))
        return

    if sub == "detach":
        if len(args) < 2:
            p("usage: /wilson-gpu detach <ssh-target>")
            return
        target = args[1].strip()
        pool = pool_load()
        hs = [h for h in (pool.get("hosts") or [])
              if isinstance(h, dict) and h.get("host") != target]
        pool["hosts"] = hs
        pool_save(pool)
        p("detached `%s` from the wilson-pool roster (%d host(s) left)."
          % (target, len(hs)))
        return

    if sub == "strategy":
        val = (args[1].strip().lower() if len(args) > 1 else "")
        if val not in STRATS:
            p("strategy is `%s`. set: /wilson-gpu strategy <%s>"
              % (st.get("strategy") or "watch", "|".join(STRATS)))
            return
        st["strategy"] = val
        save(st)
        p("strategy = %s.%s" % (val, {
            "watch": " visibility only.",
            "budget": " set a ceiling: /wilson-gpu budget <$N>.",
            "idle-reaper": " set the limit: /wilson-gpu max-hours <N>; "
            "auto-down needs `reaping on`.",
            "ephemeral": " flags wilson-gpu-provisioned instances; "
            "auto-down needs `reaping on`."}.get(val, "")))
        return

    if sub in ("budget", "max-hours", "fanout-tolerance"):
        if len(args) < 2:
            cur = {"budget": st.get("budget"),
                   "max-hours": st.get("max_hours"),
                   "fanout-tolerance": st.get("fanout_tolerance")}[sub]
            p("%s is %s. set: /wilson-gpu %s <value>" % (sub, cur, sub))
            return
        raw = args[1].strip()
        if sub == "fanout-tolerance":
            st["fanout_tolerance"] = raw
            save(st)
            p("fanout-tolerance = %s (overrun vs serial allowed before "
              "fan-out is rejected; `$N` or `N%%` or `0`)." % raw)
            return
        try:
            v = float(raw.lstrip("$"))
        except ValueError:
            p("%s needs a number." % sub)
            return
        st["budget" if sub == "budget" else "max_hours"] = v
        save(st)
        p("%s = %s." % (sub, v))
        return

    if sub in ("reaping", "fanout"):
        val = (args[1].strip().lower() if len(args) > 1 else "")
        if val not in ("on", "off"):
            p("%s is %s. set: /wilson-gpu %s on|off" % (
                sub, "ON" if st.get(sub) else "OFF", sub))
            return
        st[sub] = (val == "on")
        save(st)
        extra = ""
        if sub == "reaping" and val == "on":
            extra = ("  strategies idle-reaper / ephemeral may now "
                     "auto-down flagged instances.")
        if sub == "fanout" and val == "on":
            extra = ("  decision aid only — set a shard template + "
                     "tolerance; nothing is auto-executed.")
        p("%s %s.%s" % (sub, val.upper(), extra))
        return

    if sub == "fanout-plan":
        if not st.get("fanout"):
            p("fanout is OFF — `/wilson-gpu fanout on` first.")
            return
        try:
            serial_h = float(args[1])
            rate = float(args[2].lstrip("$"))
            n = int(args[3]) if len(args) > 3 else 4
        except (IndexError, ValueError):
            p("usage: /wilson-gpu fanout-plan <serial_hours> "
              "<rate_per_hr> [N=4]")
            return
        serial_cost = serial_h * rate
        # N-way: wall = serial/N + spin-up; each of N pays its own wall
        par_wall = serial_h / max(1, n) + SPINUP_H
        par_cost = par_wall * rate * n
        overrun = par_cost - serial_cost
        tol = parse_tol(st.get("fanout_tolerance"), serial_cost)
        ok = overrun <= tol
        p("fanout-plan — serial: %.2fh, ~$%.2f  |  %d-way: %.2fh wall, "
          "~$%.2f  (overrun ~$%.2f, tolerance $%.2f)"
          % (serial_h, serial_cost, n, par_wall, par_cost, overrun, tol))
        p("verdict: %s" % (
            "FAN OUT — %.2fh wall saved within tolerance." %
            (serial_h - par_wall) if ok else
            "STAY SERIAL — parallel exceeds tolerance by $%.2f."
            % (overrun - tol)))
        p("(estimate assumes ~%.2fh billed spin-up per instance and "
          "linear scaling; real numbers vary. Sharding mechanism is "
          "yours — wilson-gpu only does the cost math.)" % SPINUP_H)
        return

    p("unknown subcommand %r. Use: status | provisioning on|off | "
      "strategy <%s> | budget <$N> | max-hours <N> | reaping on|off | "
      "fanout on|off | fanout-tolerance <$N|N%%> | fanout-plan "
      "<h> <rate> [N] | up <provider> --yes -- <args> | down <provider> "
      "<id> | down all --yes | attach <ssh-target> [plat] | detach "
      "<ssh-target>" % (sub, "|".join(STRATS)))


def main():
    if disabled() or os.environ.get("SIDECAR_NO_GPU") == "1":
        sys.exit(0)
    if len(sys.argv) > 1 and sys.argv[1] == "cmd":
        cmd(sys.argv[2:])
    else:
        try:
            json.load(sys.stdin)            # drain hook payload
        except Exception:
            pass
        hook()


if __name__ == "__main__":
    main()
