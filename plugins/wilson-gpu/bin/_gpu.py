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


# --- SessionStart guardrail -------------------------------------------
def hook():
    insts = all_instances()
    running = [i for i in insts
               if str(i.get("status", "")).lower() not in
               ("exited", "stopped", "terminated")]
    if not running:
        sys.exit(0)
    lines = ["## GPU — rented instance(s) RUNNING", "",
             "%d instance(s) are billing right now — stop what you don't "
             "need:" % len(running), ""]
    total = 0.0
    known = False
    for i in running:
        bits = ["%s `%s`" % (i["provider"], i.get("id", "?"))]
        if i.get("gpu") and i["gpu"] != "?":
            bits.append(i["gpu"])
        if i.get("hours") is not None:
            bits.append("up %.1fh" % i["hours"])
        if i.get("cost") is not None:
            bits.append("~$%.2f so far" % i["cost"])
            total += i["cost"]
            known = True
        if i.get("rate"):
            bits.append("(~$%s/hr)" % i["rate"])
        lines.append("- " + " · ".join(bits))
    if known:
        lines.append("")
        lines.append("**estimated total so far: ~$%.2f**" % total)
    lines += ["",
              "Stop one: `/wilson-gpu down <provider> <id>`  ·  stop all: "
              "`/wilson-gpu down all --yes`",
              "(wilson-gpu — `SIDECAR_NO_GPU=1` to silence)"]
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

    p("unknown subcommand %r. Use: status | provisioning on|off | "
      "up <provider> --yes -- <args> | down <provider> <id> | "
      "down all --yes | attach <ssh-target> [plat] | detach <ssh-target>"
      % sub)


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
