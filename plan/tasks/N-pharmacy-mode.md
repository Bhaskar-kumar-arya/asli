# N — Pharmacy mode (bulk check)
**Priority:** P2 · **Wave 2** · **Sessions:** 1 · **Depends on:** core gate

## Read first
CLAUDE.md, docs/API.md (pharmacy), docs/SCANNING.md (bill), docs/MATCHING.md

## Owns
`services/pharmacy/**`, `apps/web/src/features/pharmacy/**`, `infra/lib/lanes/n-pharmacy.ts`

## Deliverables
1. `POST /v1/pharmacy/checks`: CSV (columns mapped by header: product, batch, manufacturer, expiry, quantity; template CSV downloadable) or supplier invoice photo (reuse C's bill extraction module by import).
2. Results table: every row's tier, flagged rows first, `flaggedUnits` total, source links, export results as CSV.
3. `/pharmacy` page, simple and fast; up to 500 rows.

## Acceptance criteria
- [ ] A 200-row CSV with 3 seeded flagged batches returns those 3 as FLAGGED in < 5 s
- [ ] Invoice photo path works on one real invoice

---
## Handoff (the session updates this before stopping)
**Status:** DONE (not yet deployed to any stage)
**Stage deployed:** none
**Done:**
- `services/pharmacy/**`: `POST /v1/pharmacy/checks` handler for both request shapes (`{csv}` and `{uploadId}`), CSV parser (`src/csv.ts`, header-mapped, case-insensitive, `MAX_ROWS=500`), rate limit (10/hour), metrics, logging. 11 unit tests passing.
- Invoice-photo path reuses lane C's Bedrock bill-extraction pipeline by deep-importing `@asli/scan/src/{check-item,scans/bedrock-client,scans/model-id,scans/post-process,reference/alias-map,reference/brand-candidates,uploads/presign}` rather than re-implementing extraction (per this task's own instruction). Photo is deleted from S3 immediately after extraction either way (docs/PRIVACY.md).
- `infra/lib/lanes/n-pharmacy.ts`: one Lambda, wired to the shared HTTP API/JWT authorizer, imports FlaggedBatches/IngestionState/Reference tables and the uploads bucket + Bedrock model-id SSM param via SSM, same IAM shape as lane C's scans Lambda.
- `apps/web/src/features/pharmacy/**`: `/pharmacy` page (CSV upload, CSV template download, invoice photo upload, results table sorted FLAGGED-first, flagged-units total, CSV export of results). Wired into `apps/web/src/app/routes.tsx` at the pre-existing `// N adds:` placeholder.
- `pnpm -r lint && pnpm -r test` both pass across the whole workspace (checked after this change, no regressions in other lanes).

**Remaining:**
- Not deployed to any stage (`dev-a1`/etc.) or `int` - needs `STAGE=<lane-stage>` CDK deploy once lane N is picked up for integration, per T02/X's shared-stack sequencing.
- Acceptance criterion "200-row CSV with 3 seeded flagged batches returns those 3 FLAGGED in <5s" not run against real seeded fixtures/DynamoDB - only unit-tested with mocked lookup. Needs a real run against `dev-shared` seeded data once deployed.
- Acceptance criterion "invoice photo path works on one real invoice" not run against a real Bedrock call - only unit-tested with a mocked `extractBill`. Needs a manual pass once deployed with a real model id.
- No CSS polish pass; table styling is plain inline styles matching the dashboard page's level of finish, not scan/cabinet's more designed screens.

**Gotchas / decisions:**
- Reused lane C's rate-limit table shape (RATE# prefix in the Reference table) but kept `services/pharmacy/src/rate-limit/limiter.ts` as its own small copy rather than importing it, consistent with how every other lane (stats, cabinet, members, ...) keeps its own `http.ts`/`logging.ts`/`metrics.ts` rather than sharing lane C's. Only the bill-extraction pipeline is imported across lanes, since the task explicitly called that out.
- Deep-importing `@asli/scan/src/...` subpaths works at both build and test time because `@asli/scan`'s `package.json` has no `exports` map restricting subpaths - confirmed via `pnpm -r test`/`tsc --noEmit`. If lane C later adds an `exports` map, these imports would need `@asli/scan` to explicitly re-export them from its root `index.ts` instead.
- CSV parser is hand-rolled (no new dependency) - handles quoted fields with embedded commas, is fine for the ≤500-row/small-file use case here.
- Front-end file-read uses `FileReader` instead of `File.prototype.text()` - jsdom 25 (this repo's test environment) doesn't implement `File.text()`, and `FileReader` is more broadly supported anyway.
**Contract change requests:**
- none (PharmacyCheckRequest/PharmacyCheckResponse already existed in packages/contracts, no changes needed)
**Learning log entries added:** yes
