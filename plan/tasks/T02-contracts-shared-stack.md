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
