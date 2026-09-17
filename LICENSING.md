# Licensing

You may use, adapt and share this project, including for commercial purposes, under the terms below. Most of it is licensed; a few parts that derive from a licensed analyst report are not.

## What is licensed

| Part | Paths | Licence |
|---|---|---|
| Code | `scripts/`, `site/js/`, `site/css/`, the HTML structure of `site/*.html`, `.github/` | [MIT](LICENSE) |
| Written text | Page text in `site/*.html`, `README.md`, `plan.md`, `CLAUDE.md`, `content/schemas.md`, `scripts/eval/README.md` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Data | `site/data/insights.json`, `glossary.json`, `stats.json`, `sources.json`, `quality.json`, `search-tags.json`, except the records listed below | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Icon | `site/assets/favicon.svg` | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

## What is not licensed for reuse

One of the twelve sources, the AIM Research report on generative AI service providers (`src-01` in `sources.json`), is a licensed document. We use it as a cited input only, and its terms for reuse by others are not known to us. Everything that restates that report is therefore excluded:

- `site/data/vendors.json` (vendor scores, quadrant placements and profiles).
- `site/data/taxonomy.json` (service categories, workloads, engagement models, scale practices and maturity tiers, which draw on the same report).
- Records in `site/data/stats.json` and `site/data/insights.json` whose references cite `src-01` and no other source (the statistics numbered `s1-*` and the insights that rest on that report alone).
- `site/data/chunks.json` and `site/data/search-index.json`, which are generated from all the data files and include the material above.

You can read these parts on the site and link to them. For any other use, go to the original report.

## Things no licence here can grant

- **Facts and findings from the sources.** Our licence covers our wording and our compilation. The underlying reports belong to their publishers; cite them as each record does.
- **Trademarks.** Company and product names belong to their owners.
- **Accuracy.** Everything is provided as is. The accuracy evaluation and its limits are described on the site's "How it was built" page; check figures against the cited source before relying on them.

## How to credit us

For text or data:

> Source: GenAI Market, "A Meta-Analysis of the State of Enterprise AI", Sustainable IQ, https://rbndchsn.github.io/genai_market/, licensed under CC BY 4.0. Changes were made (if any).

For code, keep the copyright notice in `LICENSE`.

Record ids are stable, so you can link to a single record, for example `insights.html#ins-045` or `stats.html#s4-02`.

## Note

This project was written with the help of an AI agent, directed and reviewed by the author. This file is our statement of permission, not legal advice. If you plan a large commercial use, take your own advice.
