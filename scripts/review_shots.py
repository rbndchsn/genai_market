"""
review_shots.py — screenshot a site page at desktop and phone width with headless Chrome or Edge.

Used in Phase 5 to review every page before a step is marked done. Desktop Chrome cannot shrink
below about 500px, so the phone view is rendered inside a 390px-wide iframe harness.

Usage (from the project root):
  python scripts/review_shots.py index.html
  python scripts/review_shots.py "insights.html?theme=agentic#ins-045" --height 1600
  python scripts/review_shots.py stats.html --out C:/temp/shots --theme dark
  python scripts/review_shots.py "vendors.html#chetu" --iframe

Writes <out>/<page>-desktop.png and <out>/<page>-phone.png and prints their paths. Open them
with the Read tool (or any image viewer) and look for overflow, collisions and missing data.
Also prints the number of characters in the rendered DOM as a sanity check that scripts ran.

--theme light|dark stores the site's theme preference (localStorage "theme") through a
same-origin harness before the page loads, so both views render in that theme regardless of the
machine's colour scheme. --iframe renders the desktop view inside a 1200px iframe as well; use it
when the page opens a modal <dialog>, which headless Chrome paints blank in a top-level capture.
"""

from __future__ import annotations

import argparse
import http.server
import os
import re
import socket
import socketserver
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"

BROWSERS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


def find_browser() -> str:
    for b in BROWSERS:
        if Path(b).exists():
            return b
    sys.exit("No Chrome or Edge found; install one or add its path to BROWSERS.")


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):  # silence request logging
        pass


HARNESS_PREFIX = "/__harness__/"


def serve(directory: Path, port: int, harness_dir: Path | None = None) -> socketserver.TCPServer:
    """Serve the site; paths under /__harness__/ come from harness_dir so harness pages share the origin."""

    class Handler(Quiet):
        def translate_path(self, path):  # type: ignore[override]
            clean = path.split("?", 1)[0].split("#", 1)[0]
            if harness_dir and clean.startswith(HARNESS_PREFIX):
                return str(harness_dir / clean[len(HARNESS_PREFIX):])
            return super().translate_path(path)

    handler = lambda *a, **k: Handler(*a, directory=str(directory), **k)  # noqa: E731
    srv = socketserver.TCPServer(("127.0.0.1", port), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def write_harness(harness_dir: Path, name: str, page_url: str, width: int, height: int, theme: str | None) -> None:
    """A same-origin page that optionally stores the theme, then loads the target in an iframe."""
    store = f'localStorage.setItem("theme","{theme}")' if theme else 'localStorage.removeItem("theme")'
    frame = f'<iframe src="{page_url}" width="{width}" height="{height}"></iframe>'
    html = ("<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
            "<style>body{margin:0;background:#888}iframe{border:0;display:block}</style></head><body>"
            f"<script>try{{{store}}}catch(e){{}}</script>{frame}</body></html>")
    (harness_dir / name).write_text(html, encoding="utf-8")


def shoot(browser: str, url: str, out: Path, width: int, height: int, dark: bool) -> None:
    args = [browser, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--disk-cache-size=1",
            "--virtual-time-budget=6000", f"--window-size={width},{height}", f"--screenshot={out}", url]
    if dark:
        args.insert(1, "--force-dark-mode")
    subprocess.run(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=90)


def dom_size(browser: str, url: str) -> int:
    r = subprocess.run([browser, "--headless=new", "--disable-gpu", "--disk-cache-size=1", "--virtual-time-budget=6000", "--dump-dom", url],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=90)
    return len(r.stdout)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("page", help="page path with optional query and hash, e.g. insights.html?theme=agentic#ins-045")
    ap.add_argument("--out", default=None, help="output folder (default: a temp folder)")
    ap.add_argument("--height", type=int, default=1400, help="desktop capture height (default 1400)")
    ap.add_argument("--phone-height", type=int, default=1600, help="phone capture height (default 1600)")
    ap.add_argument("--theme", choices=["light", "dark"], default=None, help="store this site theme before loading (both views)")
    ap.add_argument("--dark", action="store_true", help="shorthand for --theme dark")
    ap.add_argument("--iframe", action="store_true", help="render the desktop view inside a 1200px iframe too (needed for open <dialog>s)")
    a = ap.parse_args()
    theme = a.theme or ("dark" if a.dark else None)

    browser = find_browser()
    out = Path(a.out) if a.out else Path(tempfile.mkdtemp(prefix="genai-shots-"))
    out.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", a.page.lower()).strip("-")[:60]
    if theme:
        slug += "-" + theme

    harness_dir = Path(tempfile.mkdtemp(prefix="genai-harness-"))
    port = free_port()
    srv = serve(SITE, port, harness_dir)
    page_url = f"http://127.0.0.1:{port}/{a.page}"
    time.sleep(0.3)

    try:
        desktop = out / f"{slug}-desktop.png"
        phone = out / f"{slug}-phone.png"
        if a.iframe or theme:
            write_harness(harness_dir, "desktop.html", page_url, 1200, a.height, theme)
            shoot(browser, f"http://127.0.0.1:{port}{HARNESS_PREFIX}desktop.html", desktop, 1220, a.height + 20, False)
        else:
            shoot(browser, page_url, desktop, 1280, a.height, False)
        write_harness(harness_dir, "phone.html", page_url, 390, a.phone_height, theme)
        shoot(browser, f"http://127.0.0.1:{port}{HARNESS_PREFIX}phone.html", phone, 600, a.phone_height + 40, False)
        size = dom_size(browser, page_url)
        print("desktop:", desktop)
        print("phone:  ", phone)
        print("rendered DOM chars:", size, "(a few hundred means the page scripts did not run)")
    finally:
        srv.shutdown()


if __name__ == "__main__":
    main()
