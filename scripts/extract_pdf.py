"""
extract_pdf.py — Phase 2 source ingestion for GenAI_Market.

For each PDF listed in SOURCES, writes to content/raw/<src-id>/:
  text.md         page-delimited Markdown ("<!-- page N -->" markers), headers/footers stripped
  tables.md       every table PyMuPDF detects, as Markdown, with page refs
  page_map.json   PDF bookmarks (TOC): level, title, page
  meta.json       page count, metadata, image count, stripped boilerplate lines
  pages/NNN.png   rendered page images (for reading charts and layouts)

Run with the workspace Python that has PyMuPDF:
  C:\\Projects\\MyPythonProjects\\ENV\\Scripts\\python.exe scripts\\extract_pdf.py [src-id ...]
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parent.parent
SOURCEDOC = ROOT / "sourcedoc"
RAW = ROOT / "content" / "raw"

# id -> (filename, page ranges or None). Ranges are inclusive 1-based (start, end) or a list of them; None = whole document.
SOURCES = {
    "src-01": ("Report_GenAI_Service_Providers_PeMa_Quadrant_2026 (1).pdf", None),
    "src-02": ("state-of-real-time-data-2026-idc.pdf", None),
    "src-03": ("mckinsey-state-of-ai-2026.pdf", None),
    "src-04": ("deloitte-state-of-ai-enterprise-2026.pdf", None),
    "src-05": ("bcg-ai-radar-2026.pdf", None),
    "src-06": ("mit-nanda-genai-divide-2025.pdf", None),
    "src-09": ("kpmg-ai-pulse-q2-2026.pdf", None),
    "src-10": ("microsoft-work-trend-index-2026.pdf", None),
    # Stanford: Top Takeaways (PDF p10-12), Chapter 4 Economy (p171-230), Chapter 9 Public Opinion (p360-384).
    # Printed page numbers are one less than PDF page numbers. Verified: p231 is the Science cover, p385 the Appendix.
    "src-11": ("stanford-ai-index-2026.pdf", [(10, 12), (171, 230), (360, 384)]),
}

RENDER_DPI = 110
BOILERPLATE_MIN_FRACTION = 0.4  # a line repeating on >= 40% of pages is header/footer
BOILERPLATE_MIN_CHARS = 20      # short repeated lines (tier labels, legend keys) are content, not boilerplate


def normalise(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def page_lines(page: fitz.Page) -> list[str]:
    """Text lines in reading order, using block extraction sorted top-to-bottom."""
    blocks = page.get_text("blocks", sort=True)
    lines: list[str] = []
    for b in blocks:
        if b[6] != 0:  # 0 = text block
            continue
        for raw in b[4].splitlines():
            t = normalise(raw)
            if t:
                lines.append(t)
        lines.append("")  # paragraph break between blocks
    return lines


def find_boilerplate(all_pages: list[list[str]]) -> set[str]:
    n = len(all_pages)
    counts: Counter[str] = Counter()
    for lines in all_pages:
        for t in set(l for l in lines if l):
            # ignore pure page numbers, handled separately
            if re.fullmatch(r"\d{1,3}", t) or len(t) < BOILERPLATE_MIN_CHARS:
                continue
            counts[t] += 1
    return {t for t, c in counts.items() if c >= max(3, n * BOILERPLATE_MIN_FRACTION)}


def is_page_number(t: str, page_no: int) -> bool:
    return re.fullmatch(r"\d{1,3}", t) is not None and abs(int(t) - page_no) <= 1


def table_to_markdown(tbl) -> str:
    rows = tbl.extract()
    rows = [[normalise(str(c)) if c is not None else "" for c in r] for r in rows]
    rows = [r for r in rows if any(r)]
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    out = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * width]
    out += ["| " + " | ".join(r) + " |" for r in rows[1:]]
    return "\n".join(out)


def extract(src_id: str, filename: str, page_range=None) -> dict:
    pdf_path = SOURCEDOC / filename
    out = RAW / src_id
    (out / "pages").mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    n = len(doc)
    if page_range is None:
        ranges = [(1, n)]
    elif isinstance(page_range, tuple):
        ranges = [page_range]
    else:
        ranges = list(page_range)
    selected = sorted({p for a, b in ranges for p in range(max(1, a), min(n, b) + 1)})
    first, last = selected[0], selected[-1]
    print(f"[{src_id}] {filename}: {n} pages" + (f", extracting {len(selected)} pages in {ranges}" if page_range else ""))

    # pass 1: raw lines for the selected pages (boilerplate detected across those pages only)
    raw_pages = {p: page_lines(doc[p - 1]) for p in selected}
    boiler = find_boilerplate(list(raw_pages.values()))

    # pass 2: write text.md, tables.md, page renders
    md: list[str] = [f"# {src_id}: {doc.metadata.get('title') or filename}", ""]
    tables_md: list[str] = [f"# {src_id}: detected tables", ""]
    table_count = 0
    image_count = 0

    for page_no in selected:
        page = doc[page_no - 1]
        lines = [
            l for l in raw_pages[page_no]
            if not (l and (l in boiler or is_page_number(l, page_no)))
        ]
        # collapse repeated blank lines
        cleaned: list[str] = []
        for l in lines:
            if l == "" and (not cleaned or cleaned[-1] == ""):
                continue
            cleaned.append(l)
        md.append(f"<!-- page {page_no} -->")
        md.extend(cleaned)
        md.append("")

        try:
            tabs = page.find_tables()
            for k, t in enumerate(tabs.tables):
                tm = table_to_markdown(t)
                if tm and tm.count("\n") >= 2:
                    table_count += 1
                    tables_md += [f"## Page {page_no}, table {k + 1}", "", tm, ""]
        except Exception as e:  # noqa: BLE001
            tables_md += [f"## Page {page_no}: table detection failed ({e})", ""]

        image_count += len(page.get_images(full=True))
        pix = page.get_pixmap(dpi=RENDER_DPI)
        pix.save(out / "pages" / f"{page_no:03d}.png")

    (out / "text.md").write_text("\n".join(md), encoding="utf-8")
    (out / "tables.md").write_text("\n".join(tables_md), encoding="utf-8")

    toc = [{"level": lvl, "title": normalise(t), "page": p} for lvl, t, p in doc.get_toc()]
    (out / "page_map.json").write_text(json.dumps(toc, indent=2, ensure_ascii=False), encoding="utf-8")

    meta = {
        "src_id": src_id,
        "file": filename,
        "pages": n,
        "extracted_range": [first, last],
        "extracted_pages": len(selected),
        "metadata": {k: v for k, v in doc.metadata.items() if v},
        "embedded_images": image_count,
        "tables_detected": table_count,
        "toc_entries": len(toc),
        "boilerplate_stripped": sorted(boiler),
        "render_dpi": RENDER_DPI,
        "text_chars": sum(len(l) for l in md),
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[{src_id}] tables={table_count} images={image_count} toc={len(toc)} "
          f"boilerplate={len(boiler)} chars={meta['text_chars']}")
    return meta


def main(argv: list[str]) -> None:
    ids = argv or list(SOURCES)
    for src_id in ids:
        if src_id not in SOURCES:
            sys.exit(f"unknown source id {src_id!r}; known: {', '.join(SOURCES)}")
        filename, page_range = SOURCES[src_id]
        if not (SOURCEDOC / filename).exists():
            print(f"[{src_id}] SKIP, file not found: {filename}")
            continue
        extract(src_id, filename, page_range)


if __name__ == "__main__":
    main(sys.argv[1:])
