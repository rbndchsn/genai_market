# CLAUDE.md — GenAI_Market

Instructions for any AI agent (Claude Code or otherwise) working in this folder.
These add to, and do not replace, the workspace-level `C:\Projects\MyPythonProjects\CLAUDE.md`.

## 1. First action, every session

Read `plan.md` in this folder in full before doing anything else.
Do not start work from the user's message alone. `plan.md` is the source of truth
for what we are building, why, and which step comes next.

## 2. Locate yourself

- Read the **Current Status** block at the top of `plan.md`.
- Find the first step that is not marked `[x]` in **Implementation Steps**.
- If the user's message is ambiguous about which step to work on, ask before starting.
- If the status block says a discussion with the user is pending, summarise the options it lists and wait for the user's choice before doing any work.
- Decisions go in the Decisions Log table (section 6) and dated changes in the Change History table (section 8). Check which table a row belongs to before inserting it.

## 3. Keep plan.md current

- When a step is finished and verified, change `- [ ]` to `- [x]` and append a short
  note on the same line: date, what was done, files touched.
- Mark a step `- [~]` while it is in progress if the session may end before it is done.
- If the work reveals the plan is wrong or incomplete, edit the plan (add, split, or
  reorder steps) and tell the user what changed and why.
- Record decisions in **Decisions Log** and unresolved items in **Open Questions**.
  Do not leave them only in chat.
- Never delete completed steps or rewrite history. Later agents rely on it.
- Log any structural edit to the plan in **Change History**.

## 4. Scope discipline

Work only on the step agreed with the user. Do not do future steps ahead of time
without asking. If you notice something that should be done later, add it to the
plan as a new step or open question instead of doing it now.

## 5. End of session

Before finishing, update the **Current Status** block in `plan.md`: last updated date,
current phase, next step, blockers. The next agent should be able to resume from
that block alone.

## Project facts

- Source material lives in `sourcedoc/`.
- Platform: Windows 11, PowerShell. Python 3.11+.
- Workspace conventions (venvs, project layout) are in the parent `CLAUDE.md`.
- PDF extraction: use `C:\Projects\MyPythonProjects\ENV\Scripts\python.exe` (has PyMuPDF and docling). Do not create new venvs for this.
- Cloudflare Worker pattern to copy for the chat backend: `C:\Projects\MyPythonProjects\verra-v5-qa`.
- Load the `claude-api` skill before writing any code that calls the Claude API. Load the `dataviz` skill before writing any chart.

## Content rules (non-negotiable)

This site is a meta-analysis. We publish our own research findings with references.
- Write every sentence in our own words. Never paste or lightly paraphrase source text.
- The AIM / Blend360 report (SRC-01) is a licensed document: no verbatim text, not even short quotes, and no reuse of its images or charts.
- Every finding, stat, and vendor fact must carry a reference (source id + page, or URL).
- Rebuild all charts from our own `stats.json`. Never embed a source's image.
- Full rules are in `plan.md` section 4, "Content and citation rules".

## Web sources

- Never try to bypass a sign-in or paywall. Mark the source as gated in the candidate list and let the user download the PDF into `sourcedoc/`.
- Run Phase 4 one step at a time and report after each. The user reviews candidate lists before anything is extracted.

## Phase 5 rules (website build)

- Follow the "Phase 5 build and review routine" section in `plan.md` exactly: page skeleton, `GM` shell helpers, CSS tokens and components, data-driven values only, stable id anchors, query-string filters.
- Load the `dataviz` skill before writing any chart, stat tile or KPI row, and validate any new palette with its checker.
- Review every page with `python scripts/review_shots.py <page>` (desktop and 390px phone view) and read both screenshots before marking a step done. Fix what you find first.
- Commit only when the user asks. Before every commit, confirm nothing from `sourcedoc/`, `content/raw/`, `content/synth/` or `content/originality-check-*.md` is staged; the repo is public and the AIM report is licensed.
- Phase 6 (chat) is paused by user decision. Do not add a chat entry, a Worker or any Cloudflare dependency. Hosting is GitHub Pages from https://github.com/rbndchsn/genai_market.

## Procedures

- Synthesising a source (Phase 4, step 4.2): follow `content/synth/README.md`. Read the full extraction, verify charts against page renders, write notes in the fixed structure, update `plan.md`, report.
- Data changes (Phase 3 output onward): edit `site/data/*.json` per `content/schemas.md`, then run `scripts/validate_data.py`, `scripts/build_chunks.py` and `scripts/build_search_index.py`. Never hand-edit `chunks.json` or `search-index.json`.
- Site pages (Phase 5): build per the routine in `plan.md`, review with `scripts/review_shots.py`, record the step in `plan.md`.
- Originality (Phase 7.1): `python scripts/originality_check.py` writes `content/originality-check-<date>.md` (local only). Every SRC-01 hit must be rewritten.
- Accuracy evaluation (Phase 7.2 onward): follow `scripts/eval/README.md`. Checkers run as a different model from the author model, every "wrong" verdict is confirmed against the page before data changes, and results go into `content/quality.json` (not `site/data/`, so they are not served).

## Accuracy rules (learned in 7.2b, 2026-09-16)

The full evaluation found 33 of 402 evidence records wrong and 133 loose. Most errors were true figures put in the wrong place during multi-source synthesis. So, for any new or edited insight, statistic, vendor fact or definition:
- Check each claim against its cited page (render for charts and tables) while writing it, not against the synthesis notes.
- Keep the population, unit, year and source of every figure exactly as the page gives them. A share is not a count, a forecast is not an actual, a tie is not a lead.
- Mark an insight multi-source only when two independent sources support its central figure.
- Treat values read from unlabelled chart marks as approximate and say so; calibrate them against any values the source prints.
- After a data change, update the matching row in `content/quality.json` if the change affects evaluated records, and re-run the originality check: corrected text can reintroduce source wording.

## Publishing rules (user decisions, 2026-09-16)

- The method page teaches the workflow and names the three checking layers, but publishes no evaluation figures: no pass rates, no counts of corrected or wrong records, no per-record corrections table. That account lives in `content/quality.json` and `plan.md`. Do not move it back onto the site.
- The site is show-only: no data-file downloads, no "How to cite" section, no public corrections channel. The repository link and the "How it was built" page are published on purpose; keep them. Repo issues, wiki and projects are switched off.
- Show-only means no data-file downloads, no "How to cite" section, no corrections form and no issue tracker. It does not forbid the call to action added on 2026-09-17: the site may invite interest in the work, it just does not invite correction of it. Do not remove the call to action or the value proposition as off-brand.
- The user approves pushes with a one-word "push". For large steps they may say to run to the end without asking at each fork; still stop before committing.
- Commit messages end with the attribution line the harness provides.
- After a deploy, browsers keep `js/` and `css/` for ten minutes; tell the user to press Ctrl+F5 if a change does not show.

## Site voice and positioning (user decisions, 2026-09-17 and 2026-09-18)

- "We" is defined once, in the home hero: "Human-led, with AI agents in the loop, not the other way round." Every later "we" on every page inherits that meaning. Keep the definition; do not reintroduce an unexplained "we", and do not repeat the definition on other pages.
- Two pieces of marketing are deliberate and load-bearing. Home page, last section, "How this scales": what the agentic AI application does, why on-demand research matters, and the reflexive proof line. Method page, last section, "Where this could go next": the same offer with the contact ask. Both sit last on their page on purpose, so the reader meets the evidence before the offer. Keep that order.
- The agentic AI framing is the positioning term and is used on purpose. It is a description, not a slogan: the division of labour it claims is the one the method page documents, so keep it accurate if the working method changes.
- The three quality-control terms must read the same on both pages: validation, originality check, accuracy evaluation. A prospect who clicks through from the home page must find the same words explained in depth.
- Claims about the application are framed as intent, not delivery ("could", "what comes next"), because it is not built. Do not upgrade them to present tense.
- No em-dashes in site copy. Use a colon, a comma or a new sentence.

## Layout decisions that look like defects (2026-09-18)

- There is no search box in the site header, on purpose. One was removed because it only reached the Search page once a query was typed, and a CSS rule hid the Search nav item as redundant against it, leaving the page, its tag sphere and its browse view with no route on desktop. The Search nav item is the single affordance and is shown at every width. Do not add a header search box back.
- Nav order is deliberate: Overview, Insights, Vendors, Statistics, Glossary, How it was built, Sources, Search. Sources and Search are back matter and sit at the end; "How it was built" is meant to be read, so it sits with the content. Glossary stays beside the pages whose terms it defines.
- The vendors quadrant labels every shown vendor, not only the Leaders. The collision pass in `vendors.js` places them and uses a leader line where a label had to move. If the chart looks crowded, narrow the set with a filter rather than cutting the label set; under 560px the chart is dots only and the table carries the names.

## Windows pitfalls

- Long Bash heredocs with mixed quotes can fail to parse; write the script to a file in the scratchpad and run it.
- Workflow scripts must use LF line endings.
- Set `PYTHONIOENCODING=utf-8` when printing source text; data files use CRLF, so rewrite them with the original newline.
