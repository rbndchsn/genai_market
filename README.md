# GenAI Market

A meta-analysis of the state of enterprise AI adoption and the generative AI services market, published as a static website. We read twelve analyst reports, surveys and industry publications from 2025 and 2026, reconcile what they say, and present our own findings with a reference for every stat, insight and vendor fact.

Status: data pipeline complete (Phase 4). Website build (Phase 5) in progress. See `plan.md` for the full plan, decisions and current status.

## Layout

- `site/` — the static site (HTML, CSS, vanilla JavaScript, no build step). Content lives in `site/data/*.json`.
- `scripts/` — extraction, validation and build scripts (Python 3.11+).
- `content/schemas.md` — record shapes for the JSON data files.
- `plan.md` — the living project plan. Every agent and contributor reads it first.
- `CLAUDE.md` — working rules for AI agents in this repository.

Source PDFs, raw extractions and working synthesis notes are kept outside the repository. One source is a licensed document; the site restates its findings in our own words and reproduces none of its text, charts or images.

## Run locally

```
cd site
python -m http.server 8000
```

Then open http://localhost:8000.

## Validate and rebuild data

```
python scripts/validate_data.py
python scripts/build_chunks.py
```

`chunks.json` is generated; edit the other data files and rebuild.

## Licence and attribution

Site text and data are original work by the authors. Findings cite their sources by source id and page or URL; the full bibliography and methodology are on the site's Sources page.
