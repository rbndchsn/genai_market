"""
check_site.py — renders every page with headless Chrome and checks links, anchors and console errors.

For each page it dumps the rendered DOM (scripts run, data loaded) and then:
  - reports console errors and uncaught exceptions (Chrome logging);
  - checks that every internal href points at a file that exists under site/;
  - checks that every internal hash (#ins-045, #s4-02, #blend360, #src-04, #term-id) is an id that
    the target page renders, by dumping that page once and collecting its ids;
  - flags any external link that is not https.

Usage (from the project root):
  python scripts/check_site.py            # all pages
  python scripts/check_site.py vendors.html insights.html
"""

from __future__ import annotations

import http.server
import re
import socket
import socketserver
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
PAGES = ["index.html", "insights.html", "vendors.html", "stats.html", "glossary.html", "sources.html", "search.html", "404.html"]
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
    sys.exit("No Chrome or Edge found.")


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve() -> tuple[socketserver.TCPServer, int]:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    srv = socketserver.TCPServer(("127.0.0.1", port), lambda *a, **k: Quiet(*a, directory=str(SITE), **k))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, port


def render(browser: str, url: str) -> tuple[str, list[str]]:
    """Return the rendered DOM and any console error lines."""
    r = subprocess.run(
        [browser, "--headless=new", "--disable-gpu", "--disk-cache-size=1", "--virtual-time-budget=8000",
         "--enable-logging=stderr", "--v=0", "--dump-dom", url],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120)
    errors = []
    for line in r.stderr.splitlines():
        if "CONSOLE" in line and ("Uncaught" in line or "error" in line.lower() or "failed" in line.lower()):
            errors.append(re.sub(r"^\[.*?\]\s*", "", line).strip())
    return r.stdout, errors


def main() -> None:
    pages = sys.argv[1:] or PAGES
    browser = find_browser()
    srv, port = serve()
    time.sleep(0.3)
    base = f"http://127.0.0.1:{port}/"
    ids_cache: dict[str, set[str]] = {}
    doms: dict[str, str] = {}
    problems: list[str] = []

    def ids_for(page: str) -> set[str]:
        if page not in ids_cache:
            dom = doms.get(page) or render(browser, base + page)[0]
            doms[page] = dom
            ids_cache[page] = set(re.findall(r'\sid="([^"]+)"', dom))
        return ids_cache[page]

    try:
        for page in pages:
            dom, errors = render(browser, base + page)
            doms[page] = dom
            for e in errors:
                problems.append(f"{page}: console: {e}")
            hrefs = re.findall(r'href="([^"]*)"', dom)
            checked = 0
            for href in set(hrefs):
                if not href or href.startswith(("mailto:", "javascript:")):
                    continue
                parts = urlsplit(href)
                if parts.scheme:
                    if parts.scheme != "https":
                        problems.append(f"{page}: non-https external link {href}")
                    continue
                target = unquote(parts.path) or page
                if target.startswith("/"):
                    problems.append(f"{page}: absolute path {href} (must be relative for GitHub Pages)")
                    continue
                if not (SITE / target).exists():
                    problems.append(f"{page}: missing file {href}")
                    continue
                if parts.fragment and target.endswith(".html"):
                    frag = unquote(parts.fragment)
                    if frag not in ids_for(target):
                        problems.append(f"{page}: anchor #{frag} not found on {target}")
                checked += 1
            print(f"{page}: {len(dom):,} chars, {checked} internal links checked, {len(errors)} console errors")
    finally:
        srv.shutdown()

    if problems:
        print(f"\n{len(problems)} problem(s):")
        for p in problems:
            print(" -", p)
        sys.exit(1)
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
