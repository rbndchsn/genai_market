# Web source candidates (step 4.1)

Compiled 2026-09-15. Access status was checked by the agent on that date.
**Open** = the agent can fetch the full document. **Gated / blocked** = the user signs in or opens it in a browser, downloads the PDF, and saves it to `sourcedoc/`. **Summary-only** = only a public summary exists; usable with lower evidence weight.

Proposed source ids are assigned in priority order and will be confirmed at step 4.1b.

## Recommended: full documents

| # | Proposed id | Source | Publisher, date | Sample / method | Access | What it adds | Action |
|---|---|---|---|---|---|---|---|
| 1 | src-03 | The State of AI: Global Survey 2026 | McKinsey / QuantumBlack, 2026 (survey May 4 to June 8, 2026) | 1,719 respondents, 97 countries | **Blocked for the agent.** McKinsey's site does not answer automated requests at all (timeouts, no response to plain requests). Page: https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai | The most-cited annual adoption survey. Headline from search snippets: 54% of $1B+ firms scaling AI enterprise-wide; share scaling agents up from 27% to 40%; 37% report any EBIT impact; 6% qualify as high performers. Direct comparator for IDC's tier data and AIM's conversion data. | **User: open the page in a browser, download the full report PDF, save as `sourcedoc/mckinsey-state-of-ai-2026.pdf`.** |
| 2 | src-04 | State of AI in the Enterprise 2026 | Deloitte AI Institute, late 2025 (survey Aug to Sep 2025) | 3,235 senior leaders, 24 countries, half IT and half business | **Open.** PDF, 8 MB: https://www.deloitte.com/content/dam/assets-shared/docs/about/2025/state-of-ai-2026-global.pdf | 66% report productivity gains; only a third "deeply transforming"; worker skills the top barrier; leadership-led governance linked to more value; agentic AI potential by function. Large global sample. | Agent fetches at 4.2. |
| 3 | src-05 | BCG AI Radar 2026: As AI Investments Surge, CEOs Take the Lead | Boston Consulting Group, January 2026 | 2,360 executives incl. 640 CEOs, 16 markets, 9 industries | **Open.** Already downloaded and saved as `sourcedoc/bcg-ai-radar-2026.pdf` (29 pages). | AI share of revenue rising from about 0.8% to 1.7%; 72% of CEOs now the main AI decision-maker; only 6% of companies see real value; 94% will keep or expand investment even if returns disappoint. CEO and investment lens. | Nothing; ready. |
| 4 | src-06 | The GenAI Divide: State of AI in Business 2025 | MIT NANDA (MIT Media Lab), July 2025 | 300+ public deployments reviewed, 52 interviews, 153 survey responses | **Gated.** Official copy is behind an email form on the MIT NANDA site. Unofficial mirrors exist; we do not use them. | The source of the widely quoted "95% of GenAI pilots deliver no measurable return" and "5% cross the pilot-to-production cliff". Directly comparable with AIM's 70%+ pilot failure figure. Primary copy needed to cite it responsibly. | **User: request the report from MIT NANDA, save as `sourcedoc/mit-nanda-genai-divide-2025.pdf`.** |
| 5 | src-07 | 2025: The State of Generative AI in the Enterprise | Menlo Ventures, 9 December 2025 (survey Nov 7 to 25, 2025) | About 495 US enterprise AI decision-makers | **Open (web page).** Full findings readable at https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/ . A PDF version sits behind a download form; optional. | Enterprise GenAI spend $37B in 2025 (3.2x); application layer $19B; 76% of use cases bought not built; vendor share shifts; deal conversion 47%. Spend and buy-vs-build lens. | Agent fetches the page at 4.2. User may optionally download the PDF as `sourcedoc/menlo-state-of-genai-2025.pdf`. |
| 6 | src-08 | Leaders, gainers and unexpected winners in the enterprise AI arms race (3rd annual CIO survey) | Andreessen Horowitz, 30 January 2026 | 100 VPs and C-level at Global 2000 firms, 88% over $1B revenue | **Open (web page).** https://a16z.com/leaders-gainers-and-unexpected-winners-in-the-enterprise-ai-arms-race/ | Average enterprise AI spend $7M rising to $11.6M in 2026 (+65%); 81% run three or more model families; budgets moving to recurring line items; buy over build. Model-market and budget lens. | Agent fetches at 4.2. |
| 7 | src-09 | AI Quarterly Pulse Survey, Q2 2026 | KPMG US, June 2026 (fielded Apr 28 to May 25, 2026) | 204 US C-suite and business leaders at $1B+ firms | **Open.** PDF, 0.5 MB: https://kpmg.com/kpmg-us/content/dam/kpmg/corporate-communications/pdf/2026/AIPulseSurvey_Q2_FINAL.pdf | Agent deployment 53% (55% prior quarter); 33% scaling agents across functions; employee agent adoption 56% up from 23%; focus shifting to cost visibility and governance. Quarterly trend data, most recent of all candidates. | Agent fetches at 4.2. Earlier quarters (Q4 2025, Q1 2026) also open if trend lines are wanted. |
| 8 | src-10 | 2026 Work Trend Index Annual Report | Microsoft, May 2026 | 20,000 workers in 10 countries plus Microsoft 365 usage signals | **Open.** PDF, 20 MB, via https://aka.ms/2026WorkTrendIndexAnnualReportPDF | "Frontier Firm" operating model; workers ready but organisations not; only 16% of AI users are "frontier professionals"; scale is organisational not individual. Workforce and adoption lens. Vendor-published, so treat like the Solace-sponsored IDC brief. | Agent fetches at 4.2. |
| 9 | src-11 | AI Index Report 2026 | Stanford HAI, April 2026 | Compiled indicators, nine chapters | **Open.** PDF, 38 MB: https://hai.stanford.edu/assets/files/ai_index_report_2026.pdf | Organisational adoption 88%; investment, corporate usage and productivity evidence in the Economy chapter; public opinion chapter. The most neutral, academic source in the set. Very long; we would extract only the Economy and Public Opinion chapters. | Agent fetches at 4.2, extracts selected chapters only. |

## Optional: summary-only

| # | Proposed id | Source | Publisher, date | Access | What it adds | Recommendation |
|---|---|---|---|---|---|---|
| 10 | src-12 | IDC FutureScape 2026: Worldwide Agentic AI Predictions | IDC, October 2025 | **Summary-only.** Blog and press release are open; full prediction documents are for IDC subscribers. https://idc.com/resource-center/blog/futurescape-2026-moving-into-the-agentic-future | Forward-looking predictions: half of enterprises using agents to redefine human-machine collaboration by 2027; agentic systems nearly half of AI spending by 2029; only 1% at an optimised stage. | Include as a low-weight "predictions" source from the public summary. Skip if the user prefers full documents only. |
| 11 | src-13 | Gartner CIO and Technology Executive Survey 2026 and agentic AI press releases | Gartner, Aug 2025 and Jan 2026 | **Summary-only and blocked.** Gartner returns 403 to automated requests; press releases are readable in a browser; underlying research is client-only. | 17% of organisations have deployed agents, 60%+ expect to within two years; 40% of enterprise apps to include task-specific agents by end 2026. | Low priority. If wanted, the user can paste the press release text into `sourcedoc/gartner-press-releases-2026.md`. Otherwise skip. |

## Recommendation

Proceed with all nine full documents (rows 1 to 9). That gives eleven sources in total with the two PDFs already in hand, covering vendor, buyer, CEO, CIO, spend, workforce and academic perspectives across 2025 and 2026. Include IDC FutureScape as a low-weight predictions source. Skip Gartner unless the user wants to paste the press releases.

**User actions needed before 4.1b:**
1. Download McKinsey State of AI 2026 PDF to `sourcedoc/mckinsey-state-of-ai-2026.pdf`.
2. Request and download MIT NANDA GenAI Divide 2025 PDF to `sourcedoc/mit-nanda-genai-divide-2025.pdf`.
3. Optional: Menlo PDF, Gartner press-release text.
4. Confirm the list, or strike any row.

## Processing plan for 4.2 (one source per step)

Order: BCG (in hand) → Deloitte → KPMG → Menlo → a16z → Microsoft → Stanford (selected chapters) → McKinsey (when downloaded) → MIT NANDA (when downloaded) → IDC FutureScape summary.
PDFs go through `scripts/extract_pdf.py`; web pages are saved as `content/raw/src-NN/page.md` with URL and accessed date. Each produces `content/synth/src-NN.md` in the same format as src-01 and src-02.
