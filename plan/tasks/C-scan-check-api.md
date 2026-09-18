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
**Status:** DONE for everything not blocked on Bedrock model access; scan-endpoint real-photo verification is BLOCKED on the same T01 Bedrock access issue that blocks A2/N (deferred, not urgent per NOW.md - CDSCO endpoint matching doesn't need vision extraction).
**Stage deployed:** `dev-c` (`LaneCStack-dev-c`, real deploy - 4 Lambdas: UploadsHandler, ChecksHandler, ScansHandler, AlertsHandler, all wired onto the shared HTTP API/JWT authorizer via `addRoute`)
**Done:**
- `packages/lookup` (owned by this lane, committed first within 30 min per the task's own instruction so F/G2/N could import it early): `findCandidates(identity) -> FlaggedBatch[]` (exact query by `batchNorm` PK + near query by `batchSkeleton` GSI1, deduped by `alertId`) and `getCheckedAgainst()` (counts DONE months from IngestionState, 5-minute in-process cache). 5 unit tests.
- `services/scan/src/uploads`: `POST /v1/uploads` - presigned **POST** (not PUT, see Gotchas) into `strip/<userId>/<uploadId>`, `bill/...`, `pharmacy/...`, 5-minute expiry, `content-length-range` capped at 5 MB and `Content-Type` locked as POST-policy conditions, content type allowlisted to jpeg/png/webp.
- `services/scan/src/checks`: `POST /v1/checks` - lookup + `@asli/matching`'s `decide()` per item, no Bedrock. Rate-limited (120/hour).
- `services/scan/src/scans`: `POST /v1/scans` - S3 GetObject, Bedrock Converse with a forced `record_medicines` tool (schemas/prompts in `extraction-schema.ts`/`prompts/`), Zod validation with one retry (`bedrock-client.ts`), post-processing into `MedicineIdentity[]` + warnings (`post-process.ts`, covers every `NOT_A_MEDICINE`/`NO_BATCH_ON_LINE`/`LOW_READ_CONFIDENCE` case), brand->manufacturer candidate lookup from Reference `BRAND#` when manufacturer is missing, bill objects deleted immediately after extraction (success or failure), strip objects left to the bucket's 1-day lifecycle rule. Rate-limited (30/hour).
- `services/scan/src/alerts`: `GET /v1/alerts/{alertRef}` - decodes the alertRef, fetches the FlaggedBatches item, returns `AlertDetail` with `sourceUrl`/`reportingSource`/`snapshotKey` always present (CLAUDE.md rule 4).
- `services/scan/src/rate-limit/limiter.ts`: per-user, per-route, per-hour-bucket DynamoDB counter (`ADD` + `if_not_exists` TTL) in the Reference table under a `RATE#` key prefix that doesn't collide with T02's `MFR#`/`BRAND#`/`REASON#` prefixes.
- `services/scan/src/reference/`: `alias-map.ts` (loads the full `MFR#`/`ALIAS#` alias map for `@asli/matching`'s `normalizeManufacturer`, 5-min cache) and `brand-candidates.ts` (`normalizeBrand` + `BRAND#` query for the brand->manufacturer lookup).
- `services/scan/src/check-item.ts`: the one shared function both `/v1/checks` and `/v1/scans` call - fetches candidates + checkedAgainst, calls `@asli/matching`'s `decide()` (which already builds the whole `CheckItemResult`, see Gotchas), records `CheckTier`/`BatchCollisionIgnored` metrics.
- Metrics (Powertools EMF, namespace `Asli`): `BedrockInputTokens`/`BedrockOutputTokens` (dim `purpose`), `ScanLatencyMs`, `ExtractionFailed`, `CheckTier` (dim `tier`), `BatchCollisionIgnored`. Logging via Powertools Logger, allowlisted fields only (`requestId`, `lane`, `route`, `tier`, `scanId`, `uploadId`, `kind`, `itemCount`, `durationMs`, `errorCode`) - verified against real CloudWatch logs on `dev-c` (see Gotchas).
- `infra/lib/lanes/c.ts`: this lane's one CDK stack (`LaneCStack-dev-c`), one Lambda per route, imports `flagged-batches`/`ingestion-state`/`reference` tables and the `uploads` bucket from `dev-shared` via SSM. Verified with a real `cdk synth LaneCStack-dev-c` (all 4 routes + 4 Lambdas present) before deploying.
- **Actually deployed `LaneCStack-dev-c` for real** and invoked 3 of the 4 handlers directly (`aws lambda invoke`, bypassing API Gateway/Cognito since there's no test JWT set up yet - same approach A1 used for its test Lambda):
  - `ChecksHandler` with `{batchNumber: "GTL1258", manufacturer: "Gidsha Pharmaceuticals"}` against the real seeded `dev-shared` data returned `tier: "FLAGGED"`, both the real NSQ and SPURIOUS rows, **SPURIOUS listed first** exactly per docs/MATCHING.md, with `sourceUrl`/`reportingLab` populated on both matches.
  - `AlertsHandler` with that result's real `alertRef` returned the full `AlertDetail` including `snapshotKey` and `sourceUrl`.
  - `UploadsHandler` returned a real, valid presigned POST (verified `content-length-range` and `Content-Type` conditions in the decoded policy, real SigV4 credentials from the Lambda's own role - confirms the `s3:PutObject` grant works).
  - Checked real CloudWatch logs for the `ChecksHandler` invocation: only `requestId`, `lane`, `route`, `tier`, `itemCount` logged - no request body, batch number, manufacturer name, or raw model output anywhere in the log stream (CLAUDE.md privacy rule, docs/API.md acceptance criterion).
- `pnpm -r lint && pnpm -r test && pnpm -r build` all pass across the whole worktree (194 tests total; 47 new in `services/scan`, 5 new in `packages/lookup`).
- Unit tests with mocked Bedrock cover **every state** in `packages/contracts/fixtures/scan-responses.json` (all 8: FLAGGED_NSQ, FLAGGED_SPURIOUS, VERIFY_NEAR_BATCH, VERIFY_MANUFACTURER_UNKNOWN, VERIFY_LOW_READ_CONFIDENCE, NO_ALERT_FOUND, EXTRACTION_FAILED_MANUAL_ENTRY, NOT_A_MEDICINE_PHOTO) via a table-driven test in `services/scan/src/scans/handler.test.ts` that reconstructs the Bedrock tool-call input each fixture implies and asserts the handler's output matches the fixture's `items`/`results`/`warnings` exactly.
**Remaining:**
- **Real strip/bill photo through `/v1/scans` on `dev-c` is blocked** on T01's Bedrock model access (same blocker as A2/N) - the Bedrock vision model SSM param at `/asli/dev-shared/bedrock/visionModelId` is still `PLACEHOLDER_PENDING_T01`. Everything up to that boundary (S3 fetch, tool-call construction, Zod validation/retry, post-processing, matching, bill deletion) is real code, unit-tested against every fixture state, and deployed - only the actual Bedrock InvokeModel call is unverified against a live model. Once T01's blocker clears: `aws ssm put-parameter` the real model id (no redeploy needed, see Gotchas) and re-test with a real strip photo.
- p95 scan latency: **not measured** - can't be, without a working Bedrock call to time end to end. `ScanLatencyMs` metric emission itself is implemented and unit-tested.
- Manufacturer aliases (`alias-map.ts`) and brand candidates (`brand-candidates.ts`) query the real `Reference` table, but `dev-shared` doesn't currently have any `MFR#`/`ALIAS#` or `BRAND#` rows seeded (T02's seed script only loads `flagged-batches`/`cabinets`/`stats`) - not a bug in this lane, just means those code paths return empty results until someone seeds Reference data.
**Gotchas / decisions:**
- **`decide()` (lane B) already builds the entire `CheckItemResult`**, including `AlertSummary` construction, SPURIOUS-first sorting, and `guidanceKey` selection - this lane's whole matching-pipeline job collapsed to "fetch candidates + checkedAgainst, call `decide()`" (`check-item.ts`). The one place this lane calls `classifyMatch` directly (not through `decide`) is purely to count batch-collisions for the `BatchCollisionIgnored` metric, since `decide()`'s return value doesn't expose per-candidate collision info.
- **`POST /v1/uploads` uses a presigned POST, not a presigned PUT**, despite docs/SCANNING.md/API.md saying "PUT" - a presigned PUT (query-string SigV4) has no way to carry a `content-length-range` condition, so the "5 MB" requirement is only enforceable with `@aws-sdk/s3-presigned-post`. `CreateUploadResponse.fields` (already optional in the frozen contract) carries the POST policy fields the client must submit alongside the file. **D2 needs to know this**: submit a multipart form (`fields` + file field) to `url`, not a raw `PUT` with a binary body.
- **Bedrock model id is read from SSM at Lambda *runtime* (`ssm:GetParameter`, 5-min cache), not imported as a synth-time CDK value** - T02's Handoff explicitly says ops should be able to swap the model id via `aws ssm put-parameter` without a redeploy, but a CDK SSM dynamic reference (`importParam`) only re-resolves on a stack *update*, not continuously. `services/scan/src/scans/model-id.ts` does the real runtime fetch instead.
- **`EXTRACTION_FAILED` reconciliation**: docs/SCANNING.md's prose ("retry once, then return EXTRACTION_FAILED") reads like an HTTP error, but `packages/contracts/fixtures/scan-responses.json`'s `EXTRACTION_FAILED_MANUAL_ENTRY` state is a normal 200 `ScanResponse` with `items: []`/`results: []`/`warnings: ["NO_BATCH_ON_LINE"]`. Followed the fixture (the frozen contract) as ground truth: retry-exhausted Zod validation failure -> 200 with empty items and a warning (client shows manual entry). The `EXTRACTION_FAILED` `ApiErrorCode` is reserved for the harder failure this lane didn't need to exercise (Bedrock itself unreachable/throttled) - the Lambda would let that exception propagate to `withErrorHandling`'s generic 500 path today; a dedicated `ApiError('EXTRACTION_FAILED', ...)` wrap for that specific case would be a small follow-up, not done here since it's unreachable without live Bedrock access to test against.
- **Brand normalization (`normalizeBrand` in `brand-candidates.ts`) is this lane's own minimal rule** (NFKC, uppercase, alnum-only) - no doc specifies how to normalize a brand/product name for the Reference `BRAND#` key, only how to normalize a manufacturer name. Kept deliberately simple and separate from `@asli/matching`'s manufacturer normalizer (no stopword/address stripping, which doesn't apply to brand names).
- **`packages/lookup`'s stub-then-real sequencing**: committed the working real implementation (not a placeholder stub) within the first 30 minutes as its own commit, since the full implementation was small enough not to need a separate throwaway stub step - matches the task's intent ("commit a typed stub... because F, G2 and N import it") without the extra churn of replacing a stub later.
- **`GetParameter`/Bedrock IAM policy scoped by region, not a literal model ARN** - since the model id is resolved at runtime (see above), the IAM policy on `ScansHandler` can't reference a specific model ARN at synth time. Granted `bedrock:InvokeModel` on `arn:aws:bedrock:<region>::foundation-model/*` and `arn:aws:bedrock:<region>:<account>:inference-profile/*` instead (covers both a direct foundation-model id and a cross-region inference profile, per T01's spike note that the real model id "possibly [needs] an inference profile").
- Windows/Git-Bash gotcha while testing: `aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/..."` failed with a bogus regex-validation error until `MSYS_NO_PATHCONV=1` was set - MSYS's path-translation layer was rewriting the leading `/aws/lambda/...` argument as a Windows path before it reached `aws.exe`. Worth remembering for any other lane testing from Git Bash on Windows.
**Contract change requests:**
- none
**Learning log entries added:** yes
