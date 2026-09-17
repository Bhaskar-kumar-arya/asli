# DATA_SOURCES.md

## 1. CDSCO structured endpoint (primary, pending spike T01)
Observed in a browser (returned 200, no login):
```
GET https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Feb-2026&source=All&tab=nsq
```
Parameters: `month` = `Mon-YYYY` (e.g. `Feb-2026`), `source` = `All` (other values unknown), `tab` = `nsq` (the Spurious tab value is unknown; find it in the page's network calls).

A second endpoint `publicReportingMonths?year=...` appears to return JSON of available months for a year. Exact parameter names unknown — T01 records them.

Columns (one cell each): Name of product, Batch number, Manufacturing date, Expiry date, Manufacturer, NSQ result (reason), Reporting source (e.g. `State Lab`), Reporting lab. Dates look like `Aug-2025`.

**Known risk:** a non-browser fetch of this URL for Feb-2026 and Jul-2026 returned HTTP 400 during planning. Possible causes: required cookies/session from the parent page, headers (Referer, X-Requested-With, User-Agent), a different month format, or blocking of non-browser clients. T01 must test from a Lambda in ap-south-1 and document exactly what works, including the response format (HTML fragment vs JSON).

## 2. CDSCO monthly alert PDFs (fallback, lane A3)
Published on cdsco.gov.in under the NSQ alerts notifications section. Example files verified during planning:
- `NSQ Alert For the month of  Sept-2024.pdf` (note the double space)
- `NSQ ALERT FOR THE MONTH OF JANUARY-2025.pdf`
- `NSQ Alert For The Month of March-2025.pdf`

File names are inconsistent, so discover links from the listing page rather than constructing URLs. PDFs contain a table: S.No, Name of drug, Batch No, Date of Manufacture, Date of Expiry, Manufactured by, Reason for NSQ, Drawn by, and sometimes separate sections for Spurious drugs. Date formats vary (`12/2024`, `Dec-2024`, `12/12/2024`). Batch numbers may wrap across lines in extracted text.

## 3. Polite fetching rules
- Only the ingestion pipeline fetches. Never from a user request.
- Daily check at most, plus a one-time backfill.
- At least 2 seconds between requests; backfill Map state concurrency 1.
- User-Agent: `AsliHackathonBot/1.0 (+<repo URL>)` unless T01 finds a browser-like agent is required, in which case document it.
- Save every raw response to S3 before parsing (`raw/cdsco/<source-type>/<month>/<tab>/<sha256>.<ext>`).
- On failure: retry with backoff 3 times, then fall back or mark the month `FAILED` and alert the team email.

## 4. Normalized record (see packages/contracts `FlaggedBatch`)
| Field | Rule |
|---|---|
| productName | trimmed, original case kept |
| batchRaw | as published |
| batchNorm | see MATCHING.md normalizeBatch |
| batchSkeleton | see MATCHING.md skeleton |
| mfgMonth, expMonth | `YYYY-MM` or null; parse `Mon-YYYY`, `MM/YYYY`, `DD/MM/YYYY`, `MON-YYYY`, full month names |
| manufacturerRaw | as published |
| manufacturerNorm | see MATCHING.md normalizeManufacturer, then alias table |
| category | `NSQ` or `SPURIOUS` |
| reasonRaw | as published |
| reasonCode | enum from packages/content (rule-based; Bedrock classifier only for unmapped, output must be in enum, else `OTHER`) |
| reportingSource | e.g. `CENTRAL_LAB`, `STATE_LAB`, `UNKNOWN` |
| reportingLab | as published |
| alertMonth | `YYYY-MM` of the CDSCO alert |
| sourceUrl | endpoint URL with params, or PDF URL |
| snapshotKey | S3 key of the raw response |
| rowHash | sha256 of alertMonth+category+batchNorm+manufacturerNorm+productName |

## 5. Months to backfill
All months returned by `publicReportingMonths` for every available year. If that endpoint is unusable, backfill from PDFs from Jan 2023 onward as a minimum.
