# cdsco/

Real CDSCO responses captured by T01's endpoint spike, 2026-09-17. See
`plan/tasks/T01-spikes.md` Handoff for full evidence (headers, status codes).

- `endpoint-nsq-2026-02.json` — `GET /CDSCO/filteredNsqDrugTable?month=Feb-2026&source=All&tab=nsq`, no auth/cookies/special headers. 217 rows. DataTables-style JSON (`aaData[]`) despite `Content-Type: text/plain`.
- `endpoint-spurious-2026-02.json` — `GET /CDSCO/filteredSpuriousDrugTable?month=Feb-2026&source=All` (a **separate endpoint**, not the `tab=spurious` param on `filteredNsqDrugTable` — that param has no effect and silently returns NSQ data regardless of its value). 4 rows. Different/extra fields: `product_name_from_dtl` (not `str_product_name`), plus `str_nsq_remarks`, `str_firm_reply`, `str_spurious_manufactured_by`, `str_spurious_manufacturer_name`.
- `reporting-months-2025.json` — `GET /CDSCO/reportingMonths?year=2025` (the real path; docs/DATA_SOURCES.md's guess of `publicReportingMonths` returns HTTP 400). Returns `["Jan",...,"Dec"]`. 2019–2025 all return full 12-month arrays; 2018 returns `[]` — earliest usable backfill year is 2019.
- `pdf-nsq-2025-03.pdf`, `pdf-nsq-2024-09.pdf` — downloaded directly from `cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadAlertsFiles/...` (found via web search of the listing page `https://cdsco.gov.in/opencms/opencms/en/Notifications/nsq-drugs/`, since that page's PDF table is JS-rendered and not visible in a plain fetch). No auth needed.
