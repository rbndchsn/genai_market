"""Show fixer revisions as word-level diffs against the live insights, and save them for applying.

usage: python review_fixes.py <journal.jsonl> <project_root> [--ids ins-001,ins-002] [--save revisions.json]
"""
import difflib
import json
import os
import re
import sys

journal, root = sys.argv[1], sys.argv[2]
only = set(sys.argv[sys.argv.index("--ids") + 1].split(",")) if "--ids" in sys.argv else None
save = sys.argv[sys.argv.index("--save") + 1] if "--save" in sys.argv else None

live = {x["id"]: x for x in json.load(open(os.path.join(root, "site", "data", "insights.json"), encoding="utf-8"))["insights"]}
revs = {}
for line in open(journal, encoding="utf-8"):
    e = json.loads(line)
    if e.get("type") == "result" and e.get("result"):
        for r in e["result"].get("records", []):
            revs[r["id"]] = r


def wdiff(a, b):
    sa, sb = re.findall(r"\S+|\s+", a), re.findall(r"\S+|\s+", b)
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, sa, sb, autojunk=False).get_opcodes():
        if op == "equal":
            seg = "".join(sa[i1:i2])
            out.append(seg if len(seg) < 90 else seg[:40] + " ... " + seg[-40:])
        else:
            if i2 > i1:
                out.append("[-" + "".join(sa[i1:i2]) + "-]")
            if j2 > j1:
                out.append("{+" + "".join(sb[j1:j2]) + "+}")
    return "".join(out)


def norm_refs(refs):
    return [{k: v for k, v in r.items() if k in ("source", "pages", "url") and v not in (None, [], "")} for r in refs]


stats = {"records": 0, "changed": 0, "applied": 0, "already": 0, "declined": 0}
for rid in sorted(revs):
    if only and rid not in only:
        continue
    r, cur = revs[rid], live[rid]
    stats["records"] += 1
    for a in r["account"]:
        stats[a["action"]] += 1
    changed = [f for f in ("title", "summary", "detail") if r[f] != cur[f]]
    ev = r["evidence"] != cur["evidence"]
    refs = norm_refs(r["refs"]) != norm_refs(cur["refs"])
    if changed or ev or refs:
        stats["changed"] += 1
    print(f"\n================ {rid}  fields changed: {changed or '-'}{'  EVIDENCE ' + cur['evidence'] + ' -> ' + r['evidence'] if ev else ''}")
    for f in changed:
        print(f"  <{f}> {wdiff(cur[f], r[f])}")
    if refs:
        print(f"  <refs> {json.dumps(norm_refs(cur['refs']))}\n      ->  {json.dumps(norm_refs(r['refs']))}")
    for a in r["account"]:
        if a["action"] == "declined":
            print(f"  declined #{a['n']}: {a['note']}")
print("\nSUMMARY", stats)
if save:
    json.dump(revs, open(save, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
