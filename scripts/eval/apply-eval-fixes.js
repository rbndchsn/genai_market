export const meta = {
  name: 'apply-eval-fixes',
  description: 'Draft corrected insight text from adjudicated checker issues, returning revisions for review',
  phases: [{ title: 'Fix', detail: 'one fixer per batch; returns revised fields and an issue-by-issue account' }],
}

const REF = {
  type: 'object',
  properties: {
    source: { type: 'string' },
    pages: { type: 'array', items: { type: 'integer' } },
    url: { type: 'string' },
  },
  required: ['source'],
}
const SCHEMA = {
  type: 'object',
  properties: {
    records: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          detail: { type: 'string' },
          evidence: { type: 'string', enum: ['multi-source', 'single-source', 'agent-analysis'] },
          refs: { type: 'array', items: REF },
          account: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                n: { type: 'integer' },
                action: { type: 'string', enum: ['applied', 'already', 'declined'] },
                note: { type: 'string' },
              },
              required: ['n', 'action', 'note'],
            },
          },
        },
        required: ['id', 'title', 'summary', 'detail', 'evidence', 'refs', 'account'],
      },
    },
  },
  required: ['records'],
}

const PROMPT = (name) => `You are correcting published research text after an accuracy review. Working directory: C:\\Projects\\MyPythonProjects\\MyScripts\\GenAI_Market. Do NOT create, edit or delete any file. Return your revisions only through the structured output.

INPUT: read ${args.dir}\\${name}.json. It is a list of records. Each has "current" (the live title, summary, detail, evidence level and refs of an insight) and "issues" found by two independent checkers who read the cited source pages. Each issue has a number n, what the record said, what the source shows, where, and a suggested fix. Some issues have already been fixed in the current text by an earlier pass; some issues from the two checkers overlap.

FOR EACH RECORD return the full revised title, summary, detail, evidence and refs, plus an account entry for every issue number:
- applied: you changed the text or refs to resolve it. Say what you changed in a few words.
- already: the current text already resolves it.
- declined: you did not act. Give the reason. Decline when the suggested fix would add a claim the issue's "source shows" does not support, when it is only a stylistic preference, or when it conflicts with another issue's evidence.

RULES
- Change only what the issues require. Keep every other sentence exactly as it is.
- Resolve the substance of the issue, but write the fix in the existing voice: plain British English, our own words, no em dashes, no parentheses beyond those already used for figures and pages, sentences of normal length.
- Never quote a source. Never copy more than five consecutive words from the "source shows" text of a src-01 issue; src-01 is a licensed report, so describe it in fresh words.
- Numbers must match the issue's "source shows" exactly. Do not introduce any number that is not in the current text or in an issue's "source shows".
- Keep the title at or under 110 characters and the summary to at most three sentences.
- Refs: keep the same shape (source plus pages, or source plus url). Add or change pages only as an issue requires. Do not drop a source unless an issue shows the text no longer uses it.
- Evidence: change to single-source only when an issue shows the central claim rests on one source.
- If two issues conflict, prefer the one whose "source shows" is more specific, and decline the other with a reason.
- Return the records in the input order with their own ids.`

const results = await parallel(args.batches.map((name) => () =>
  agent(PROMPT(name), { label: `fix:${name}`, phase: 'Fix', schema: SCHEMA }).then((r) => ({ batch: name, records: r ? r.records : null }))))
const missing = results.filter((x) => !x || !x.records).map((x) => x && x.batch)
if (missing.length) log(`No result from: ${missing.join(', ')}`)
return results.filter(Boolean)
