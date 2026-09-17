# C — Upload, scan, check and alert-detail APIs
**Priority:** P0 · **Wave 1** · **Sessions:** 1–2 · **Depends on:** T02 (B stub OK)

## Read first
CLAUDE.md, docs/SCANNING.md, docs/API.md, docs/MATCHING.md, docs/PRIVACY.md, docs/OBSERVABILITY_AND_COST.md

## Goal
The backend of "photograph a strip or bill, get a trustworthy result".

## Owns
`services/scan/**`, `packages/lookup/**`, `infra/lib/lanes/c-scan.ts`

## Deliverables
1. `POST /v1/uploads`: presigned PUT (5 min, content-type locked, 5 MB) into `strip/`, `bill/` or `pharmacy/`.
2. `POST /v1/scans`: load image, Bedrock Converse with tool schema (strip or bill prompt from docs/SCANNING.md, stored in `services/scan/src/prompts/`), Zod validation, one retry, post-processing, brand→manufacturer candidates from Reference table, candidate lookup (FlaggedBatches by batchNorm and skeleton), `decide`, response. Delete bill objects immediately. Warnings as specified.
3. `POST /v1/checks`: same candidate lookup + `decide` for manual items (no Bedrock).
4. `GET /v1/alerts/{alertRef}`.
5. `packages/lookup` (owned by C): `findCandidates(identity) → FlaggedBatch[]` (by batchNorm and skeleton) and `getCheckedAgainst()`. Commit a typed stub within the first 30 minutes, because F, G2 and N import it.
6. `checkedAgainst` from IngestionState (count DONE months, latest month; cache 5 minutes).
7. Per-user rate limiting (DynamoDB counter with TTL).
8. Metrics: tokens, latency, failures, tiers.

## Acceptance criteria
- [ ] Unit tests with mocked Bedrock for every scan-response fixture state
- [ ] On `dev-c` with seeded fixtures: a real strip photo returns the correct tier for a seeded matching row
- [ ] A bill photo returns per-line results; the bill object no longer exists after the call
- [ ] No image data, model output or bill text appears in logs (inspect CloudWatch)
- [ ] p95 scan latency recorded in Handoff

## Out of scope
QR (K), pharmacy (N), UI.

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
