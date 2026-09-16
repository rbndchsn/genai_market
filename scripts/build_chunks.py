"""
build_chunks.py — generates site/data/chunks.json from the other data files.

Chunks are the retrieval units for site search and the ask-the-research chat.
Each chunk is plain text, 300 to 500 words at most, carrying its source ids and pages
and the site page it links to. Do not edit chunks.json by hand; re-run this script.

Run:
  python scripts/build_chunks.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data"
MAX_WORDS = 500


def load(name: str) -> dict:
    return json.loads((DATA / f"{name}.json").read_text(encoding="utf-8"))


def clip(text: str, max_words: int = MAX_WORDS) -> str:
    words = text.split()
    return text if len(words) <= max_words else " ".join(words[:max_words]) + " ..."


def refs_meta(refs: list[dict]) -> tuple[list[str], list[int]]:
    src = sorted({r["source"] for r in refs})
    pages = sorted({p for r in refs for p in r.get("pages", [])})
    return src, pages


def chunk(ctype: str, rid: str, title: str, text: str, refs: list[dict], page_url: str) -> dict:
    src, pages = refs_meta(refs)
    return {
        "id": f"{ctype}:{rid}",
        "type": ctype,
        "record_id": rid,
        "title": title,
        "text": clip(re.sub(r"\s+", " ", text).strip()),
        "source_ids": src,
        "pages": pages,
        "page_url": page_url,
    }


def main() -> None:
    sources = load("sources")["sources"]
    src_title = {s["id"]: f"{s['publisher']}, {s['date'][:4]}" for s in sources}
    glossary = load("glossary")["terms"]
    insights = load("insights")
    vendors = load("vendors")
    taxonomy = load("taxonomy")
    stats = load("stats")["stats"]
    stat_by_id = {s["id"]: s for s in stats}
    term_by_id = {t["id"]: t for t in glossary}

    def cite(refs: list[dict]) -> str:
        parts = []
        for r in refs:
            pg = r.get("pages")
            parts.append(f"{src_title[r['source']]}" + (f", pages {', '.join(map(str, pg))}" if pg else ""))
        return "Sources: " + "; ".join(parts) + "."

    chunks: list[dict] = []

    for s in sources:
        text = (f"{s['title']}. Published by {s['publisher']} ({s['date']}). Type: {s['type']}. "
                f"Method: {s['method']} Sample: {s.get('sample') or 'not applicable'}. "
                f"Sponsor: {s.get('sponsor') or 'none'}. How we use it: {s['how_we_use_it']} "
                f"Caveats: {s.get('bias_note') or 'none noted'}")
        chunks.append(chunk("source", s["id"], s["title"], text, [{"source": s["id"], "pages": [1]}], f"sources.html#{s['id']}"))

    themes = insights["themes"]
    for i in insights["insights"]:
        related = [stat_by_id[x]["label"] for x in i.get("related_stats", []) if x in stat_by_id]
        text = (f"{i['summary']} {i['detail']} Theme: {themes.get(i['theme'], i['theme'])}. "
                f"Evidence: {i['evidence']}. " + (f"Related statistics: {'; '.join(related)}. " if related else "") + cite(i["refs"]))
        chunks.append(chunk("insight", i["id"], i["title"], text, i["refs"], f"insights.html#{i['id']}"))

    qlabels = {k: v["label"] for k, v in vendors["meta"]["quadrants"].items()}
    for v in vendors["vendors"]:
        plats = "; ".join(f"{p['name']} ({p['what']})" for p in v["platforms"])
        metrics = "; ".join(f"{m['metric']}: {m['value']}" for m in v.get("claimed_metrics", []))
        text = (f"{v['name']}, founded {v['founded']}, headquartered in {v['hq']['city']}, {v['hq']['country']}. "
                f"AIM Research 2026 PeMa Quadrant: {qlabels[v['quadrant']]}. Penetration score {v['pe_score']} (rank {v['pe_rank']} of 28), "
                f"Maturity score {v['ma_score']} (rank {v['ma_rank']} of 28). Focus: {v['focus']} "
                f"Industries: {', '.join(v['industries'])}. Markets: {', '.join(v['markets'])}. "
                f"Named platforms and accelerators: {plats}. Differentiators: {'; '.join(v['differentiators'])}. "
                + (f"Vendor-claimed metrics (unaudited): {metrics}. " if metrics else "")
                + f"Partners: {', '.join(v['partners'])}. " + cite(v["refs"]))
        chunks.append(chunk("vendor", v["id"], v["name"], text, v["refs"], f"vendors.html#{v['id']}"))

    for s in stats:
        if s.get("series"):
            body = "; ".join(f"{pt['label']}: {pt['value']}{'%' if s['unit'] == '%' else ''}" for pt in s["series"])
            text = f"{s['label']}. {s.get('series_label') or 'Values'}: {body}. "
        else:
            text = f"{s['label']}: {s['value']}{'%' if s['unit'] == '%' else ''}. "
        text += (f"Sample: {s['n']}. " if s.get("n") else "") + (f"Note: {s['note']} " if s.get("note") else "") + cite(s["refs"])
        chunks.append(chunk("stat", s["id"], s["label"], text, s["refs"], f"stats.html#{s['id']}"))

    for t in glossary:
        rel = ", ".join(term_by_id[r]["term"] for r in t.get("related", []) if r in term_by_id)
        text = (f"{t['term']}" + (f" ({t['expansion']})" if t.get("expansion") else "") + f": {t['definition']} "
                + (f"Related terms: {rel}. " if rel else "") + cite(t["refs"]))
        chunks.append(chunk("glossary", t["id"], t["term"], text, t["refs"], f"glossary.html#{t['id']}"))

    for c in taxonomy["service_categories"]:
        text = f"Service category {c['name']}: {c['summary']} Capabilities: {'; '.join(c['capabilities'])}. " + cite(c["refs"])
        chunks.append(chunk("taxonomy", f"service-{c['id']}", c["name"], text, c["refs"], f"insights.html#taxonomy-{c['id']}"))
    for w in taxonomy["workloads"]:
        text = f"Workload {w['name']} ({w['family']}, {w['status']}): {w['description']} " + cite(w["refs"])
        chunks.append(chunk("taxonomy", f"workload-{w['id']}", w["name"], text, w["refs"], f"insights.html#workload-{w['id']}"))
    for u in taxonomy["industry_use_cases"]:
        slug = re.sub(r"[^a-z0-9]+", "-", u["industry"].lower()).strip("-")
        text = (f"GenAI use cases in {u['industry']}. Assistive and embedded: {'; '.join(u['assistive'])}. "
                f"Agentic and orchestrated: {'; '.join(u['agentic'])}. " + cite(u["refs"]))
        chunks.append(chunk("taxonomy", f"usecases-{slug}", f"Use cases: {u['industry']}", text, u["refs"], f"insights.html#usecases-{slug}"))
    for e in taxonomy["engagement_models"]:
        text = f"Engagement model {e['name']} ({e['form']}): {e['status']}. " + cite(e["refs"])
        chunks.append(chunk("taxonomy", f"engagement-{e['id']}", e["name"], text, e["refs"], "insights.html#engagement-models"))
    for p in taxonomy["scale_practices"]:
        text = f"Practice area {p['name']}: {'; '.join(p['practices'])}. " + cite(p["refs"])
        chunks.append(chunk("taxonomy", f"practice-{p['id']}", p["name"], text, p["refs"], "insights.html#scale-practices"))
    for m in taxonomy["maturity_tiers"]:
        text = (f"IDC real-time data maturity tier {m['name']}: {m['percentile']} of respondents, {m['share']} percent of the sample "
                f"(n = {m['n']}), average composite score {m['score']} out of 100. " + cite(m["refs"]))
        chunks.append(chunk("taxonomy", f"tier-{m['id']}", f"Maturity tier: {m['name']}", text, m["refs"], "stats.html#maturity-tiers"))

    out = {"generated_by": "scripts/build_chunks.py", "count": len(chunks), "chunks": chunks}
    (DATA / "chunks.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    longest = max(len(c["text"].split()) for c in chunks)
    print(f"wrote {len(chunks)} chunks; longest {longest} words")


if __name__ == "__main__":
    main()
