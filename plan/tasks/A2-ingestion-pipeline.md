# A2 — Ingestion state machine, backfill, new-month detection, demo replay
**Priority:** P0 · **Wave 1** · **Sessions:** 1–2 · **Depends on:** T02 (A1 interface; stub until merged)

## Read first
CLAUDE.md, docs/ARCHITECTURE.md, docs/DATA_SOURCES.md, docs/DATA_MODEL.md, docs/ALERTS.md (Demo path)

## Goal
A Step Functions pipeline that ingests any list of months idempotently, runs daily to detect new months, backfills history, and supports a disclosed demo replay.

## Owns
`services/ingestion/src/handlers/**` (not `cdsco/`), `services/ingestion/statemachine/**`, `infra/lib/lanes/a2-ingestion.ts`, `services/admin-demo/**`

## Deliverables
1. **Lambda `check-months`** (EventBridge Scheduler daily 06:30 IST): compare available months with IngestionState; start one execution for missing months.
2. **State machine `asli-<stage>-ingest`** input `{ months: string[], tabs: ["nsq","spurious"], sourceType: "ENDPOINT"|"PDF"|"FIXTURE", fixtureKey? }`:
   Map (maxConcurrency 1) over months × tabs → MarkRunning → Choice(sourceType) → Fetch (A1) | PdfIngest (A3 task, placeholder Pass state until A3 merges) | LoadFixture → Parse+Normalize → WriteBatches (chunked BatchWrite with conditional puts via TransactWrite or per-item conditional put) → MarkDone. Catch → MarkFailed + ops SNS. On `ENDPOINT` failure after retries, Choice routes to PDF if enabled.
3. **Reason classifier** Lambda (Bedrock, enum-constrained, cached in Reference table).
4. After Map: invoke stats job (lane S) via `lambda:Invoke` ARN from SSM if present (skip if absent).
5. **Backfill script** `scripts/backfill.ts --stage <s> --from 2023-01` starts an execution with all months.
6. **Demo replay**: `POST /v1/admin/demo/replay-month` (admin group, `int` only) starts the machine with `sourceType: FIXTURE`; rows get `demo: true`. Create fixture `fixtures/demo/replay-1.json` from a real CDSCO row (chosen by X to match the mock strip).
7. **Reference data builder** (runs after each ingestion): (a) manufacturer aliases — group `manufacturerNorm` values whose similarity is STRONG, write `MFR#`/`ALIAS#` items, and list uncertain pairs in `tools/reference/review.md` for the human; (b) brand → manufacturer map — take the leading brand token(s) of `productName` (before strength or dosage words), write `BRAND#`/`MFR#` items with `confidence` = share of rows and `evidence` = row count. Used by C for bills.
8. Metrics per docs/OBSERVABILITY_AND_COST.md.

## Acceptance criteria
- [ ] Running the same month twice produces zero new items (test on `dev-a2`)
- [ ] Backfill of all available months completes; row counts recorded in Handoff
- [ ] New-month check starts nothing when up to date
- [ ] Demo replay inserts demo rows and the execution is visible in the console
- [ ] Reference items written after backfill; alias review file generated
- [ ] Failure path marks FAILED and publishes to ops topic (test by forcing a bad month)

## Out of scope
Parsing logic (A1), PDFs (A3), matching (G2).

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
