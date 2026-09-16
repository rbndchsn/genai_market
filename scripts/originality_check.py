"""originality_check.py: 8-word shingle overlap of site/data text against content/raw extractions (step 7.1). Writes content/originality-check-<date>.md. Run: python scripts/originality_check.py"""
import json, re, glob, os
from datetime import date
from collections import defaultdict
from pathlib import Path

ROOT = Path(r"C:\Projects\MyPythonProjects\MyScripts\GenAI_Market")
os.chdir(ROOT)


def norm(t):
    return re.sub(r"[^a-z0-9 ]+", " ", t.lower()).split()


def shingles(words, k=8):
    return {" ".join(words[i:i + k]) for i in range(len(words) - k + 1)}


raw = {}
for fp in glob.glob("content/raw/*/text.md") + glob.glob("content/raw/*/page.md"):
    sid = Path(fp).parts[2]
    raw[sid] = shingles(norm(open(fp, encoding="utf-8").read()))

hits = defaultdict(lambda: defaultdict(set))


def check(kind, rid, text):
    sh = shingles(norm(text))
    for sid, rs in raw.items():
        m = sh & rs
        if m:
            hits[sid][(kind, rid)] |= m


d = json.load(open("site/data/insights.json", encoding="utf-8"))
for i in d["insights"]:
    check("insight", i["id"], i["title"] + " " + i["summary"] + " " + i["detail"])
for t in json.load(open("site/data/glossary.json", encoding="utf-8"))["terms"]:
    check("term", t["id"], t["term"] + " " + t["definition"])
for s in json.load(open("site/data/stats.json", encoding="utf-8"))["stats"]:
    check("stat", s["id"], s["label"] + " " + (s.get("note") or ""))
for v in json.load(open("site/data/vendors.json", encoding="utf-8"))["vendors"]:
    check("vendor", v["id"], v["focus"] + " " + " ".join(v["differentiators"]) + " " + " ".join(p["what"] for p in v["platforms"]))

lines = [f"# Originality check, {date.today().isoformat()} (input for step 7.1)", "",
         "Method: 8-word shingles (lower-cased, punctuation stripped) of every insight (title, summary, detail), glossary term (term, definition), stat (label, note) and vendor (focus, differentiators, platform descriptions) in `site/data/`, matched against `content/raw/*/text.md` and `page.md`. A hit means an 8-word run appears verbatim in a source extraction. Chart labels and survey question wording cause some hits; SRC-01 hits must be rewritten regardless (licensed source, no verbatim text).", ""]
total = 0
for sid in sorted(hits):
    recs = hits[sid]
    n = sum(len(v) for v in recs.values())
    total += n
    lines.append(f"## {sid}: {len(recs)} records, {n} matching runs")
    lines.append("")
    for (kind, rid), ms in sorted(recs.items()):
        ex = sorted(ms)[0]
        lines.append(f'- {kind} `{rid}` ({len(ms)}): e.g. "{ex}"')
    lines.append("")
lines.append(f"Total matching runs: {total}. Records affected: {len({r for v in hits.values() for r in v})}.")
Path(f"content/originality-check-{date.today().isoformat()}.md").write_text("\n".join(lines), encoding="utf-8")
for sid in sorted(hits):
    print(sid, len(hits[sid]), "records", sum(len(v) for v in hits[sid].values()), "runs")
print("records affected", len({r for v in hits.values() for r in v}))
