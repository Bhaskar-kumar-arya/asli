# A3 — PDF + Textract fallback ingestion
**Priority:** P0 if T01 verdict is ENDPOINT_FAILS, otherwise P2 · **Wave 1** · **Sessions:** 1–2 · **Depends on:** T02

## Read first
CLAUDE.md, docs/DATA_SOURCES.md §2, docs/MATCHING.md (normalization), T01 Handoff

## Goal
Ingest a month from CDSCO's alert PDFs, producing the same `ParsedRow[]` A1 produces.

## Owns
`services/ingestion/src/pdf/**`, `services/ingestion/statemachine/pdf-subflow.asl.json`, `infra/lib/lanes/a3-pdf.ts`

## Deliverables
1. Link discovery from the listing page: map PDF link text/file names to `YYYY-MM` (handle "Sept", full month names, double spaces, upper case).
2. Download to `raw/cdsco/pdf/<month>/<sha256>.pdf`.
3. Textract async `StartDocumentAnalysis` (TABLES) with SNS completion or polling via Step Functions wait loop; save JSON to `textract/`.
4. Table reconstruction: merge header rows, map columns by header keywords, join wrapped batch numbers (cells with line breaks), detect Spurious sections.
5. Emit `ParsedRow[]` and reuse A1's `normalizeRows`.
6. Sub-state-machine callable from A2's PDF branch.

## Acceptance criteria
- [ ] Sep-2024, Jan-2025 and Mar-2025 PDFs produce 49, 52 and 70 NSQ rows respectively (the counts verified during planning; adjust if the PDFs also include state-lab sections, and document)
- [ ] ≥ 95% of batch numbers equal a hand-checked sample of 20 rows
- [ ] Textract pages metric emitted

## Out of scope
Endpoint client.

---
## Handoff (the session updates this before stopping)
**Status:** NOT STARTED | IN PROGRESS | BLOCKED | DONE
**Stage deployed:** 
**Done:**
- 
**Remaining:**
- 
**Gotchas / decisions:**
- 
**Contract change requests:**
- none
**Learning log entries added:** yes / no
