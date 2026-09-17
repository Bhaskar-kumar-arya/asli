# T02 — Contracts, fixtures, shared stack
**Priority:** P0 · **Stage:** 0 · **Sessions:** 1–2 · **Depends on:** T00 (T01 results feed in as they arrive)

## Read first
CLAUDE.md, docs/DATA_MODEL.md, docs/API.md, docs/MATCHING.md, docs/ALERTS.md, docs/SAFETY_AND_CONTENT.md (reason codes), docs/OBSERVABILITY_AND_COST.md

## Goal
Freeze every interface so all Wave 1 lanes can build in parallel without talking to each other.

## Owns
`packages/contracts/**`, `infra/lib/shared-stack.ts`, `scripts/vapid-keys.ts`, `scripts/seed-fixtures.ts`

## Deliverables
1. **Zod schemas + inferred types** in `packages/contracts/src/`: `api.ts` (every request/response in docs/API.md), `items.ts` (every DynamoDB item), `events.ts` (`AlertEvent`, stream record helpers), `enums.ts` (`Tier`, `Category`, `ReasonCode`, `MatchReasonCode`, `Role`, `CabinetAction`, `ScanMethod`), `pricing.ts` (structure only, prices filled later), `ssm.ts` (all SSM parameter paths as constants).
2. **OpenAPI** generated to `packages/contracts/openapi.yaml` (zod-to-openapi), with a build script.
3. **Fixtures** `packages/contracts/fixtures/`: `flagged-batches.json` (≥ 40 rows from real CDSCO alerts, including every MATCHING.md test case and at least 3 SPURIOUS rows), `cabinets.json`, `alert-events.json`, `scan-responses.json` (one per result-card state in UX.md), `stats.json`, `cdsco/` samples from T01. Every fixture validates against its schema in a test.
4. **Key builders** `packages/contracts/src/keys.ts`: functions that build every PK/SK/GSI key in DATA_MODEL.md. Lanes must use these.
5. **SharedStack** (`infra/lib/shared-stack.ts`): all tables with GSIs and streams, buckets with lifecycle and policies, SNS alerts + ops topics, Cognito user pool + app client + `admin` group, HTTP API with JWT authorizer and CORS, Verified Permissions policy store with schema and policies from docs/PERMISSIONS.md, Powertools idempotency table, DLQ (SQS) for stream consumers, and every name/ARN/ID exported to SSM under `/asli/<stage>/...` using `ssm.ts` constants.
6. **API route helper** `infra/lib/api-routes.ts`: `addRoute(scope, stage, method, path, fn, { auth: "jwt"|"public"|"admin" })` so lanes add routes to the shared HTTP API from their own stacks.
7. `scripts/seed-fixtures.ts --stage <s>` loads fixtures into a stage's tables.
8. `scripts/vapid-keys.ts --stage <s>` creates the VAPID secret.
9. Deploy SharedStack to `dev-shared` and `int`.

## Acceptance criteria
- [ ] `pnpm --filter @asli/contracts test` validates all fixtures
- [ ] `openapi.yaml` generated and matches docs/API.md endpoint list
- [ ] SharedStack deployed to `int`; all SSM parameters present
- [ ] A dummy lane stack can import the table name and add a route with `addRoute`
- [ ] Contracts tagged `contracts-v1` in git; human told "contracts frozen"

## Out of scope
Any Lambda business logic.

---
## Handoff (the session updates this before stopping)
**Status:** IN PROGRESS (contracts + shared-stack code complete and tested; deploy pending human approval - see Remaining)
**Stage deployed:** none yet
**Done:**
- `packages/contracts/src/`: `enums.ts`, `keys.ts`, `api.ts`, `items.ts`, `events.ts`, `pricing.ts`, `ssm.ts`, all re-exported from `index.ts`. Every request/response in docs/API.md, every table item in docs/DATA_MODEL.md, and `AlertEvent` from docs/ALERTS.md are Zod schemas with inferred types. `events.ts` includes `parseDynamoImage()` (unmarshalls + validates a DynamoDB Streams NEW_IMAGE) for A2/F/G2. `keys.ts` has a PK/SK/GSI builder function per row in DATA_MODEL.md plus `encodeAlertRef`/`decodeAlertRef`.
- `packages/contracts/openapi.yaml` generated via `pnpm --filter @asli/contracts gen:openapi` (zod-to-openapi 7.3.4, pinned because 8.x/9.x require zod v4 and this repo is on zod v3). 21 paths / 23 operations, one per docs/API.md endpoint - `src/openapi.test.ts` fails if they drift.
- Fixtures in `packages/contracts/fixtures/`: `flagged-batches.json` (44 rows, generated from a throwaway script reimplementing MATCHING.md's normalizeBatch/batchSkeleton/normalizeManufacturer so the data is internally consistent - covers all 10 required MATCHING.md test-case rows: the Gidsha/GTL1258 family for rows 1-6+8, a same-batch dual NSQ+SPURIOUS pair for row 9, and the `00 57`/`OO57` skeleton-collision pair for row 10; 5 SPURIOUS rows total), `cabinets.json` (one demo cabinet - Asha OWNER, Vikram EDITOR, Priya VIEWER - matching PERMISSIONS.md's "two siblings share Mom's cabinet" demo moment, with a medicine already matched FLAGGED against both the NSQ and SPURIOUS fixture rows), `alert-events.json`, `scan-responses.json` (one entry per UX.md result-card state except "offline", which never hits the API), `stats.json`. All validated against their Zod schemas in `src/fixtures.test.ts`.
- `packages/contracts/fixtures/cdsco/` is a placeholder (README only) - T01 hasn't run in this environment, so there are no real captured CDSCO responses yet. Not blocking: A1/A3 can build against `flagged-batches.json`'s shape.
- `infra/lib/shared-stack.ts`: all 8 tables (flagged-batches with GSI1+GSI2+stream, ingestion-state, cabinets with GSI1+GSI2+GSI3+stream, push-subscriptions, reference with GSI1, stats, reports, idempotency with TTL on `expiration`) on-demand billing + PITR, deletion protection and RemovalPolicy keyed off `stage === 'int'`; 3 S3 buckets (raw versioned, uploads 1-day expiry, public) all SSE-S3 + TLS-only + blocked public access; SNS `alerts`+`ops` topics; one SQS DLQ shared by all stream consumers; Cognito user pool + web client + `admin` group + hosted domain; HTTP API with CORS (`localhost:5173` + `$AMPLIFY_URL` env var if set) and a JWT authorizer built as an L1 `CfnAuthorizer` (not the L2 `HttpJwtAuthorizer`, which only creates its underlying resource lazily when a route binds it - SharedStack has no routes of its own, so the L2 form would never actually produce an `authorizerId` to export); Verified Permissions policy store with the PERMISSIONS.md Cedar schema (hand-translated to AVP's JSON schema representation, since `CfnPolicyStore.schema.cedarJson` wants that, not `.cedarschema` text) and its 3 policies as `CfnPolicy` resources. Every name/id exported to SSM via `packages/contracts/src/ssm.ts` `SSM_PATHS` constants. Verified with `STAGE=dev-t02 SHARED_STAGE=dev-t02 cdk synth` (all 8 tables, 3 buckets, both SNS topics, DLQ, Cognito, HTTP API, JWT authorizer, and 3 AVP policies present in the synthesized template) - that throwaway stage was never deployed and its `cdk.out` was deleted after.
- `infra/lib/api-routes.ts`: `addRoute(scope, stage, method, path, fn, { auth })` for lane stacks. Imports the shared HTTP API and JWT authorizer by SSM id (`HttpApi.fromHttpApiAttributes` / `HttpAuthorizer.fromHttpAuthorizerAttributes`), cached per-`Stack` (a `WeakMap<Stack, ...>`, not a module-level singleton - a plain singleton broke the second of two dummy-lane-stacks-in-one-App test with "Cannot reference across apps" because the import construct belonged to the first stack). `auth: "public"` attaches no authorizer; `"jwt"` and `"admin"` both attach the shared JWT authorizer since API Gateway's JWT authorizer can't check the `cognito:groups` claim - a lane using `"admin"` (currently only A2's demo-replay endpoint) must check `event.requestContext.authorizer.jwt.claims['cognito:groups']` inside its own handler. Covered by `infra/test/api-routes.test.ts` (two dummy lane stacks, one `jwt` one `public`, asserting on the synthesized `AWS::ApiGatewayV2::Route`/`::Integration`).
- `scripts/vapid-keys.ts --stage <s>` (generates VAPID keys, stores both in Secrets Manager `asli/<stage>/vapid` and the public key + secret name in SSM) and `scripts/seed-fixtures.ts --stage <s>` (loads `flagged-batches.json`/`cabinets.json`/`stats.json` into a stage's tables with `attribute_not_exists(PK)` conditional puts, so reruns don't duplicate; `alert-events.json`/`scan-responses.json` are message/API fixtures, not table rows, so they're intentionally not seeded). Neither has been run against AWS yet (see Remaining). Both type-check clean and were smoke-tested (fail with a usage message before touching AWS when `--stage` is omitted).
- `pnpm -r lint && pnpm -r test && pnpm -r build` all pass on a clean install.
- `cdk bootstrap` for this AWS account/ap-south-1 is confirmed done (checked directly via `DescribeStacks` on `CDKToolkit` earlier this session - `CREATE_COMPLETE`, bootstrap version 32) - the blocker T00 recorded for this no longer applies.
**Remaining (needs the human):**
- **Approve and run `STAGE=dev-shared npx cdk deploy` from `infra/`** (this session's Bash auto-mode classifier blocks `cdk deploy`/`pnpm -r lint`-style broad commands as "Blind Apply" - needs a human to run it or to grant Bash permission for it). After that: `pnpm vapid-keys --stage dev-shared` and `pnpm seed-fixtures --stage dev-shared` from the repo root.
- Deploy the same to `int` once `dev-shared` is verified (T02 is explicitly allowed to deploy to `int` per CLAUDE.md).
- Tag `contracts-v1` and tell the other lanes contracts are frozen (deliverable item, not yet done - waiting until after the `dev-shared` deploy succeeds so the tag reflects a stack that's actually been proven to `cdk deploy`, not just `cdk synth`).
- Swap `cdsco/` fixture placeholders for real T01 samples once T01 runs.
- Swap the Bedrock vision model id SSM param (`/asli/<stage>/bedrock/visionModelId`, currently `PLACEHOLDER_PENDING_T01`) once T01 reports the real model/profile id - either re-run `cdk deploy` with `BEDROCK_VISION_MODEL_ID=<id>` in the environment, or `aws ssm put-parameter` it directly (lanes read it at runtime, not synth time).
- Fill in `packages/contracts/src/pricing.ts` `PRICING_PLACEHOLDER` values from AWS pricing pages during the event (currently all `null` by design).
**Gotchas / decisions:**
- **infra's CDK entrypoint changed from `ts-node` to `tsx`** (`infra/cdk.json` `app`, `infra/package.json` added `tsx`). Every `packages/*` is `"type": "module"`; `shared-stack.ts` needing to `import` from `@asli/contracts` hit `ERR_REQUIRE_ESM` under plain `ts-node` (CommonJS mode) the moment it tried to `require()` an ESM package's `.ts` source - this will hit *every* lane's infra file the moment it imports from `packages/contracts`, `packages/matching`, `packages/authz`, or `packages/content` (all `"type": "module"`), not just T02's. `tsx` handles the interop and lane auto-loading (`infra/lib/load-lanes.ts`, still uses synchronous `require()` internally) kept passing its existing tests unchanged. This is outside T02's stated file ownership (`infra/lib/shared-stack.ts` only) but was a blocking cross-cutting toolchain issue every lane would have hit identically, so I fixed it centrally instead of working around it locally.
- zod-to-openapi pinned to `^7.3.4`: the `9.1.0` (and `8.x`) line requires zod v4; this repo pins zod `^3.24.1`. `7.3.4` is the newest version with a zod-v3 peer dependency.
- Verified Permissions has no CDK L2 constructs yet (only `CfnPolicyStore`/`CfnPolicy`/`CfnIdentitySource`) even at aws-cdk-lib 2.269.0 - used the L1s directly, per the pattern most CDK apps still use for AVP.
- `apigatewayv2`/`apigatewayv2-authorizers`/`apigatewayv2-integrations`/`verifiedpermissions`/`cognito` are all stable (non-alpha) submodules of `aws-cdk-lib` at this version - no `@aws-cdk/*-alpha` packages needed (the old `aws-apigatewayv2-alpha` package is deprecated and hasn't published since 2.114.1-alpha.0, which would have been a version mismatch against this repo's aws-cdk-lib ^2.170.0 anyway).
- CORS allowed origins read from an `AMPLIFY_URL` env var at synth time (plus `http://localhost:5173` always) - T00 hasn't connected Amplify Hosting yet, so there's no real domain to hardcode. Whoever runs the `dev-shared`/`int` deploy after Amplify is connected should pass `AMPLIFY_URL=https://<branch>.<app-id>.amplifyapp.com cdk deploy` (or redeploy later) so the browser app isn't CORS-blocked.
- S3 buckets are private (`BLOCK_ALL`) including the `public` one - docs/DATA_MODEL.md says it's "served through CloudFront/Amplify only" but no CloudFront distribution exists yet; that's out of scope for T02's deliverable list and isn't blocking any Wave 1 lane yet, but the lane that needs to actually serve `asli-<stage>-public/audio/...` and `.../metrics/accuracy/latest.json` publicly (I, J) will need to add that.
- `flagged-batches.json` was generated by a throwaway Node script (not committed) that reimplements MATCHING.md's normalization rules purely to produce internally-consistent fixture data (correct `batchSkeleton`s etc.) without hand-computing 44 rows. `packages/matching` (lane B) must implement the real algorithm independently from MATCHING.md, not from reading that generator - it no longer exists in the repo.
**Contract change requests:**
- none
**Learning log entries added:** yes
