export const meta = {
  name: 'write-correction-notes',
  description: 'Write one plain-language note per corrected record for the published evaluation table',
  phases: [{ title: 'Notes', detail: 'one writer per batch of twelve records' }],
}

const SCHEMA = {
  type: 'object',
  properties: {
    notes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, note: { type: 'string' } },
        required: ['id', 'note'],
      },
    },
  },
  required: ['notes'],
}

const PROMPT = (name) => `Write short public notes for a table titled "Every correction, record by record" on a research website that publishes its own accuracy evaluation. Do not create or edit any file; return the notes through the structured output.

INPUT: read ${args.dir}\\${name}.json. Each item is a record that an accuracy check found wrong ("mismatch") or needing a minor fix ("minor"). It gives the fields that changed (before and after), what the checkers found in the source ("checker_evidence"), and sometimes a note from an earlier round of checks.

For every item write one note of 15 to 40 words that tells a general reader what was wrong and how it was corrected. Rules:
- Plain British English, past tense for what was wrong, full sentences, no em dashes, no bullet characters, no field names such as "detail" or "refs" (say "the text", "the page reference", "the sample description", "the label").
- Lead with the substance: the wrong figure, unit, population, attribution or wording, then the correction. Include the key numbers when a number changed (for example "gave $5.8B per firm; the source says about $5.8M").
- For page-reference-only fixes, say the page reference was completed or corrected.
- If "changes" is empty, the correction was made in an earlier round: base the note on "earlier_round_note".
- Never quote a source. Never copy more than three consecutive words from checker_evidence for records whose evidence cites src-01. Do not name individual people.
- Do not add anything that the changes and evidence do not show. Do not praise or apologise.
Return one note per item, using each item's id.`

const out = await parallel(args.batches.map((n) => () =>
  agent(PROMPT(n), { label: `notes:${n}`, phase: 'Notes', schema: SCHEMA }).then((r) => (r ? r.notes : null))))
const bad = out.map((x, i) => (x ? null : args.batches[i])).filter(Boolean)
if (bad.length) log(`No result from: ${bad.join(', ')}`)
return out.filter(Boolean).flat()
