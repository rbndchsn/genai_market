# Accuracy evaluation toolkit

How the site's records were checked against their sources in steps 7.2 and 7.2b (see `plan.md`), kept here so the next run (for example 7.2c, the 144 unchecked glossary terms) does not start from scratch. Results are recorded in `content/quality.json`. They are deliberately not served or shown on the site: `site/method.html` explains the checking layers and this procedure in prose, without figures (decision 2026-09-17, see `plan.md`).

Run everything from a Claude Code session in the project root. Keep working files in a scratch folder or in `scripts/eval/work/` (git-ignored): batches, verdicts and edit lists describe source content and must never be committed.

## Files

| File | What it does |
|---|---|
| `accuracy-eval.js` | Workflow. One checker agent per batch; reads cited page renders, page text or saved articles; returns a structured verdict per record (match, minor, mismatch, unverifiable) with issues and proposed fixes. `args.second` lists record kinds that also get an adversarial second read. |
| `apply-eval-fixes.js` | Workflow. Given each record's current text and its adjudicated issues, drafts revised title, summary, detail, evidence and refs, with an issue-by-issue account. Writes nothing. |
| `write-correction-notes.js` | Workflow. Writes one plain-language note per corrected record for the table on the method page. |
| `summarize.py` | Merges verdicts from a workflow journal (`journal.jsonl`) per record and prints what needs adjudication. `--kind`, `--only-issues`, `--out merged.json`. |
| `apply_edits.py` | Applies an adjudicated `edits.json` to `site/data/*.json`, exactly once per edit, and records them in `applied.json`. `--dry-run` first. |
| `review_fixes.py` | Shows fixer revisions as word-level diffs against the live insights and saves them for applying. |

## Procedure

1. **Plan the scope.** Decide which records and whether to sample. Draw samples with a fixed seed and record it. A wrong value in a sample means checking the whole layer.
2. **Write batch files.** One JSON file per batch in the work folder: `{"kind": "insight|analysis|vendor|stat|glossary", "records": [...full records...]}`, plus `"meta"` from `vendors.json` for vendor batches. Seven to ten records per batch.
3. **Calibrate.** Run `accuracy-eval.js` on records whose errors are already known and confirm the checker finds them before trusting it.
4. **Run the check.** Call the Workflow tool with `scriptPath: scripts/eval/accuracy-eval.js` and `args: {dir, scratch, batches: [{name, kind, ids}], second: ["insight", "analysis", "vendor"]}`. `dir` and `scratch` are absolute work-folder paths; `ids` may be an empty list. Use a different model from the one that wrote the content (7.2b used Claude Opus 5 against content written by Claude Fable 5.1).
5. **Merge and adjudicate.** `python scripts/eval/summarize.py <journal.jsonl> --only-issues --out merged.json`. Confirm every mismatch yourself against the page render or text; accept a minor issue when both checkers agree or when it is a page-cited wording or reference fix; re-measure any changed number that only one checker reported.
6. **Queue exact edits** in `edits.json`. Operations: replace (`field`, `old`, `new`), `set` (`path`, `value`), `set_ref_pages`, `drop_ref`, `swap_ref`, `set_series_values`, `rename_series`, `insert_platforms`, `set_metric_value`, `replace_metric`. Each carries `severity` and `why`. Then `python scripts/eval/apply_edits.py . <work_dir> --dry-run`, and again without `--dry-run`.
7. **Draft wider prose fixes** with `apply-eval-fixes.js` (inputs: each record's current text and issues), review with `python scripts/eval/review_fixes.py <journal.jsonl> . --save revisions.json`, and apply only what you accept.
8. **Re-run every check.** `python scripts/validate_data.py`, `build_chunks.py`, `build_search_index.py`, `originality_check.py` (zero hits against src-01 is mandatory; corrections can introduce new ones), `check_site.py`.
9. **Record.** Update `content/quality.json` (`accuracy.layers`, `rounds`, `run`, `findings`, `results` with a note per corrected record; schema in `content/schemas.md`), using `write-correction-notes.js` for the notes and reading every note before use. Review `method.html` with `review_shots.py`, record the step in `plan.md`, and commit only when the user says so.

## Pitfalls met on Windows

- Workflow scripts must have LF line endings (`.gitattributes` enforces this for this folder).
- Long Bash heredocs with mixed quotes can fail to parse; write the Python to a file and run it.
- Set `PYTHONIOENCODING=utf-8` when printing source text to the console.
- Data files use CRLF; rewrite them with `json.dumps(..., indent=2, ensure_ascii=False)` and the original newline so diffs stay clean.
- Some web charts print axis labels out of line with their gridlines. Calibrate chart readings against any values the article states.
