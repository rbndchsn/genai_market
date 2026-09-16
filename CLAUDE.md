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
- Data changes (Phase 3 output onward): edit `site/data/*.json` per `content/schemas.md`, then run `scripts/validate_data.py` and `scripts/build_chunks.py`. Never hand-edit `chunks.json`.
- Site pages (Phase 5): build per the routine in `plan.md`, review with `scripts/review_shots.py`, record the step in `plan.md`.
- Originality (Phase 7.1): `python scripts/originality_check.py` writes `content/originality-check-<date>.md` (local only). Every SRC-01 hit must be rewritten.
