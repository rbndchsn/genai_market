export const meta = {
  name: 'accuracy-eval',
  description: 'Check site records against the source pages they cite and return structured verdicts',
  phases: [
    { title: 'Check', detail: 'one checker per batch, reads cited page renders and text' },
    { title: 'Second look', detail: 'adversarial re-check of the same batch where enabled' },
  ],
}

const DIR = args.dir
const SCR = args.scratch

const ISSUE = {
  type: 'object',
  properties: {
    severity: { type: 'string', enum: ['minor', 'mismatch', 'unverifiable'] },
    field: { type: 'string', description: 'which field or sentence of the record' },
    record_says: { type: 'string' },
    source_shows: { type: 'string', description: 'what the source shows, in your own words, with numbers' },
    where: { type: 'string', description: 'source id and page, e.g. src-04 p.21, or src-07 url' },
    fix: { type: 'string', description: 'concrete replacement text or value in our own words, ready to paste; empty if none' },
  },
  required: ['severity', 'field', 'record_says', 'source_shows', 'where', 'fix'],
}
const SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['match', 'minor', 'mismatch', 'unverifiable'] },
          checked_pages: { type: 'array', items: { type: 'string' } },
          claims_checked: { type: 'integer' },
          found: { type: 'string', description: 'short summary of what the sources show, own words' },
          issues: { type: 'array', items: ISSUE },
        },
        required: ['id', 'verdict', 'checked_pages', 'claims_checked', 'found', 'issues'],
      },
    },
  },
  required: ['results'],
}

const COMMON = `You are checking records on a research website (a meta-analysis of enterprise AI) against the source documents they cite. Working directory: C:\\Projects\\MyPythonProjects\\MyScripts\\GenAI_Market. Do NOT create, edit or delete any file inside the project. You may write only inside ${SCR} (for downloaded chart images).

WHERE THE SOURCES ARE
- PDF sources: content/raw/<src-id>/text.md is page-delimited; each page starts with a marker line "<!-- page N -->". The files are large: use Grep to find the marker and read only the lines for the pages you need (Read with offset and limit). content/raw/<src-id>/pages/NNN.png is a render of page N, three digits zero-padded (pages/021.png). Text extraction scrambles tables and charts, so any number in a chart or table MUST be read from the render with the Read tool. For src-11 only selected chapters were extracted; if a render is missing, say so.
- Web sources (src-07 Menlo Ventures, src-08 a16z, src-12 IDC blog): content/raw/<src-id>/page.md is the article text and page.html is the saved page. Chart images are not stored. When a value exists only in a chart, find the image URL in page.html (or fetch the live article) and download the image into ${SCR}\\img\\ (curl or WebFetch; only from the source's own domain), convert webp to png if needed with C:\\Projects\\MyPythonProjects\\ENV\\Scripts\\python.exe and PIL, and read it. Never save anything into the project.
- content/synth/src-NN.md are our earlier working notes. They can help you locate a figure but they are NOT evidence. If a value is recorded there as a chart reading and you cannot view that chart, the verdict for that claim is unverifiable, not mismatch.
- If a figure is not on the cited page, check two pages either side. Found on an adjacent page = minor issue with the corrected page as the fix.

HOW TO JUDGE
- Judge against what the page shows, never against plausibility or your own knowledge. Be exact with numbers, units (million vs billion, % vs points), years, sample sizes and who said what.
- Attribution matters: a figure credited to one source must come from that source; a claim about a population (CEOs, executives, buyers, providers) must match the population the source surveyed.
- Direction matters: a share falling is not a count falling; a forecast is not an actual; a tie is not a lead; correlation reported by a source is not causation.
- Verdict per record: match = every claim supported as stated. minor = substance right but a wording, attribution, population, rounding or page reference needs tightening. mismatch = a figure or claim is contradicted by the cited source, credited to the wrong source, or supported by no cited source. unverifiable = a claim cannot be checked (page missing, chart unavailable). The record verdict is the most severe of its issues.
- Every issue needs a concrete fix: the replacement sentence, value or page, written in our own words.
- Quoting: never more than five consecutive words from any source. From src-01 (a licensed report) quote nothing at all; describe it.
- Do not invent problems. Stylistic preferences are not issues. Our wording differing from the source is intended.`

const RUBRIC = {
  insight: `RECORD TYPE: insight (fields: title, summary, detail, evidence, refs). List every factual claim and number in the title, summary and detail and check each one against the cited source and page. For an insight marked multi-source, confirm that at least two independent sources support its central claim; if the central figures rest on one source only, add a minor issue whose fix is "evidence: single-source". Count your claims in claims_checked.`,
  analysis: `RECORD TYPE: insight labelled as our own analysis (evidence: agent-analysis). The inference is ours by design. Check: (a) every fact attributed to a source is right; (b) any count or tally we made ourselves (for example how many vendor profiles list an industry) by computing it from the data files in site/data/ (vendors.json, stats.json, insights.json) with Python via C:\\Projects\\MyPythonProjects\\ENV\\Scripts\\python.exe; (c) the inference is presented as our reading, not credited to a source that does not say it; a conclusion worded as a source's finding when the source does not state it is a mismatch. Count your claims in claims_checked.`,
  vendor: `RECORD TYPE: vendor profile from src-01 (AIM Research PeMa Quadrant 2026). The payload has "meta" with the axes and quadrant threshold. The score and rank table is on src-01 p.29 and the quadrant chart on p.28; each vendor's profile pages are in its refs. Check pe_score, pe_rank, ma_score, ma_rank against p.29; quadrant against the scores and the threshold in meta; founded; hq; focus; industries; markets; each platform name and what it does; differentiators; each claimed metric and whether the source gives a figure; partners. service_categories is our own taxonomy mapping: check only that nothing in it contradicts the profile, minor at most. List order is alphabetical by design and is not an issue. Wording is deliberately ours: flag only substance (a platform, partner, market or industry the profile does not name, a wrong year or place, a metric with a figure the source does not give). Remember: no quotes from src-01 at all.`,
  stat: `RECORD TYPE: statistic (fields: label, unit, value, series with labels and values, series_label, n, note, refs). Check the label, unit, value, EVERY series entry, series_label, n (sample) and every claim in the note. Any series value that differs from the source is a mismatch. The chart field is a display hint and is not checked. Take special care with values read from unlabelled chart segments (stacked bars, bubbles, dot plots): measure them against the axis, and when a record adds segments together, check the sum. If our value is a reasonable reading of an unlabelled mark (within one point), it is minor with a note that it is approximate; if it is further off, it is a mismatch.`,
  glossary: `RECORD TYPE: glossary term (fields: term, expansion, definition, related, refs). The definition is our own general-purpose wording. Check that the expansion is right, that the definition is not factually wrong, that anything it attributes to a source (a figure, a finding, a usage) is on the cited page, and that each cited page actually discusses the term; a cited page that does not mention the term is a minor issue with the right page as the fix.`,
}

const ADVERSARIAL = `SECOND LOOK. Another checker has already reviewed these records. Your job is to find what a careful first reader misses. Assume errors are most likely in the prose around the numbers: units, who was surveyed, which source said it, forecasts written as actuals, shares written as counts, ties written as leads, figures from one chart year applied to another. Read every sentence slowly against the page. Report only what the page supports; if a record is genuinely right, say match.`

function prompt(b, second) {
  return `${COMMON}

${RUBRIC[b.kind]}
${second ? '\n' + ADVERSARIAL + '\n' : ''}
INPUT: read ${DIR}\\${b.name}.json. It holds "records"${b.ids && b.ids.length ? ` (${b.ids.length}: ${b.ids.join(', ')})` : ''}${b.kind === 'vendor' ? ' and "meta"' : ''}. Return exactly one result for every record in the file, in the same order, using each record's own id.`
}

const second = new Set(args.second || [])
const results = await pipeline(
  args.batches,
  (b) => agent(prompt(b, false), { label: `check:${b.name}`, phase: 'Check', schema: SCHEMA })
    .then((r) => ({ batch: b.name, kind: b.kind, pass: 'first', results: r ? r.results : null })),
  (first, b) => {
    if (!second.has(b.kind)) return [first]
    return agent(prompt(b, true), { label: `second:${b.name}`, phase: 'Second look', schema: SCHEMA })
      .then((r) => [first, { batch: b.name, kind: b.kind, pass: 'second', results: r ? r.results : null }])
  },
)
const flat = results.filter(Boolean).flat()
const missing = flat.filter((x) => !x.results).map((x) => `${x.batch}/${x.pass}`)
if (missing.length) log(`No result from: ${missing.join(', ')}`)
return flat
