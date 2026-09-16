# GenAI_Market — Project Plan

This file is the living source of truth for this project. Every agent reads it first
and updates it as work lands. See `CLAUDE.md` for the rules.

---

## Current Status

| Field | Value |
|---|---|
| Last updated | 2026-09-15 |
| Current phase | Phase 5 — Website build (Phase 4 complete). Phase 6 (chat) is paused. |
| Next step | 5.0 Repository setup: `git init`, `.gitignore` that excludes `sourcedoc/` and `content/raw/`, first commit, push to https://github.com/rbndchsn/genai_market. Then 5.1 site shell. Load `dataviz` before 5.5. |
| Blockers | None for 5.0 to 5.9. Q4 (site name) is worth settling before 5.1 because it appears in the shell. Q6 (whether `content/synth/` goes into the public repo) before 5.0's first push. Phase 6 paused (user decision); Q3 only matters if it resumes. |

Hosting: GitHub Pages from the repo above (Q2 resolved). No Cloudflare in the MVP. The site is static files in `site/` with no build step, so Pages can serve it either from a `docs/` folder or through the GitHub Actions static-site workflow pointed at `site/`; decide at 5.10. The licensed AIM PDF (`sourcedoc/`) and every extraction of it (`content/raw/`) must never be committed; the repo is public.

Source inventory: 12 sources, all synthesised (`content/synth/src-01.md` to `src-12.md`). PDFs in `sourcedoc/` (9), web pages in `content/raw/src-07,08,12/page.md`. Data files: 12 sources, 164 glossary terms, 95 insights (55 multi-source, 24 single-source, 16 agent-analysis), 28 vendors, 259 stats, 599 chunks.

Phase 5 reading guide: `site/data/insights.json` has 12 themes and 95 insights (ins-085 to ins-095 are the outlook set); `stats.json` records carry `chart` hints (bar, grouped-bar, donut, range, table, none) and a `series_label`; every record's `refs` resolve to `sources.json`. Series with more than about 12 points (for example s4-35, s3-25, s3-31, s11-22) need a grouped or small-multiple treatment. Menlo (src-07) and a16z (src-08) vendor-share stats must be shown side by side with their conflict-of-interest notes (see ins-045).

Web-source charts: `extract_web.py` saves only text. When a web source's charts carry numbers the prose does not, fetch the chart images into the session scratchpad, convert to PNG and read them there. Do not save them into the project (no source images are kept).

How to do step 4.2: follow `content/synth/README.md` exactly (read the full extraction, verify every chart against the page render, write the notes in the fixed structure, update this plan, report). Use `src-05.md` as the model for survey-type sources.

Data pipeline (Phase 3 output): edit `site/data/{sources,glossary,insights,vendors,taxonomy,stats}.json` by hand, then run `python scripts/validate_data.py` and `python scripts/build_chunks.py`. Never edit `chunks.json` directly. Schemas are in `content/schemas.md`.

Phase 3 reading guide: `content/raw/<src-id>/text.md` for prose, `content/raw/<src-id>/pages/NNN.png` for any table, chart, or the PeMa quadrant (src-01 quadrant section starts p25, vendor profiles start p30, one vendor per two pages; src-02 appendix tables p23-25).

---

## 1. Project Overview

**What we are building:** A public, interactive website that presents a **meta-analysis**
of the current and future state of AI adoption in companies, products, and services.
We read multiple sources (analyst PDFs, industry surveys, reputable web publications),
merge and reconcile what they say, and publish our own research findings with
references. The site makes those findings navigable, searchable, and visual: key
insights, vendor landscape, survey statistics, a glossary, full-text search, and a
natural-language "ask the research" chat.

**Framing:** This is original research output built on cited sources, in the same way
an academic literature review or a market meta-analysis cites its inputs. We do not
republish any source. We report what the body of evidence shows and reference where
each finding comes from.

**Who it is for:** Business and technology decision-makers, consultants, and analysts
who need to understand the GenAI services market and AI adoption trends without
reading 100+ pages of reports.

**Problem it solves:** Analyst reports are long, dense, and impossible to hold in your
head. The valuable content (rankings, stats, challenges, what leaders do differently)
is locked in PDF layouts that nobody reads end to end. The site unpacks that content
into structured, cross-referenced, interactive form.

**Working name:** GenAI Market (rename later if needed, see Q4).

---

## 2. Goals and Non-Goals

### Goals
- Read every source document in full and synthesize it into structured data (JSON) with page-level citations.
- Present the content as a fast, responsive, static website that works on phone and desktop.
- Provide: insights dashboard, vendor explorer with interactive quadrant, glossary, full-text search, sources page, and an ask-the-report chat.
- Supplement the PDFs with 5 to 10 reputable web sources on AI adoption trends, each cited with URL and date.
- Make the content pipeline repeatable so new PDFs and web sources can be added in later phases.
- Attribute every finding to one or more sources. Write everything in our own words, as a meta-analysis.
- Where sources agree, say so and cite all of them. Where they differ, present the difference.

### Non-Goals
- Not a general AI news site. Scope is enterprise AI adoption and the GenAI services market.
- No user accounts, comments, or CMS in v1.
- No verbatim text from the AIM / Blend360 report (SRC-01). Not even short quotes. Findings only, in our words, with a reference.
- No republication of any source document, chart, or image. Charts are rebuilt from data we report.
- No server-side rendering. The only backend is the chat Worker.

---

## 3. Source Material

| ID | File | Pages | Publisher / date | Description | Reuse notes |
|---|---|---|---|---|---|
| SRC-01 | `sourcedoc/Report_GenAI_Service_Providers_PeMa_Quadrant_2026 (1).pdf` | 90 | AIM Research, April 2026 | Top Generative AI Service Providers 2026, Penetration Maturity (PeMa) Quadrant. Market outlook, key challenges, service taxonomy, vendor profiles. 156 embedded images (charts, quadrant). | Licensed copy. **No verbatim text, no images, no reproduced charts.** Findings in our words with a reference to AIM Research 2026. |
| SRC-02 | `sourcedoc/state-of-real-time-data-2026-idc.pdf` | 28 | IDC Custom Solutions, September 2026, sponsored by Solace | 2026 State of Real-Time Data: Agentic Enterprises Are Running on Real-Time Data. Survey-based InfoBrief with four maturity tiers, industry and company-size breakdowns, what leaders do differently. Accessible data tables in the appendix (p23 to 25). | Free sponsored InfoBrief. Cite IDC and Solace. Appendix tables are the primary stats source. |
| SRC-03+ | Web sources | — | Added in Phase 4 | Stanford AI Index, McKinsey State of AI, Gartner, Deloitte, Menlo Ventures, etc. | Record in `data/sources.json` with URL, publisher, date, accessed date. |

Extraction tooling: the workspace Python at `C:\Projects\MyPythonProjects\ENV\Scripts\python.exe`
has PyMuPDF (`fitz`) and `docling` installed. Both PDFs have embedded TOC bookmarks,
which can be used for section splitting.

---

## 4. Architecture / Approach

**Tech stack:** Static HTML, CSS, and vanilla JavaScript. Content lives in JSON files
under `site/data/`. No build step required. Client-side search via a prebuilt index
(MiniSearch or Lunr from a CDN). Charts via a CDN library (Chart.js or D3).

**Chat backend (Phase 6):** One Cloudflare Worker (TypeScript, Wrangler), modeled on
the existing `verra-v5-qa` project. It receives a question, retrieves the most relevant
content chunks, calls the Claude API, and returns an answer with citations. API key
stored as a Worker secret. Rate limited.

**Hosting (proposed, confirm in Q2):** Cloudflare Pages for the static site, the Worker
on the same account. Alternative: Vercel or GitHub Pages plus a Worker for chat.

**Data flow:**
```
sourcedoc/*.pdf  -->  content/raw/<src-id>/   (Markdown + images + page_map.json)
                            |
                            v   (agent reads in full, synthesizes)
                      content/synth/<src-id>.md   (structured notes with page refs)
                            |
                            v
                      site/data/*.json   (insights, vendors, stats, glossary, sources, chunks)
                            |
                 +----------+-----------+
                 v                      v
           site/*.html (pages)    worker/ (chat, reads chunks.json)
```

**Planned directory layout:**
```
GenAI_Market/
  CLAUDE.md, plan.md
  sourcedoc/                # input PDFs (never edited)
  scripts/                  # extract_pdf.py, build_search_index.py, validate_data.py
  content/
    raw/<src-id>/           # extracted markdown, images, page_map.json
    synth/<src-id>.md       # agent-written structured synthesis with page citations
    schemas.md              # JSON record shapes for site/data
  site/
    index.html              # dashboard / landing
    insights.html           # key findings, challenges, trends
    vendors.html            # table + quadrant chart + profile drawer
    stats.html              # survey statistics and charts
    glossary.html
    sources.html            # bibliography and methodology
    chat.html               # ask-the-report (or a panel on every page)
    assets/  css/  js/
    data/                   # insights.json, vendors.json, stats.json, glossary.json,
                            # sources.json, taxonomy.json, chunks.json, search-index.json
  worker/                   # Cloudflare Worker for chat (wrangler.toml, src/index.ts)
```

**Content and citation rules (meta-analysis standard):**
- Every insight, stat, and vendor fact carries one or more references: `source_id` plus `page` (or `url`).
- All text on the site is written by us, in our own words. No verbatim passages from any source. For SRC-01 this is absolute: not even short quotes.
- Findings are stated as research outcomes ("Analyst and survey sources converge on...", "AIM Research (2026) places X in...") not as reproductions.
- Where two or more sources support a finding, cite all of them. Where sources disagree, present both positions.
- Vendor entries record factual positioning (quadrant, focus areas, notable strengths) in our words. No analyst prose is copied.
- No source images or charts are reused. All charts are rebuilt from `stats.json`.
- The Sources page carries a full bibliography and a methodology statement describing the meta-analysis approach.
- `content/schemas.md` defines each JSON record shape so agents produce consistent data.

---

## 5. Implementation Steps

Legend: `[ ]` not started · `[~]` in progress · `[x]` done (add date and a short note)

Format example:
`- [x] 0.1 Create CLAUDE.md — 2026-09-15, agent instructions for reading/updating this plan (CLAUDE.md)`

### Phase 0 — Project scaffolding
- [x] 0.1 Create `CLAUDE.md` — 2026-09-15, agent instructions for reading and maintaining this plan (`CLAUDE.md`)
- [x] 0.2 Create `plan.md` skeleton — 2026-09-15, this file with all sections and placeholders (`plan.md`)

### Phase 1 — Define scope
- [x] 1.1 Define project scope with user — 2026-09-15, objective, audience (public), stack (static + JSON), features (search, glossary, vendors, insights, chat), research scope (PDFs + web). Sections 1 to 4 filled in.

### Phase 2 — Source ingestion
- [x] 2.1 Write `scripts/extract_pdf.py` — 2026-09-15, PyMuPDF only (docling not needed). Outputs `text.md` (page-delimited, boilerplate stripped), `tables.md`, `page_map.json` (TOC), `meta.json`, and `pages/NNN.png` renders at 110 dpi instead of embedded images, because page renders are what an agent needs to read charts (`scripts/extract_pdf.py`)
- [x] 2.2 Run extraction on SRC-01 and SRC-02 — 2026-09-15, src-01: 90 pages, 436 TOC entries, 36 tables, 162k chars. src-02: 28 pages, 18 TOC entries, 16 tables, 21k chars. Output in `content/raw/src-01/` and `content/raw/src-02/`
- [x] 2.3 Extraction QA — 2026-09-15, checked pages 8, 14, 15, 23 (src-02) and 25, 31 (src-01). Fixed one bug: boilerplate filter was stripping the IDC tier labels (Leaders, Advanced, Developing, Emerging) because they recur on most pages; now lines under 20 chars are never treated as boilerplate. Known limitation: multi-column tables (IDC appendix p23-25, AIM tables) scramble in `text.md` and only partly detect in `tables.md`. The `pages/*.png` renders are clean and are the reference for tables and charts. Phase 3 must read those renders for any numeric table.

### Phase 3 — Content synthesis (read everything, write structured notes)
- [x] 3.1 Read SRC-01 in full and write `content/synth/src-01.md` — 2026-09-15, all 90 pages read (text plus renders of p28 quadrant and p29 score table). Notes contain: document facts and method, 15 market findings (F1 to F15), 6 challenges, 7-category service taxonomy, 5 workload types, industry use-case matrix, 6 scale-management practices, pricing benchmarks, 6 engagement models, delivery roles, full 28-vendor score and quadrant table, 28 vendor notes (V01 to V28), 10 cross-vendor patterns (P1 to P10), glossary term list, 20 numeric stats. Quadrant boundary inferred at 0.5/0.5. Source table header says "Rank 2024" but it is the 2026 edition. (`content/synth/src-01.md`)
- [x] 3.2 Read SRC-02 in full and write `content/synth/src-02.md` — 2026-09-15, all 28 pages read (text, appendix tables p23-25, renders of p4, p5, p6, p12 to verify chart values). Notes contain: document facts and sponsor-bias note, 4-tier maturity model with n and scores, 17 findings (F1 to F17) with every chart's numbers, IDC's 5 recommendations, 8 cross-source observations (O1 to O8) linking to SRC-01, glossary list, 31 numeric stats. Source inconsistencies noted: Developing n given as 195 and 155 on different pages; success mean based on n=815. (`content/synth/src-02.md`)
- [x] 3.3 Write `content/schemas.md` — 2026-09-15, record shapes and id conventions for all seven data files, ref format for PDF and web sources (`content/schemas.md`)
- [x] 3.4 Produce `site/data/sources.json` and `site/data/glossary.json` — 2026-09-15, 2 sources with method, licence and bias notes; 98 glossary terms with definitions in our words, tags, cross-links and refs
- [x] 3.5 Produce `site/data/insights.json` — 2026-09-15, 40 insights across 12 themes (findings, observations, recommendations), each with summary, detail, evidence level, refs, and links to stats, terms and vendors. 12 are multi-source, 7 are agent-analysis.
- [x] 3.6 Produce `site/data/vendors.json` and `site/data/taxonomy.json` — 2026-09-15, 28 vendors with scores, ranks, quadrant, focus, industries, markets, named platforms, differentiators, claimed metrics, partners, service categories; taxonomy holds 7 service categories, 5 workloads, 13 industry use-case rows, 6 engagement models, 6 scale practices, 4 maturity tiers
- [x] 3.7 Produce `site/data/stats.json` — 2026-09-15, 39 stats (13 from AIM, 26 from IDC) with series for charting, sample notes and caveats
- [x] 3.8 Produce `site/data/chunks.json` — 2026-09-15, generated by `scripts/build_chunks.py` from the other files rather than hand-written, so it stays in sync. 248 chunks, longest 247 words, each with source ids, pages and a site anchor.
- [x] 3.9 Write `scripts/validate_data.py` — 2026-09-15, checks parse, unique ids, refs resolve to sources and page ranges, cross-links resolve, quadrant matches scores, multi-source insights cite two sources, units and chart types. First run: 0 errors, 0 warnings.

### Phase 4 — Web research
Phase 4 working rule: one step at a time, with a user checkpoint after 4.1. Many market reports are gated behind a sign-in form. The agent does not attempt to bypass gates. It lists the candidates and marks each as **open** (agent can fetch the full document), **gated** (user signs in, downloads the PDF, and saves it to `sourcedoc/`), or **summary-only** (only a public summary page exists; usable with a lower evidence weight). The user reviews the list, downloads what they can, and says which to proceed with.

- [x] 4.1 Identify 5 to 10 reputable 2025 to 2026 sources — 2026-09-15, 11 candidates checked for access: 7 open (Deloitte, BCG, Menlo, a16z, KPMG, Microsoft, Stanford), 2 need the user (McKinsey blocks automated requests; MIT NANDA is behind an email form), 2 summary-only (IDC FutureScape, Gartner). BCG PDF already saved to `sourcedoc/bcg-ai-radar-2026.pdf`. Deliverable: `content/web-candidates.md` with proposed ids src-03 to src-13 and a processing order.
- [x] 4.1b User checkpoint — 2026-09-15, user downloaded McKinsey (31 pages, August 2026 edition) and MIT NANDA (26 pages) into `sourcedoc/`. Agent downloaded Deloitte (41 p), KPMG (8 p), Microsoft (33 p), Stanford (425 p) and saved Menlo, a16z and IDC blog pages as HTML. All 10 new sources registered in `sources.json` (src-03 to src-12). `extract_pdf.py` now supports page ranges and skips missing files; new `scripts/extract_web.py` converts saved HTML to Markdown with trafilatura. Extraction run on all seven new PDFs (Stanford: Top Takeaways, Economy and Public Opinion chapters only, 88 pages) and three web pages. Gartner skipped.
- [x] 4.2 Synthesize each confirmed source into `content/synth/src-NN.md` — 2026-09-15, all ten new sources done (src-03 to src-12); twelve synth files in total. Per-source progress:
  - [x] src-05 BCG AI Radar 2026 — 2026-09-15, 29 pages read, 7 chart renders checked. 19 findings, 7 cross-source observations, 30 stats. (`content/synth/src-05.md`)
  - [x] src-04 Deloitte State of AI in the Enterprise 2026 — 2026-09-15, 41 pages read, 8 chart renders checked (p10, p14, p15, p17, p22, p23, p25, p28). 26 findings, 9 cross-source observations, 35 stats. Source inconsistencies logged (N typo p11, wrong Americas N on p23). (`content/synth/src-04.md`)
  - [x] src-09 KPMG AI Pulse Q2 2026 — 2026-09-15, 8 pages read, all 5 content-page renders checked (p3 to p7; text extraction mispaired most values). 17 findings, 8 cross-source observations, 22 stats. Q1 stage breakdown does not reproduce the stated Q1 deployment rate; logged. (`content/synth/src-09.md`)
  - [x] src-07 Menlo Ventures 2025 (web) — 2026-09-15, full article read plus all 14 data charts (fetched to scratchpad, converted to PNG, read, discarded; not stored in project). 20 findings, 10 cross-source observations, 33 stats. Prose/chart mismatch on departmental categories logged. Strong bias note: Menlo is an Anthropic investor, so the LLM-share finding is flagged. (`content/synth/src-07.md`)
  - [x] src-08 a16z CIO survey 2026 (web) — 2026-09-15, full article read plus all 12 data charts (fetched to scratchpad, read, discarded). 16 findings, 9 cross-source observations, 23 stats. Prose/chart mismatch on the LLM spend baseline logged ($4.5M was a projection, not the 2024 actual). a16z is an OpenAI investor; the OpenAI-leads finding is flagged and reconciled with Menlo's Anthropic-leads finding in O1. (`content/synth/src-08.md`)
  - [x] src-10 Microsoft Work Trend Index 2026 (33 p) — 2026-09-15, forked agent; all 33 pages read, renders checked p8, p12, p16, p18. 24 findings, 9 observations, 31 stats. Inconsistencies logged (two fieldwork end dates, 29 vs 27 markets, two "Frontier" constructs). Vendor telemetry and correlational factor analysis flagged. (`content/synth/src-10.md`)
  - [x] src-11 Stanford AI Index 2026 (88 selected pages) — 2026-09-15, forked agent; Top Takeaways, Economy and Public Opinion chapters read, 16 renders checked. 45 findings, 11 observations, 57 stats. Every finding names the underlying data source; the adoption and agent charts are McKinsey 2025 and must not be double counted against src-03. Three inconsistencies logged. (`content/synth/src-11.md`)
  - [x] src-03 McKinsey State of AI 2026 (31 p) — 2026-09-15, forked agent; all 31 pages read, every exhibit page rendered and checked (20 renders). 26 findings, 12 observations, 35 stats. Six exhibit-labelling inconsistencies logged. Only source with a before-and-after workforce check (32% expected cuts, 14% reported). (`content/synth/src-03.md`)
  - [x] src-06 MIT NANDA GenAI Divide 2025 (26 p) — 2026-09-15, forked agent; all 26 pages read, 10 renders checked. 28 findings, 10 observations, 26 stats. Document-facts table records exactly what the "95% fail" figure measures (custom task-specific tools reaching sustained impact within six months, 52-organisation interview sample). Five inconsistencies logged; the authors' protocol agenda flagged. (`content/synth/src-06.md`)
  - [x] src-12 IDC FutureScape 2026 summary (web) — 2026-09-15, public blog read in full; no charts. 6 findings (3 numeric predictions), 5 observations, 4 stats. Lowest evidence weight; outlook use only. (`content/synth/src-12.md`)
- [x] 4.3 Merge web findings into insights, stats, glossary, and chunks — 2026-09-15. stats.json 39 to 259 (stat ids keep the synth numbering, e.g. synth S4-02 is stat s4-02); glossary.json 98 to 164 terms plus new refs on 19 existing terms; insights.json 40 to 84 (ins-041 to ins-084: 44 new, of which 30 multi-source), and 13 existing insights given new refs, related stats and where justified raised to multi-source (ins-005, 007, 010, 013, 018). Web refs carry the source url; PDF refs carry pages. Merge scripts kept in the session scratchpad only; the JSON files are the record. validate_data.py: 0 errors, 0 warnings. build_chunks.py: 599 chunks, longest 348 words.
- [x] 4.4 Write a "Future outlook" insight set that reconciles the sources — 2026-09-15, ins-085 to ins-095 (theme outlook): spend pace, agents on paper vs governed agents, organisational constraint and leading-group size, ROI J-curve, cost discipline, buy-vs-build bifurcation, workforce pace, governance and sovereignty divergence, physical AI, a disagreement scorecard (vendor leader, size, failure rate, spend pace, jobs) and eight indicators to watch in the 2027 editions. Each states where sources agree and where they differ, with refs to every source drawn on.

### Phase 5 — Website build
Target: MVP deployed on GitHub Pages from https://github.com/rbndchsn/genai_market (public repo). No chat in the MVP; Phase 6 is paused.
- [ ] 5.0 Repository setup — `git init` in `GenAI_Market/`, `.gitignore` excluding `sourcedoc/`, `content/raw/`, `__pycache__/`, `.venv*/` and OS files (and `content/synth/` if Q6 says so), `README.md` stub, first commit on `main`, add remote and push. Verify with `git ls-files` that no PDF, no `pages/*.png` and no `text.md` from `content/raw/` is tracked before pushing.
- [ ] 5.1 Site shell — shared layout, navigation (no chat entry in the MVP), CSS tokens, dark mode, responsive at phone width, favicon. Paths must be relative so the site works under the Pages sub-path `/genai_market/`.
- [ ] 5.2 `index.html` dashboard — headline numbers, top insights, links into each section
- [ ] 5.3 `insights.html` — filter by theme and source, expandable cards with citations
- [ ] 5.4 `vendors.html` — sortable and filterable table, interactive quadrant chart, profile drawer
- [ ] 5.5 `stats.html` — charts from `stats.json` (load the `dataviz` skill first), each with a source line
- [ ] 5.6 `glossary.html` — alphabetical, searchable, cross-links to insights
- [ ] 5.7 `sources.html` — bibliography, methodology, licensing and attribution statement
- [ ] 5.8 Search — `scripts/build_search_index.py` builds the index from chunks and glossary; site-wide search box with result snippets and links
- [ ] 5.9 Local run and review — serve with `python -m http.server` from `site/`, check every page at desktop and phone width
- [ ] 5.10 Deploy to GitHub Pages — enable Pages on the repo (Actions static workflow publishing `site/`, or serve from `docs/`), confirm the live URL https://rbndchsn.github.io/genai_market/ renders every page, record the URL here. This is the MVP launch.

### Phase 6 — Ask-the-report chat (PAUSED, user decision 2026-09-15)
Paused so the MVP does not depend on a Cloudflare Worker or an API key. Resume after the static site is live and reviewed. Steps kept for later:
- [ ] 6.1 Scaffold `worker/` with Wrangler, modeled on `verra-v5-qa`
- [ ] 6.2 Retrieval — embed or keyword-score `chunks.json`, return top chunks with citations
- [ ] 6.3 Claude API call with a system prompt that restricts answers to retrieved content and requires citations (load the `claude-api` skill before writing this)
- [ ] 6.4 Rate limiting, CORS, input length limits, API key as a Worker secret
- [ ] 6.5 Chat UI — panel or page, shows the answer plus cited chunks, handles errors and empty results
- [ ] 6.6 Test with 20 representative questions, record answers, fix retrieval gaps

### Phase 7 — QA and launch
- [ ] 7.1 Originality review — scan every site text and `chunks.json` for verbatim overlap with SRC-01 (e.g. 8-word shingle match against the extracted text); rewrite any hit. Confirm no source images or charts are used. Head start (2026-09-15): `scripts/originality_check.py` runs the 8-word shingle check of insights, glossary, stats and vendors against every raw extraction and writes `content/originality-check-<date>.md`. First run: 59 records with at least one 8-word run, of which 30 records (110 runs) match SRC-01 and 16 (43 runs) match SRC-02, almost all from the Phase 3 content; the Phase 4 additions account for 14 records with 1 to 9 runs each, mostly chart labels and question wording. All SRC-01 hits must be rewritten.
- [ ] 7.2 Content accuracy pass — re-check 20 random stats and insights against the PDFs
- [ ] 7.3 Technical QA — link check, Lighthouse (performance, accessibility), no console errors
- [ ] 7.4 Post-review redeploy to GitHub Pages (the first deploy is 5.10); custom domain if any; Worker deploy only if Phase 6 resumes
- [ ] 7.5 Write `README.md` — how to run locally, how to add a new source

### Phase 8 — Maintenance and growth (later)
- [ ] 8.1 Add new PDF sources through the Phase 2 to 3 pipeline
- [ ] 8.2 Periodic web refresh of insights and stats
- [ ] 8.3 Privacy-friendly analytics to see which sections are used

---

## 6. Decisions Log

| Date | Decision | Reason |
|---|---|---|
| 2026-09-15 | Use `plan.md` + `CLAUDE.md` as the coordination mechanism between agents | Keeps state in the repo, readable by any agent, crossed off as work lands |
| 2026-09-15 | Website is public | User decision. Drives the synthesize-and-attribute content rule. |
| 2026-09-15 | Static HTML/JS + JSON data, no build step | User decision. Simple to host, easy for agents to generate content into. |
| 2026-09-15 | All four feature sets in scope: search + glossary, vendor explorer, insights + stats dashboard, ask-the-report chat | User decision |
| 2026-09-15 | Research scope: the two PDFs plus 5 to 10 targeted web sources in the first build | User decision |
| 2026-09-15 | Chat runs as a Cloudflare Worker, separate from the static site | Keeps the site static. Reuses the pattern already proven in `verra-v5-qa`. |
| 2026-09-15 | Synthesis happens offline (agents write JSON); only chat calls an LLM at runtime | Cost control, predictable content, no API key needed to view the site |
| 2026-09-15 | The site is a meta-analysis: original findings in our words, every finding referenced, no verbatim text from SRC-01 (AIM / Blend360), no reused images or charts | User decision. Avoids legal exposure from the licensed report while still using it as a cited input, the same way a literature review cites its sources. Closes Q1. |
| 2026-09-15 | Extraction renders every page to PNG rather than pulling embedded images. Page renders are the reference for tables and charts; `text.md` is the reference for prose. | PyMuPDF table detection misses multi-column layouts. Renders are reliable and readable by agents. Renders are working files only and never go on the site. |
| 2026-09-15 | `chunks.json` is generated from the other data files by a script, never hand-edited. | Keeps search and chat content in sync with the curated data. One place to change wording. |
| 2026-09-15 | Every insight carries an evidence level: single-source, multi-source, or agent-analysis. | Lets the site show readers how well supported each finding is, which is the point of a meta-analysis. |
| 2026-09-15 | Phase 4 runs one step at a time with a user checkpoint after the candidate list. The user retrieves gated PDFs and saves them to `sourcedoc/`; the agent never bypasses sign-in gates. | User decision. Market reports are often gated; the user has the accounts and can download the full documents, which are far better sources than public summaries. |
| 2026-09-15 | Vendor-share findings from the two venture firms (Menlo ranks Anthropic first, a16z ranks OpenAI first) are always presented together with their samples and each firm's investment in the vendor it ranks first. The site never declares a single leader. | Each firm has a conflict of interest and each measures a different population; the agreement on direction (Anthropic gaining, Google rising, open weights falling, multi-model the norm) is the reliable finding. |
| 2026-09-15 | Agent adoption and leading-group size are presented as ranges with the definition behind each source, not as single numbers. | Agent figures run from 7% to 59% and leading-group shares from 1% to 34% purely because of definitions (ins-050, ins-077). Quoting one number would misrepresent the evidence. |
| 2026-09-15 | Chart images from web sources are fetched into the session scratchpad for reading and never stored in the project. | Charts often hold numbers the prose omits; the no-source-images rule still applies to the repository and the site. |
| 2026-09-15 | Phase 6 (ask-the-report chat) is paused. The MVP is the static site only. | User decision. The chat needs a Cloudflare Worker and an API key, which would delay the MVP. |
| 2026-09-15 | Host on GitHub Pages from the public repo https://github.com/rbndchsn/genai_market; the project folder becomes a git repo. `sourcedoc/` and `content/raw/` are never committed. | User decision on hosting (closes Q2). The exclusions follow from the AIM licence and the repo being public. |
| 2026-09-15 | After src-08, the user asked for the rest of Phase 4 (remaining 4.2 sources, 4.3 merge, 4.4 outlook) to be completed in one run without per-source checkpoints. The four remaining PDF syntheses run in parallel as forked agents that write only their `content/synth/src-NN.md`; the main agent does src-12, updates `plan.md`, then does 4.3 and 4.4. | User decision, to finish Phase 4 without further interruptions. |

---

## 7. Open Questions

- ~~**Q1.** AIM report licensing for public use.~~ Resolved 2026-09-15: meta-analysis framing, no verbatim text, no reused images. See Decisions Log.
- ~~**Q2.** Hosting: Cloudflare Pages (proposed) or Vercel / GitHub Pages? Custom domain?~~ Resolved 2026-09-15: GitHub Pages from https://github.com/rbndchsn/genai_market. Custom domain still open.
- **Q3.** Is an Anthropic API key available for the chat Worker, and is there a monthly budget cap? (Only relevant if Phase 6 resumes.)
- **Q6.** Should `content/synth/` (the paraphrased synthesis notes) be committed to the public repo, or kept local until the 7.1 originality review has cleared them? `sourcedoc/` and `content/raw/` are excluded regardless.
- **Q4.** Site name and branding (working name: GenAI Market).
- **Q5.** Should vendor profiles cover all vendors in the AIM report or only the top quadrant?

---

## 8. Change History

| Date | Change |
|---|---|
| 2026-09-15 | Created plan skeleton. Phase 0 complete. |
| 2026-09-15 | Filled in sections 1 to 4 from scoping Q&A. Added Phases 2 to 8 with steps. Phase 1 complete. Added 5 open questions. |
| 2026-09-15 | Reframed the project as a meta-analysis. Tightened content rules: no verbatim text from SRC-01, no reused images or charts, every finding referenced. Reworded step 7.1 as an originality review. Closed Q1. |
| 2026-09-15 | Phase 2 complete. Added a Phase 3 reading guide under Current Status. Logged the page-render decision. |
| 2026-09-15 | Step 3.1 complete: SRC-01 synthesis notes written. |
| 2026-09-15 | Step 3.2 complete: SRC-02 synthesis notes written. Both PDFs fully read. |
| 2026-09-15 | Steps 3.3 to 3.9 complete. Phase 3 done. Added data-pipeline note under Current Status. Corrected vendor HQ count in src-01 notes (12 US, 11 India). |
| 2026-09-15 | Phase 4 reworked: added working rule (one step at a time, gated sources handled by the user), a candidate-list deliverable for 4.1, and a user checkpoint step 4.1b. |
| 2026-09-15 | Step 4.1 complete: 11 web candidates listed with access status in `content/web-candidates.md`. BCG PDF saved. 4.1b marked in progress, waiting on user. |
| 2026-09-15 | Step 4.1b complete: 10 new sources downloaded, registered and extracted. Added `extract_web.py`, page-range support in `extract_pdf.py`. Source inventory added under Current Status. |
| 2026-09-15 | Step 4.2 started. BCG (src-05) synthesised. 4.2 now carries a per-source progress list. |
| 2026-09-15 | Wrote `content/synth/README.md`, the step-by-step procedure for synthesising a source, so a fresh session can continue 4.2 without prior context. Linked from Current Status and CLAUDE.md. |
| 2026-09-15 | Step 4.2: Deloitte (src-04) synthesised. Next source is KPMG (src-09). |
| 2026-09-15 | Step 4.2: KPMG (src-09) synthesised. Next source is Menlo Ventures (src-07). |
| 2026-09-15 | Step 4.2: Menlo Ventures (src-07) synthesised. Added a Current Status note on reading web-source charts via the scratchpad. Next source is a16z (src-08). |
| 2026-09-15 | Step 4.2: a16z (src-08) synthesised. Next source is Microsoft Work Trend Index (src-10). |
| 2026-09-15 | User asked for the rest of Phase 4 in one run. Steps 4.2 (src-10, src-11, src-03, src-06 via forked agents; src-12 by the main agent), 4.3 and 4.4 completed. Phase 4 done. Current Status moved to Phase 5 with a reading guide for the data files. Decisions logged on VC vendor-share conflicts, leading-group range and web-source charts. Added `scripts/originality_check.py` and a first overlap report as a head start for 7.1 (not a Phase 4 step; recorded there, not acted on). |
| 2026-09-15 | User decisions recorded: Phase 6 paused; hosting is GitHub Pages from rbndchsn/genai_market. Added steps 5.0 (repo setup with exclusions) and 5.10 (Pages deploy), reworded 5.1 and 7.4, closed Q2, added Q6. Repo checked: exists, public, empty; local folder not yet a git repo. |
