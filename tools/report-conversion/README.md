# Report conversion

Turns Lemon Squad inspection PDFs into the report documents the client portal clone shows
(`public/portal/reports/<report id>/report.json` and its `images/`). It is a build-time tool: nothing here is
imported by the app or included in the Vite build.

It runs **Kavin's own extraction** (`inspection-dashboard/apps/extraction_service/extract.build_report`) with one
substitution: where his code would send the pages to OpenAI, `lemonsquad.py` reads the page layout and returns the
payload the model would. His heuristic parse, his grading (`validate.clean`) and his merge (`llm.merge`) run
unchanged. No API key and no network calls.

## Files

| File | What it does |
| --- | --- |
| `lemonsquad.py` | The layout reader: sections, item labels paired with their status by position, red remarks as notes, one finding per tire, NAAA scores as ratings, the Summary page as per-area summaries, and the cover's date and place. The ordering customer and the legal disclosures are not read. |
| `convert.py` | Runs `build_report` with the layout reader in place of the model call, then prepares each document for the demo (below) and writes it out. |
| `images.py` | Re-encodes each photo as WebP: 1024px on the long side, plus a 360px thumbnail, both at quality 55. |
| `index.mjs` | Writes `src/platform/reportIndex.js`, every report's summary row, from the converted documents. |
| `manifest.json` | Which PDF becomes which report: its report id and the customer (workspace or walk-in) it belongs to. The ids must match the seed (`src/platform/seed.js`, `REPORT_JOBS`). |

What `convert.py` changes after Kavin's extraction:

- The report id (Kavin's `YYYYMMDD-HHMMSS-abc123` format) comes from the manifest and also replaces the provider's own report number.
- The customer field is the job's workspace, or the walk-in's name. The filename drops the report number, and the raw text is not kept.
- `source` is `"layout"`, so the document says how it was read.
- The odometer is the one the report's Vehicle Information table prints. Kavin's heuristic takes the first "N miles" in the text, which can be a repair-history mileage, and his merge keeps it.
- Every photo in the PDF is kept, in page order. Kavin's extractor treats an image drawn on two pages as a logo, which loses a cover photo that is repeated in the gallery and any photo split across a page break.

## Re-running it

You need Python 3.11+, and a virtualenv with two dependencies:

```bash
python3 -m venv ~/report-conversion-venv
~/report-conversion-venv/bin/pip install "pymupdf>=1.24" "pillow>=10"
```

Then, from this folder:

```bash
~/report-conversion-venv/bin/python -B convert.py \
  --apps ~/projects/reference/inspection-dashboard/apps \
  --pdfs /path/to/the/pdfs \
  --out ../../public/portal/reports
```

- `--apps` is the only way Kavin's code is reached; it is read, never written. `-B` keeps Python from leaving `__pycache__` in it.
- `--pdfs` is the folder holding the PDFs the manifest names. They are read only and never copied into the repo.
- `--out` is where `<report id>/report.json` and `<report id>/images/` land. Nothing else is written.
- `--only <pdf name> ...` converts just those.

Then refresh the index the seed and the list pages read (each report's summary row; Node, no dependencies):

```bash
node index.mjs --reports ../../public/portal/reports --out ../../src/platform/reportIndex.js
```

For a new PDF, add a line to `manifest.json`, then add its job to `REPORT_JOBS` in the seed with the same id.
Each run prints the vehicle, the inspection date, the finding counts and the photo count, so you can check them
against the PDF.

The reader expects Lemon Squad's template. Another provider's layout needs a reader of its own, written the same
way: return the payload described by `llm.SYSTEM` and `llm.SCHEMA` in Kavin's code.
