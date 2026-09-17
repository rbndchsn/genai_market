"""Merge checker verdicts from a workflow journal and print what needs adjudication.

usage: python summarize.py <journal.jsonl> [--kind insight] [--only-issues] [--out merged.json]
Each record gets the most severe verdict across passes; issues from both passes are listed with their pass.
"""
import json
import sys

RANK = {"match": 0, "minor": 1, "unverifiable": 2, "mismatch": 3}


def load(path):
    by_id = {}
    labels = {}
    for line in open(path, encoding="utf-8"):
        e = json.loads(line)
        if e.get("type") == "started":
            labels[e["agentId"]] = e.get("label", "")
        if e.get("type") != "result" or not e.get("result"):
            continue
        label = e.get("label") or labels.get(e.get("agentId"), "")
        pass_ = "second" if label.startswith("second:") else "first"
        batch = label.split(":", 1)[-1]
        for r in e["result"].get("results", []):
            rec = by_id.setdefault(r["id"], {"id": r["id"], "batch": batch, "passes": {}, "verdict": "match", "issues": []})
            rec["passes"][pass_] = r["verdict"]
            if RANK[r["verdict"]] > RANK[rec["verdict"]]:
                rec["verdict"] = r["verdict"]
            for i in r["issues"]:
                rec["issues"].append(dict(i, pass_=pass_))
            rec.setdefault("found", {})[pass_] = r["found"]
            rec.setdefault("pages", set()).update(r["checked_pages"])
    for rec in by_id.values():
        rec["pages"] = sorted(rec["pages"])
    return by_id


def main():
    args = sys.argv[1:]
    path = args[0]
    kind = args[args.index("--kind") + 1] if "--kind" in args else None
    out = args[args.index("--out") + 1] if "--out" in args else None
    only = "--only-issues" in args
    recs = load(path)
    if out:
        json.dump(recs, open(out, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    tally = {}
    for rec in recs.values():
        if kind and not rec["batch"].startswith(kind):
            continue
        tally[rec["verdict"]] = tally.get(rec["verdict"], 0) + 1
        if only and not rec["issues"]:
            continue
        print(f"== {rec['id']} [{rec['batch']}] {rec['verdict'].upper()} passes={rec['passes']}")
        for i in rec["issues"]:
            print(f"   ({i['pass_']}/{i['severity']}) {i['field']}")
            print(f"      says:   {i['record_says']}")
            print(f"      source: {i['source_shows']}  [{i['where']}]")
            if i["fix"]:
                print(f"      fix:    {i['fix']}")
    print("TALLY", tally, "records:", sum(tally.values()))


if __name__ == "__main__":
    main()
