"""
validate_data.py — checks site/data/*.json for structural and referential integrity.

Rules (see content/schemas.md):
  - every JSON file parses
  - ids are unique within each file
  - every record with refs has at least one ref, and every ref.source exists in sources.json
  - PDF refs have a non-empty pages list of ints within the source's page count
  - insights: theme in themes map; related_stats / related_terms / related_vendors resolve
  - glossary: related term ids resolve
  - vendors: quadrant matches scores against meta.quadrant_threshold; service_categories resolve
  - stats: unit and chart in allowed sets; series values numeric

Exit code 1 on any error. Run:
  python scripts/validate_data.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data"

FILES = ["sources", "glossary", "insights", "vendors", "taxonomy", "stats"]
UNITS = {"%", "score", "count", "usd", "ratio", "text"}
CHARTS = {"bar", "grouped-bar", "donut", "table", "range", "none"}
KINDS = {"finding", "observation", "recommendation"}
EVIDENCE = {"single-source", "multi-source", "agent-analysis"}

errors: list[str] = []
warnings: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def load(name: str) -> dict:
    path = DATA / f"{name}.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        err(f"{name}.json: JSON parse error: {e}")
        return {}
    except FileNotFoundError:
        err(f"{name}.json: missing")
        return {}


def check_unique(name: str, records: list[dict]) -> None:
    seen: set[str] = set()
    for r in records:
        rid = r.get("id")
        if not rid:
            err(f"{name}: record without id: {str(r)[:60]}")
        elif rid in seen:
            err(f"{name}: duplicate id {rid}")
        seen.add(rid)


def check_refs(where: str, refs, sources: dict[str, dict]) -> None:
    if not isinstance(refs, list) or not refs:
        err(f"{where}: refs missing or empty")
        return
    for ref in refs:
        src = ref.get("source")
        if src not in sources:
            err(f"{where}: unknown source {src!r}")
            continue
        s = sources[src]
        if s.get("type") == "web":
            if not ref.get("url"):
                err(f"{where}: web ref needs url")
        else:
            pages = ref.get("pages")
            if not isinstance(pages, list) or not pages:
                err(f"{where}: pdf ref needs non-empty pages")
                continue
            for p in pages:
                if not isinstance(p, int) or p < 1 or (s.get("pages") and p > s["pages"]):
                    err(f"{where}: page {p} out of range for {src}")


def main() -> int:
    d = {name: load(name) for name in FILES}
    if errors:
        for e in errors:
            print("ERROR", e)
        return 1

    sources = {s["id"]: s for s in d["sources"].get("sources", [])}
    check_unique("sources", list(sources.values()))

    # glossary
    terms = d["glossary"].get("terms", [])
    check_unique("glossary", terms)
    term_ids = {t["id"] for t in terms}
    for t in terms:
        check_refs(f"glossary/{t['id']}", t.get("refs"), sources)
        for rel in t.get("related", []):
            if rel not in term_ids:
                err(f"glossary/{t['id']}: related term {rel!r} not found")
        if not t.get("definition"):
            err(f"glossary/{t['id']}: empty definition")

    # taxonomy
    tax = d["taxonomy"]
    cat_ids = {c["id"] for c in tax.get("service_categories", [])}
    for key in ["service_categories", "workloads", "industry_use_cases", "engagement_models", "scale_practices", "maturity_tiers"]:
        for i, rec in enumerate(tax.get(key, [])):
            label = rec.get("id") or rec.get("industry") or str(i)
            check_refs(f"taxonomy/{key}/{label}", rec.get("refs"), sources)

    # stats
    stats = d["stats"].get("stats", [])
    check_unique("stats", stats)
    stat_ids = {s["id"] for s in stats}
    for s in stats:
        w = f"stats/{s['id']}"
        check_refs(w, s.get("refs"), sources)
        if s.get("unit") not in UNITS:
            err(f"{w}: bad unit {s.get('unit')!r}")
        if s.get("chart") not in CHARTS:
            err(f"{w}: bad chart {s.get('chart')!r}")
        series = s.get("series")
        if series is not None:
            if not isinstance(series, list) or not series:
                err(f"{w}: series must be a non-empty list or null")
            else:
                for pt in series:
                    if not isinstance(pt.get("value"), (int, float)):
                        err(f"{w}: non-numeric series value {pt}")
        if series is None and s.get("value") is None and s.get("chart") != "table":
            err(f"{w}: needs value or series")

    # vendors
    vd = d["vendors"]
    vendors = vd.get("vendors", [])
    check_unique("vendors", vendors)
    vendor_ids = {v["id"] for v in vendors}
    thr = vd.get("meta", {}).get("quadrant_threshold", 0.5)
    quadrants = vd.get("meta", {}).get("quadrants", {})
    for v in vendors:
        w = f"vendors/{v['id']}"
        check_refs(w, v.get("refs"), sources)
        pe, ma = v.get("pe_score"), v.get("ma_score")
        if not isinstance(pe, (int, float)) or not isinstance(ma, (int, float)):
            err(f"{w}: scores must be numeric")
            continue
        expected = (
            "leaders" if pe >= thr and ma >= thr else
            "seasoned" if pe < thr and ma >= thr else
            "growth" if pe >= thr and ma < thr else
            "challengers"
        )
        if v.get("quadrant") != expected:
            err(f"{w}: quadrant {v.get('quadrant')!r} but scores imply {expected!r} (pe={pe}, ma={ma})")
        if v.get("quadrant") not in quadrants:
            err(f"{w}: quadrant id not in meta.quadrants")
        for c in v.get("service_categories", []):
            if c not in cat_ids:
                err(f"{w}: unknown service category {c!r}")
        for field in ["focus", "industries", "platforms", "partners"]:
            if not v.get(field):
                warnings.append(f"{w}: empty {field}")
    # rank sanity: ranks 1..N unique per axis
    for axis in ["pe_rank", "ma_rank"]:
        ranks = sorted(v.get(axis) for v in vendors)
        if ranks != list(range(1, len(vendors) + 1)):
            err(f"vendors: {axis} values are not 1..{len(vendors)} without gaps")

    # insights
    ins = d["insights"]
    themes = ins.get("themes", {})
    insights = ins.get("insights", [])
    check_unique("insights", insights)
    for i in insights:
        w = f"insights/{i['id']}"
        check_refs(w, i.get("refs"), sources)
        if i.get("theme") not in themes:
            err(f"{w}: unknown theme {i.get('theme')!r}")
        if i.get("kind") not in KINDS:
            err(f"{w}: bad kind {i.get('kind')!r}")
        if i.get("evidence") not in EVIDENCE:
            err(f"{w}: bad evidence {i.get('evidence')!r}")
        if i.get("evidence") == "multi-source" and len({r["source"] for r in i.get("refs", [])}) < 2:
            err(f"{w}: multi-source but cites one source")
        for sid in i.get("related_stats", []):
            if sid not in stat_ids:
                err(f"{w}: related stat {sid!r} not found")
        for tid in i.get("related_terms", []):
            if tid not in term_ids:
                err(f"{w}: related term {tid!r} not found")
        for vid in i.get("related_vendors", []):
            if vid not in vendor_ids:
                err(f"{w}: related vendor {vid!r} not found")
        for field in ["title", "summary", "detail"]:
            if not i.get(field):
                err(f"{w}: empty {field}")
        if len(i.get("title", "")) > 110:
            warnings.append(f"{w}: title over 110 chars")
    # stats themes must be insight themes
    for s in stats:
        if s.get("theme") not in themes:
            err(f"stats/{s['id']}: unknown theme {s.get('theme')!r}")

    for wmsg in warnings:
        print("WARN ", wmsg)
    for e in errors:
        print("ERROR", e)
    print(f"\nsources={len(sources)} terms={len(terms)} insights={len(insights)} vendors={len(vendors)} stats={len(stats)} "
          f"errors={len(errors)} warnings={len(warnings)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
