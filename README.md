# GenAI Market

A meta-analysis of the state of enterprise AI adoption and the generative AI services market, published as a static website. We read twelve analyst reports, surveys and industry publications from 2025 and 2026, reconcile what they say, and present our own findings with a reference for every stat, insight and vendor fact.

Status: data pipeline complete (Phase 4). Website build (Phase 5) in progress: shell, overview and insights pages done; vendors, statistics, glossary and sources pages next, then deployment to GitHub Pages. The ask-the-report chat (Phase 6) is paused so the first release has no backend. See `plan.md` for the full plan, decisions and current status.

## Layout

- `site/` — the static site (HTML, CSS, vanilla JavaScript, no build step). Content lives in `site/data/*.json`; every number on a page is read from those files at runtime.
  - `css/site.css` — design tokens (light and dark), components, validated chart colour tokens.
  - `js/shell.js` — header, navigation, footer, theme toggle and shared helpers (`window.GM`).
  - `js/<page>.js` — one script per page.
- `scripts/` — extraction, validation, build and review scripts (Python 3.11+).
- `content/schemas.md` — record shapes for the JSON data files.
- `plan.md` — the living project plan. Every agent and contributor reads it first; its "Phase 5 build and review routine" section is the handoff for anyone continuing the site build.
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

## Review a page

```
python scripts/review_shots.py index.html
python scripts/review_shots.py "insights.html?theme=agentic#ins-045" --dark
```

Starts a local server and writes desktop (1280px) and phone (390px, via an iframe harness) screenshots with headless Chrome or Edge. Every page is reviewed this way before its step is marked done.

## Working with the plan

Work happens one step at a time against `plan.md`: find the first unticked step, do it, review it, tick it with a note, update the status block. Decisions and open questions live in the plan, not in chat. The repository is public; the source PDFs, their extractions and the working synthesis notes are excluded by `.gitignore` and must stay excluded.

## Licence and attribution

Site text and data are original work by the authors. Findings cite their sources by source id and page or URL; the full bibliography and methodology are on the site's Sources page.
