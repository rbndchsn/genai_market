"""
build_search_index.py — builds site/data/search-index.json from chunks.json and glossary.json.

The site is static, so search runs in the browser against a prebuilt inverted index:
  { "generated_by", "docs": [ { "id", "type", "title", "url", "snippet", "sources" } ],
    "index": { "<token>": [doc index, ...] } }

Tokens are lower-cased, stripped of a few common suffixes (s, es, ing, ed, ly) and filtered
against a short stop-word list. The client applies the same normalisation to the query and
matches on token prefixes, weighting hits in the title above hits in the body. Glossary
acronym expansions are indexed with their term so that "retrieval augmented" finds RAG.

Run after any data change (after build_chunks.py):
  python scripts/build_search_index.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data"
SNIPPET_CHARS = 220

STOP = set("""a an and are as at be been but by can do for from has have how in into is it its more most not of on or
our than that the their there these they this to was we were what when where which who will with without
also about across after among any because before between both each into over per such then those through
under up very via within""".split())

TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9+.'-]*", re.I)


def normalise(word: str) -> str:
    w = word.lower().strip("'.-+")
    if len(w) > 4:
        for suf in ("ing", "ed", "ly", "es", "s"):
            if w.endswith(suf) and len(w) - len(suf) >= 3:
                w = w[: -len(suf)]
                break
    elif len(w) > 3 and w.endswith("s"):
        w = w[:-1]
    return w


def tokens(text: str) -> list[str]:
    out = []
    for m in TOKEN_RE.finditer(text):
        t = normalise(m.group(0))
        if len(t) < 2 or t in STOP:
            continue
        out.append(t)
    return out


def snippet(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= SNIPPET_CHARS:
        return text
    cut = text[:SNIPPET_CHARS]
    cut = cut[: cut.rfind(" ")] if " " in cut else cut
    return cut + " ..."


def main() -> None:
    chunks = json.loads((DATA / "chunks.json").read_text(encoding="utf-8"))["chunks"]
    glossary = json.loads((DATA / "glossary.json").read_text(encoding="utf-8"))["terms"]
    expansions = {t["id"]: t.get("expansion") or "" for t in glossary}

    docs: list[dict] = []
    index: dict[str, set[int]] = {}
    for c in chunks:
        i = len(docs)
        extra = expansions.get(c["record_id"], "") if c["type"] == "glossary" else ""
        docs.append({
            "id": c["record_id"],
            "type": c["type"],
            "title": c["title"],
            "url": c["page_url"],
            "snippet": snippet(c["text"]),
            "sources": c.get("source_ids", []),
        })
        for t in set(tokens(c["title"] + " " + extra + " " + c["text"])):
            index.setdefault(t, set()).add(i)

    out = {
        "generated_by": "scripts/build_search_index.py",
        "docs": docs,
        "index": {t: sorted(ids) for t, ids in sorted(index.items())},
    }
    target = DATA / "search-index.json"
    target.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    postings = sum(len(v) for v in index.values())
    print(f"wrote {len(docs)} docs, {len(index)} tokens, {postings} postings, {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
