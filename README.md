# GenAI Market

A Meta-Analysis of the State of Enterprise AI, published as a static website. We read twelve analyst reports, surveys and industry publications from 2025 and 2026, reconcile what they say, and present our own findings with a reference for every stat, insight and vendor fact.

**Live site: https://rbndchsn.github.io/genai_market/**

Status: the site is live and in the QA phase. The originality review and a full accuracy evaluation (402 records checked against their cited pages, 166 corrected) are done and published on the site's "How it was built" page. Every push to `main` republishes `site/` through `.github/workflows/pages.yml`. The ask-the-report chat (Phase 6) is paused so the release has no backend. See `plan.md` for the full plan, decisions, current status and next steps.

## Layout

- `site/` — the static site (HTML, CSS, vanilla JavaScript, no build step). Content lives in `site/data/*.json`; every number on a page is read from those files at runtime.
  - `css/site.css` — design tokens (light and dark), components, validated chart colour tokens.
  - `js/shell.js` — header, navigation, footer, theme toggle and shared helpers (`window.GM`).
  - `js/<page>.js` — one script per page.
- `scripts/` — extraction, validation, build and review scripts (Python 3.11+).
  - `scripts/eval/` — the accuracy-evaluation toolkit: Claude Code workflows for checking, fixing and noting records, plus merge, apply and review helpers. See its README.
- `content/schemas.md` — record shapes for the JSON data files.
- `plan.md` — the living project plan. Every agent and contributor reads it first; its "Phase 5 build and review routine" section is the handoff for anyone continuing the site build.
- `CLAUDE.md` — working rules for AI agents in this repository.

Source PDFs, raw extractions and working synthesis notes are kept outside the repository. One source is a licensed document; the site restates its findings in our own words and reproduces none of its text, charts or images.

## Run locally

Requirements: Python 3.11+ for the scripts, and Chrome or Edge for the review and check scripts. The site itself needs nothing but a static file server; it will not work from `file://` because pages fetch their data.

```
cd site
python -m http.server 8000
```

Then open http://localhost:8000. The site uses relative paths only, so it runs the same at the server root and under `/genai_market/` on GitHub Pages.

Extraction needs PyMuPDF (PDFs) and trafilatura (web pages); the validation, build and check scripts use the standard library only.

## Validate and rebuild data

```
python scripts/validate_data.py
python scripts/build_chunks.py
python scripts/build_search_index.py
```

`chunks.json` and `search-index.json` are generated; edit the other data files and rebuild.

## Review a page

```
python scripts/review_shots.py index.html
python scripts/review_shots.py "insights.html?theme=agentic#ins-045" --theme dark
```

Starts a local server and writes desktop (1280px) and phone (390px, via an iframe harness) screenshots with headless Chrome or Edge. `--theme light|dark` forces the site theme; `--iframe` renders the desktop view in an iframe too (needed when a modal dialog is open). Every page is reviewed this way before its step is marked done.

```
python scripts/check_site.py
```

Renders every page headlessly and checks console errors, internal links, hash anchors and absolute paths.

## Add a new source

Sources move through the same pipeline as the first twelve. Steps 2 to 4 happen in folders that `.gitignore` keeps out of the repository.

1. **Get the document.** Save a PDF to `sourcedoc/`, or save a web page as `content/raw/src-NN/page.html`. Take the next free id (`src-13` after `src-12`); ids are never reused. If a report sits behind a sign-in form, download it yourself; do not script around the form.
2. **Register it.** Add a record to `site/data/sources.json` (fields in `content/schemas.md`: type, publisher, date, page count or URL and accessed date, sponsor, method, sample, licence note, bias note, how we use it). Add a short publisher name to `SHORT` in `site/js/shell.js`.
3. **Extract.** Add the file to `SOURCES` in `scripts/extract_pdf.py` (optionally with page ranges) or the URL to `WEB_SOURCES` in `scripts/extract_web.py`, then run the script with the source id. Output lands in `content/raw/src-NN/`: `text.md` with page markers, `tables.md`, `page_map.json` and a PNG render of every page. Tables and charts scramble in the text, so the renders are the reference for any number.
4. **Synthesise.** Read the whole extraction and write structured notes: document facts with a bias note, numbered findings with page references, cross-source observations, new glossary terms, and a table of every chartable number. Check every chart value against the page render (or the chart image for web sources, read in a temporary folder and not kept).
5. **Merge into the data.** Edit `site/data/{glossary,insights,stats,vendors,taxonomy}.json` per `content/schemas.md`. Stat ids follow the source number (`s13-01`). Add the new source to existing insights it supports, and raise an insight to `multi-source` only when the new source independently supports its central figure. Write everything in your own words and keep each figure's population, unit and year as the page gives them.
6. **Rebuild and check.** Run `validate_data.py`, `build_chunks.py`, `build_search_index.py`, `originality_check.py` and `check_site.py`, then check the affected records against their cited pages as described in `scripts/eval/README.md`.
7. **Update fixed wording.** The source count is typed as the word "twelve" in the `site/sources.html` meta description, the ins-094 summary in `insights.json` and the opening paragraph of this README; update those. The method page's "read twelve reports" describes the original build and stays. Counts shown on the home and Sources pages are computed from the data.
8. **Publish.** Confirm that nothing from `sourcedoc/`, `content/raw/`, `content/synth/` or `content/originality-check-*.md` is staged, then commit and push; the Pages workflow redeploys.

## Check quality

Three layers. The method page explains what each one does and how the accuracy evaluation is run; it
deliberately carries no figures. Per-run results are recorded in `content/quality.json`, which is kept in
the repository but is not part of the published site.

- Validation: `validate_data.py` and `check_site.py`, on every change.
- Originality: `python scripts/originality_check.py` writes a local report; any hit against the licensed source must be rewritten.
- Accuracy evaluation: records checked against their cited pages by a different model from the author, following `scripts/eval/README.md`.

## Working with the plan

Work happens one step at a time against `plan.md`: find the first unticked step, do it, review it, tick it with a note, update the status block. Decisions and open questions live in the plan, not in chat. The repository is public; the source PDFs, their extractions and the working synthesis notes are excluded by `.gitignore` and must stay excluded.

## Licence and attribution

You may reuse this project, commercially too: code under the [MIT licence](LICENSE), our text and data under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Material that restates the licensed AIM Research report (vendor profiles, the taxonomy, AIM-only statistics and insights, and the generated search files) is not licensed for reuse. [LICENSING.md](LICENSING.md) lists what is covered and gives the credit line.

Findings cite their sources by source id and page or URL; the full bibliography and methodology are on the site's Sources page.

The working method (plan file, agent instructions, pipeline, review routine) is described for readers at https://rbndchsn.github.io/genai_market/method.html.
