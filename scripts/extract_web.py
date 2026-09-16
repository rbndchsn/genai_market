"""
extract_web.py — converts saved web pages (content/raw/<src-id>/page.html) to Markdown-ish text
(content/raw/<src-id>/page.md) using trafilatura, with a header recording URL and accessed date.

Pages are fetched separately with curl and saved as page.html first (keeps the raw HTML for audit).

Run with the workspace Python that has trafilatura:
  C:\\Projects\\MyPythonProjects\\ENV\\Scripts\\python.exe scripts\\extract_web.py [src-id ...]
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import trafilatura

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "content" / "raw"

# id -> (url, title)
WEB_SOURCES = {
    "src-07": ("https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/", "Menlo Ventures: 2025 The State of Generative AI in the Enterprise"),
    "src-08": ("https://a16z.com/leaders-gainers-and-unexpected-winners-in-the-enterprise-ai-arms-race/", "a16z: Leaders, gainers and unexpected winners in the enterprise AI arms race"),
    "src-12": ("https://idc.com/resource-center/blog/futurescape-2026-moving-into-the-agentic-future", "IDC: FutureScape 2026, moving into the agentic future"),
}


def extract(src_id: str, url: str, title: str) -> None:
    folder = RAW / src_id
    html = (folder / "page.html").read_text(encoding="utf-8", errors="replace")
    text = trafilatura.extract(
        html, url=url, include_tables=True, include_links=False, include_images=False,
        include_comments=False, favor_recall=True, output_format="markdown",
    ) or ""
    accessed = date.today().isoformat()
    header = f"# {src_id}: {title}\n\nURL: {url}\nAccessed: {accessed}\nExtractor: trafilatura\n\n---\n\n"
    (folder / "page.md").write_text(header + text, encoding="utf-8")
    meta = {"src_id": src_id, "url": url, "title": title, "accessed": accessed, "html_bytes": len(html), "text_chars": len(text)}
    (folder / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"[{src_id}] {len(text)} chars -> {folder / 'page.md'}")


def main(argv: list[str]) -> None:
    for src_id in argv or list(WEB_SOURCES):
        if src_id not in WEB_SOURCES:
            sys.exit(f"unknown web source {src_id!r}")
        url, title = WEB_SOURCES[src_id]
        extract(src_id, url, title)


if __name__ == "__main__":
    main(sys.argv[1:])
