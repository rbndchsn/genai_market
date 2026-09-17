# Data schemas for `site/data/*.json`

Every record that states a fact carries `refs`. A ref is `{ "source": "<source id>", "pages": [int, ...] }`
for PDFs, or `{ "source": "<source id>", "url": "<url>" }` for web sources. Source ids must exist
in `sources.json`. `scripts/validate_data.py` enforces this.

All text is written by us. No verbatim passages from any source (see `CLAUDE.md`).

## sources.json
```
{ "sources": [ {
  "id": "src-01",                 // stable id, used by every ref
  "type": "report" | "survey" | "web",
  "title": string,
  "publisher": string,
  "authors": [string],
  "date": "YYYY-MM",              // publication date
  "accessed": "YYYY-MM-DD" | null,// for web sources
  "url": string | null,
  "pages": int | null,
  "sponsor": string | null,
  "method": string,               // one or two sentences
  "sample": string | null,        // for surveys
  "license_note": string,         // how we may use it
  "bias_note": string | null,     // known framing or sponsorship effects
  "how_we_use_it": string
} ] }
```

## glossary.json
```
{ "terms": [ {
  "id": "rag",                    // kebab-case, used for cross-links
  "term": "RAG",
  "expansion": string | null,     // full form of an acronym
  "definition": string,           // our words, one to three sentences
  "tags": [string],               // architecture | operations | governance | commercial | method | market | data
  "related": ["<term id>"],
  "refs": [ref]                   // where the term is used or defined
} ] }
```

## insights.json
```
{ "themes": { "<theme id>": "<label>" },
  "insights": [ {
  "id": "ins-001",
  "title": string,                // under 90 chars
  "summary": string,              // one or two sentences, the finding itself
  "detail": string,               // supporting explanation, three to six sentences
  "theme": "<theme id>",
  "kind": "finding" | "observation" | "recommendation",
  "evidence": "single-source" | "multi-source" | "agent-analysis",
  "refs": [ref],
  "related_stats": ["<stat id>"],
  "related_terms": ["<term id>"],
  "related_vendors": ["<vendor id>"]
} ] }
```
`evidence`: single-source = one source says it; multi-source = two or more independent sources
converge; agent-analysis = our own cross-vendor or cross-source observation, still cited to
the pages it draws on.

## vendors.json
```
{ "meta": {
    "source": "src-01",
    "edition": "2026",
    "axes": { "pe": string, "ma": string },
    "quadrant_threshold": 0.5,
    "quadrants": { "<id>": { "label": string, "pe": "high"|"low", "ma": "high"|"low", "meaning": string } }
  },
  "vendors": [ {
  "id": "blend360",               // kebab-case
  "name": string,
  "founded": int | null,
  "hq": { "city": string, "country": string },
  "pe_score": number, "pe_rank": int,
  "ma_score": number, "ma_rank": int,
  "quadrant": "leaders" | "seasoned" | "growth" | "challengers",
  "focus": string,                // one or two sentences, our words
  "industries": [string],
  "markets": [string],
  "platforms": [ { "name": string, "what": string } ],  // named products are facts
  "differentiators": [string],    // our words, short phrases
  "claimed_metrics": [ { "metric": string, "value": string } ],  // vendor-claimed, unaudited
  "partners": [string],
  "service_categories": ["t1".."t7"],   // from taxonomy.json
  "refs": [ref]
} ] }
```

## taxonomy.json
```
{ "service_categories": [ { "id": "t1", "name": string, "summary": string, "capabilities": [string], "refs": [ref] } ],
  "workloads": [ { "id": "w1", "name": string, "family": "assistive" | "agentic", "status": string, "description": string, "refs": [ref] } ],
  "industry_use_cases": [ { "industry": string, "assistive": [string], "agentic": [string], "refs": [ref] } ],
  "engagement_models": [ { "id": string, "name": string, "form": string, "status": string, "refs": [ref] } ],
  "scale_practices": [ { "id": string, "name": string, "practices": [string], "refs": [ref] } ],
  "maturity_tiers": [ { "id": string, "name": string, "percentile": string, "share": number, "n": int, "score": int, "refs": [ref] } ]
}
```

## stats.json
```
{ "stats": [ {
  "id": "s2-06",
  "label": string,                // what was measured
  "unit": "%" | "score" | "count" | "usd" | "ratio" | "text",
  "value": number | string | null,// single value, or null when series is used
  "series": [ { "label": string, "value": number } ] | null,
  "series_label": string | null,  // e.g. "Maturity tier"
  "chart": "bar" | "grouped-bar" | "donut" | "table" | "range" | "none",
  "n": string | null,             // sample note
  "note": string | null,          // caveats
  "theme": "<insight theme id>",
  "refs": [ref]
} ] }
```

## quality.json

Results of the three checking layers, shown on `method.html`. Updated by hand after each run.

```
{ "validation":  { "last_run": "YYYY-MM-DD", "pages": 9, "links_checked": 1500, "console_errors": 0, "data_errors": 0, "data_warnings": 0 },
  "originality": { "last_run": "YYYY-MM-DD", "records_scanned": 546, "licensed_hits_before": 110, "licensed_hits_after": 0, "public_hits_remaining": 72, "note": "..." },
  "accuracy":    { "date": "YYYY-MM-DD", "seed": 20260916, "method": "...", "note": "...", "findings": ["one paragraph each, the high-level story of what was found and fixed"],
                   "sample": { "stats": 12, "insights": 8 },
                   "results": [ { "id": "s4-18", "type": "stat|insight", "verdict": "match|minor|mismatch|unverifiable",
                                  "pages_checked": ["src-04 p.16"], "note": "in our words, no source quotes", "fixed": true } ] } }
```

`accuracy.results` carries one row per sampled record; verdict counts are computed by the page. Notes are written in our words and never quote a source. Not read by `validate_data.py`.

## search-tags.json

Hand-curated list of search queries shown as the tag sphere on `search.html`.

```
{ "note": "...", "tags": ["agent governance", "token cost", ...] }
```

Each entry is a plain query string. The page runs every tag through the search at load time, uses the result count for the tag's weight and title, and hides any tag with fewer than three results. Not read by `validate_data.py` or the build scripts.

## chunks.json (generated by `scripts/build_chunks.py`, do not edit by hand)
```
{ "chunks": [ {
  "id": string,                   // "<type>:<record id>"
  "type": "insight" | "vendor" | "stat" | "glossary" | "taxonomy" | "source",
  "record_id": string,
  "title": string,
  "text": string,                 // 300 to 500 words max, plain text
  "source_ids": [string],
  "pages": [int],
  "page_url": string              // site page plus anchor
} ] }
```

## Id conventions
- Sources: `src-NN`. Stats: `s<source number>-NN`. Insights: `ins-NNN`. Vendors, terms: kebab-case slug.
- Never reuse or renumber an id once published.
