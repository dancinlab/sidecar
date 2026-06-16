#!/usr/bin/env python3
"""Serve ARCHITECTURE.html locally so the JSON-SSOT viewer can fetch its data.

The viewer (ARCHITECTURE.html) fetches ARCHITECTURE.json at runtime; browsers
block that over file://, so a tiny static server is needed. This script serves
the repo directory and opens the viewer in a browser.

Usage:
    python3 serve.py [port] [--no-open]
        port      TCP port (default 8000)
        --no-open don't auto-open a browser (for headless/CI checks)
"""
import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser


def lan_ip():
    """Best-effort LAN IP of this machine (so peers like ghost can reach it)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  # no packet sent; just picks the egress iface
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()

args = sys.argv[1:]
no_open = "--no-open" in args
ports = [a for a in args if a.isdigit()]
port = int(ports[0]) if ports else 8000

# Serve from this script's directory (where ARCHITECTURE.html/.json live).
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *a):  # quieter: one line per request
        sys.stderr.write("  · %s\n" % (fmt % a))


socketserver.TCPServer.allow_reuse_address = True
try:
    httpd = socketserver.TCPServer(("", port), Handler)
except OSError as e:
    sys.exit(f"✗ port {port} unavailable ({e}). try: python3 serve.py {port + 1}")

# Bound to 0.0.0.0 (the "" host above), so peers on the same LAN can reach it.
local_url = f"http://localhost:{port}/ARCHITECTURE.html"
ip = lan_ip()
print(f"▶ serving {os.getcwd()}   (Ctrl+C to stop)", flush=True)
print(f"▶ 이 기계:              {local_url}", flush=True)
if ip:
    print(f"▶ 다른 기계(ghost 등):  http://{ip}:{port}/ARCHITECTURE.html", flush=True)
if not no_open:
    threading.Timer(0.6, lambda: webbrowser.open(local_url)).start()
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\n■ stopped")
    httpd.server_close()
