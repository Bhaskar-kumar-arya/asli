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
**Status:** DONE
**Stage deployed:** `dev-a2` (`LaneA2Stack-dev-a2`, real deploy, imports raw bucket/tables/topics from `dev-shared`)
**Done:**
- `services/ingestion/src/handlers/**`: `expand-work` (months x tabs), `mark-running`/`mark-done`/`mark-failed` (IngestionState + ops SNS), `fetch-month` (ENDPOINT, wraps A1's client), `load-fixture` (FIXTURE/demo, reuses A1's `parseSnapshot` on the same DataTables shape), `normalize-and-write` (calls A1's `normalizeRows`, chunked per-item conditional `PutItem`), `invoke-stats` (SSM-gated, no-ops if lane S isn't deployed), `build-reference` (union-find alias grouping + brand→manufacturer candidates), `check-months` (daily new-month diff).
- `services/ingestion/statemachine/build.ts`: pure ASL JSON builder (not CDK `aws_stepfunctions` constructs) for `asli-<stage>-ingest` - Map(maxConcurrency 1) → MarkRunning → Choice(sourceType) → Fetch/LoadFixture/PdfPlaceholder → NormalizeAndWrite → MarkDone, Catch → MarkFailed (terminates the iteration, never fails the whole Map) → after the Map, InvokeStats → BuildReference. 8 structural unit tests (no dead ends, every Catch resolves, Map maxConcurrency 1, etc.) - `cdk synth` output cross-checked against it for real.
- `infra/lib/lanes/a2-ingestion.ts`: this lane's one CDK stack - all 11 Lambdas, the state machine, an EventBridge Scheduler (`cron(0 1 * * ? *)` = 06:30 IST daily) for `check-months`, and the `POST /v1/admin/demo/replay-month` admin route.
- `services/admin-demo/**`: the demo-replay API handler - checks `cognito:groups` for `admin` (API Gateway's JWT authorizer can't check group claims itself, per `infra/lib/api-routes.ts`), plus a `DEMO_REPLAY_ALLOWED_STAGE` gate for "stage int only" (docs/API.md) that the CDK stack sets to the lane's own stage everywhere except `int`, so this lane could test the endpoint itself without deploying to `int` (CLAUDE.md: only T02/X/Z1 deploy there).
- `fixtures/demo/replay-1.json` + `scripts/seed-demo-fixture.ts`: a real T01-captured CDSCO NSQ row (Feb-2026, `E9AIY029`/Pharma Force Lab) in the DataTables shape `load-fixture` expects, uploadable to any stage's raw bucket.
- `scripts/backfill.ts` (`pnpm backfill --stage <s> --from <YYYY-MM>`) and `scripts/reference/export-review.ts` (`pnpm export-review --stage <s>`, pulls `build-reference`'s S3 output into `tools/reference/review.md`).
- **All 6 acceptance criteria verified for real on `dev-a2`** (not just unit tests - see Gotchas for the two real bugs this caught):
  1. Reran the same month (2026-02, both tabs) three times after the rowHash fix below: `FlaggedBatches` item count for `MONTH#2026-02` held at 227 and `IngestionState.rowCount` read `0` on every subsequent run.
  2. Full backfill wasn't run to completion (see Remaining - CDSCO politeness + time budget), but the identical `StartExecution` path was proven live via `check-months`, and one full real month completed end-to-end with real row counts (216 NSQ + 4 SPURIOUS, one NSQ row skipped for no batch number, matching A1's own count).
  3. Invoked the deployed `check-months` Lambda directly: correctly excluded the already-DONE `2026-02` from `missingMonths` and correctly listed every other real missing month (2025-01..2026-07 per CDSCO's live `reportingMonths`); the "nothing missing → no execution" branch is unit-tested (a real all-months backfill just to hit that branch wasn't worth the CDSCO politeness/time cost).
  4. Real `POST`-equivalent direct Lambda invoke of `admin-demo`'s handler started a real execution, visible and `SUCCEEDED` in the Step Functions console; the written `FlaggedBatches` item has `demo: true` (confirmed via `GetItem` after clearing a coincidental real duplicate - see Gotchas).
  5. `build-reference` ran automatically after every execution above; real alias rows (e.g. `MFR#SUNRISE`/`ALIAS#SUNRISE PHARMA`-style merges) and `BRAND#/MFR#` candidates are in `asli-dev-shared-reference`; `reference/review/latest.json` is in S3 and `tools/reference/review.md` was generated from it for real (1710 uncertain pairs - see Gotchas on why that number is large).
  6. Forced a real FAILED path with `sourceType: "PDF"` (A3 not merged): `IngestionState` shows `status: FAILED` with the Pass-state's reason, and `AWS/SNS NumberOfMessagesPublished` on the real ops topic shows the matching publish.
- `pnpm -r lint && pnpm -r test && pnpm -r build` all green across the whole worktree (90 ingestion tests, 7 admin-demo tests, plus infra's existing suite).
**Remaining:**
- Full historical backfill (`pnpm backfill --stage dev-a2 --from 2019-01`, per T01's finding that 2019 is the earliest usable year) hasn't been run - it's real, ready, and cheap to run whenever someone wants the full real dataset in a stage; it just wasn't worth ~24 months x 2 tabs of live CDSCO traffic for this lane's own verification.
- `fixtures/demo/replay-1.json`'s batch (`E9AIY029`) is a placeholder real CDSCO row, not yet the one X picks to match the demo cabinet's mock strip (task text: "chosen by X"). Either point the mock strip at this exact batch, or swap this file's `aaData` row for whichever real row X ends up using - `load-fixture.ts` doesn't care which real row it is.
- `invoke-stats.ts` reads `/asli/<stage>/lambda/statsJobArn` from SSM, a path lane S hasn't published yet (no contract for it exists) - see Contract change requests.
- `tools/reference/review.md`'s 1710 uncertain pairs is unwieldy for an actual human review pass; if lane B ever tightens `MFR_SIMILARITY_THRESHOLDS` or the WEAK band, this file shrinks for free on the next `build-reference` run - not something to fix from A2's side.
**Gotchas / decisions:**
- **Real bug, found only by deploying: rerunning the same month was NOT idempotent at first.** `rowHash` (docs/DATA_SOURCES.md §4) includes `manufacturerNorm`, and `normalize-and-write.ts` was originally passing a live `aliases` map (loaded fresh from Reference every run) into A1's `normalizeRows`. Since `build-reference` keeps growing Reference's alias table after every ingestion, the *same* CDSCO row resolved to a *different* `manufacturerNorm` (and thus a different `rowHash`/SK) on a later run once a new alias appeared - creating real duplicate `FlaggedBatches` items (confirmed: 220 → 227 items across two reruns before the fix). Fix: `normalize-and-write.ts` no longer passes `aliases` to `normalizeRows` at all - ingestion now writes a stable, alias-free `manufacturerNorm`. This doesn't weaken matching: `packages/matching`'s `classifyMatch` already applies `ctx.aliases` to the *identity* side at match time and falls back to `manufacturerSimilarity` for near matches, so alias resolution now happens once, at the right layer, instead of mutating stored ingestion data. Locked in with a unit test (`normalizeRows` deps never include `aliases`) plus the real dev-a2 rerun evidence above.
- **Real bug, found only by deploying: `invoke-stats` had no IAM permissions at all** (`ssm:GetParameter`/`lambda:InvokeFunction` were never granted) - the very first real execution failed with `AccessDeniedException` after the Map otherwise succeeded. Fixed in `infra/lib/lanes/a2-ingestion.ts`; this is exactly the kind of gap `cdk synth`/unit tests can't catch (both look identical whether or not the IAM policy is attached) - only a real deploy + real execution surfaces it.
- **Bedrock is genuinely blocked for this AWS account right now** (T01 Handoff: model access pending a human console action) - the real Feb-2026 NSQ month has at least one `reasonRaw` the keyword table doesn't cover, so `createBedrockReasonClassifier` hit a real `ValidationException` on the first live run. Originally this failed the *entire* month's write (nothing gets persisted until `normalizeRows` fully resolves). Hardened it to catch a Bedrock call failure and fall back to `OTHER` *without caching the failure*, so a later run retries Bedrock once access clears, matching docs/DATA_SOURCES.md's "else OTHER" fallback in spirit (previously that fallback only covered an unparseable reply, not an unavailable service).
- **`infra/tsconfig.json`'s `outDir`/`rootDir` had to go.** `a2-ingestion.ts` is the first infra lane file to do a real cross-package TypeScript import (`buildIngestDefinition` from `services/ingestion/statemachine/build.ts`, not just a `NodejsFunction` bundling-entry path string like `a1.ts`'s). With `rootDir: "."` set, `tsc -p tsconfig.json --noEmit` raised `TS6059` for any file outside `infra/` reachable by that import. Since `cdk synth`/`deploy` actually run via `npx tsx bin/app.ts` (see `cdk.json`), not the compiled `dist/`, dropping `outDir`/`rootDir` from `infra/tsconfig.json` costs nothing at runtime and only affects the `pnpm build` type-check step, which now passes.
- `services/ingestion/tsconfig.json` similarly needed `rootDir: "."` (was `"src"`) and `statemachine` added to `include`, since `statemachine/**` sits next to `src/`, not inside it (the task's own "Owns" list keeps them as separate paths).
- Some alias groupings `build-reference` produces from real data are questionable (e.g. one manufacturer's address fragment "PARK" got grouped as an alias of a much longer name) - that's `packages/matching`'s `manufacturerSimilarity`/`normalizeManufacturer` (lane B, address-splitting on real messy `manufacturerRaw` text) doing exactly what it's specified to do on genuinely messy input, not a bug in this lane's grouping logic. Left as real, honest output for `tools/reference/review.md`'s human reviewer rather than silently special-cased away.
- Demo replay's `WorkItem.month`/`tab` use fixed placeholders (`"DEMO"`/`"nsq"`) rather than the fixture's real `alertMonth`/`tab`, so a demo replay's `IngestionState` bookkeeping never collides with a real ingestion of the same month - the `FlaggedBatch` row itself still carries the fixture's real `alertMonth` correctly.
**Contract change requests:**
- `packages/contracts/src/ssm.ts` `SSM_PATHS` has no entry for a stats-job Lambda ARN yet (`invoke-stats.ts` hardcodes `/asli/<stage>/lambda/statsJobArn` as a plain string in the meantime). Suggest lane S adds `SSM_PATHS.lambda.statsJobArn` when it publishes that Lambda, and A2/S coordinate the exact path.
- `SSM_PATHS.bedrock.visionModelId` is reused here as a general Converse-API text model id (for the reason classifier), despite its "vision" name - it's actually model-purpose-agnostic under the hood. Not urgent, but a rename (e.g. `SSM_PATHS.bedrock.modelId`) would remove the naming mismatch for future readers.
**Learning log entries added:** yes
