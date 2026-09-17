"""Apply adjudicated edits (edits.json) to site/data/*.json.

Every edit must apply exactly once; any failure is reported and nothing is written for that file
unless all of its edits succeed. Writes applied.json (id -> list of applied edits) for the quality file.
usage: python scripts/eval/apply_edits.py <project_root> <work_dir> [--dry-run]
The work dir holds edits.json and receives applied.json; keep it outside the repository or in scripts/eval/work/ (git-ignored).
"""
import io
import json
import os
import sys

ROOT = sys.argv[1]
HERE = sys.argv[2]
DRY = "--dry-run" in sys.argv
KEYS = {"insights": "insights", "stats": "stats", "glossary": "terms", "vendors": "vendors"}

edits = json.load(open(os.path.join(HERE, "edits.json"), encoding="utf-8"))
applied_path = os.path.join(HERE, "applied.json")
already = json.load(open(applied_path, encoding="utf-8")) if os.path.exists(applied_path) else []
done_keys = {json.dumps(e, sort_keys=True, ensure_ascii=False) for e in already}


def replace_in(value, old, new):
    """Replace old with new exactly once inside a string, or inside a list/dict serialised to JSON."""
    if isinstance(value, str):
        if value.count(old) != 1:
            raise ValueError(f"expected 1 match, found {value.count(old)}")
        return value.replace(old, new)
    text = json.dumps(value, ensure_ascii=False)
    if text.count(old) != 1:
        raise ValueError(f"expected 1 match in structured field, found {text.count(old)}")
    return json.loads(text.replace(old, new))


def apply(rec, e):
    op = e.get("op", "replace")
    if op == "replace":
        rec[e["field"]] = replace_in(rec[e["field"]], e["old"], e["new"])
    elif op == "set":
        rec[e["path"]] = e["value"]
    elif op == "set_ref_pages":
        hits = [r for r in rec["refs"] if r["source"] == e["source"]]
        if len(hits) != 1:
            raise ValueError(f"expected 1 ref for {e['source']}, found {len(hits)}")
        hits[0]["pages"] = e["pages"]
    elif op == "drop_ref":
        before = len(rec["refs"])
        rec["refs"] = [r for r in rec["refs"] if r["source"] != e["source"]]
        if len(rec["refs"]) != before - 1:
            raise ValueError("ref to drop not found exactly once")
    elif op == "swap_ref":
        idx = [i for i, r in enumerate(rec["refs"]) if r["source"] == e["from"]]
        if len(idx) != 1:
            raise ValueError("ref to swap not found exactly once")
        if any(r["source"] == e["to"]["source"] for r in rec["refs"]):
            rec["refs"].pop(idx[0])
        else:
            rec["refs"][idx[0]] = e["to"]
    elif op == "set_series_values":
        labels = {s["label"]: s for s in rec["series"]}
        for lab, val in e["values"].items():
            if lab not in labels:
                raise ValueError(f"series label not found: {lab}")
            labels[lab]["value"] = val
    elif op == "rename_series":
        hits = [s for s in rec["series"] if s["label"] == e["from"]]
        if len(hits) != 1:
            raise ValueError("series to rename not found")
        hits[0]["label"] = e["to"]
    elif op == "insert_platforms":
        names = [p["name"] for p in rec["platforms"]]
        if e["after"] not in names:
            raise ValueError("anchor platform not found")
        if any(i["name"] in names for i in e["items"]):
            raise ValueError("platform already present")
        at = names.index(e["after"]) + 1
        rec["platforms"][at:at] = e["items"]
    elif op == "set_metric_value":
        hits = [m for m in rec["claimed_metrics"] if m["metric"] == e["metric"]]
        if len(hits) != 1:
            raise ValueError("metric not found")
        hits[0]["value"] = e["value"]
    elif op == "replace_metric":
        idx = [i for i, m in enumerate(rec["claimed_metrics"]) if m["metric"] == e["metric"]]
        if len(idx) != 1:
            raise ValueError("metric not found")
        rec["claimed_metrics"][idx[0]] = e["new"]
    else:
        raise ValueError(f"unknown op {op}")


failures, newly = [], []
for fname, key in KEYS.items():
    path = os.path.join(ROOT, "site", "data", f"{fname}.json")
    raw = io.open(path, encoding="utf-8", newline="").read()
    data = json.loads(raw)
    by_id = {r["id"]: r for r in data[key]}
    todo = [e for e in edits if e["file"] == fname and json.dumps(e, sort_keys=True, ensure_ascii=False) not in done_keys]
    ok = True
    for e in todo:
        try:
            if e["id"] not in by_id:
                raise ValueError("record not found")
            apply(by_id[e["id"]], e)
            newly.append(e)
        except Exception as exc:  # report and keep going so all failures surface at once
            ok = False
            failures.append((fname, e["id"], e.get("field") or e.get("path") or e.get("op"), str(exc)))
    if ok and todo and not DRY:
        nl = "\r\n" if "\r\n" in raw else "\n"
        out = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
        io.open(path, "w", encoding="utf-8", newline="").write(out.replace("\n", nl))
    print(f"{fname}: {len(todo)} pending, {'written' if ok and todo and not DRY else 'not written'}")

for f in failures:
    print("FAIL", *f)
if not failures and not DRY:
    json.dump(already + newly, open(applied_path, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(f"{len(newly)} applied this run, {len(failures)} failures")
