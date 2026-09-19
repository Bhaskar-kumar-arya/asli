# F — Cabinet API and retroactive check
**Priority:** P0 · **Wave 1** · **Sessions:** 1–2 · **Depends on:** T02 (B, lookup and authz stubs OK)

## Read first
CLAUDE.md, docs/DATA_MODEL.md (Cabinets), docs/API.md (cabinets), docs/ALERTS.md (Retroactive check), docs/PERMISSIONS.md (authz interface)

## Goal
Families save medicines once, and every saved medicine is immediately checked against the full CDSCO history.

## Owns
`services/cabinet/**`, `infra/lib/lanes/f-cabinet.ts`

## Deliverables
1. Handlers: `GET/POST /v1/cabinets`, `GET /v1/cabinets/{id}`, `POST /v1/cabinets/{id}/medicines`, `DELETE /v1/cabinets/{id}/medicines/{medId}`. Creating a cabinet creates the OWNER member. Authorization via `createAuthz` (stub mode until H merges; mode from SSM).
2. On first sign-in (lazy, on `GET /v1/cabinets` returning empty), create a default cabinet "My family".
3. Stream consumer on Cabinets (filter: INSERT with SK begins_with `MED#`): `findCandidates` → `decide` → update MED `latestTier`/`lastCheckedAt` → conditional put MATCH items → publish `AlertEvent` (trigger RETROACTIVE) for new FLAGGED/VERIFY matches. Event source mapping with filter criteria, bisect on error, DLQ.
4. Delete medicine also deletes its MATCH items.
5. Metrics per docs.

## Acceptance criteria
- [ ] Unit tests for handlers and stream consumer with fixtures
- [ ] On `dev-f` (seeded): adding a medicine matching a seeded row creates a MATCH and publishes one SNS message; re-processing the same stream record publishes nothing
- [ ] VIEWER gets 403 on add/remove
- [ ] PENDING → final tier within 10 s

## Out of scope
Invites and member management (H), senders (G1).

---
## Handoff (the session updates this before stopping)
**Status:** IN PROGRESS (code + tests done, not yet deployed)
**Stage deployed:** none yet - `cdk synth LaneFStack-dev-f` succeeds cleanly; a real `cdk deploy` was blocked by the session's auto-mode classifier (infra changes need explicit human go-ahead) and is queued for the human to run or approve.
**Done:**
- `services/cabinet/**`: handlers for `GET/POST /v1/cabinets`, `GET /v1/cabinets/{cabinetId}`, `POST /v1/cabinets/{cabinetId}/medicines`, `DELETE /v1/cabinets/{cabinetId}/medicines/{medId}`.
- Lazy default-cabinet ("My family") creation on first `GET /v1/cabinets` with no memberships.
- Local `createAuthz({ mode: 'stub', lookupRole })` in `services/cabinet/src/authz.ts` implementing docs/PERMISSIONS.md's role table and the stable `Authz` interface - not editing `packages/authz` (H's placeholder), swap the import once H merges the real package (same call signature).
- Retroactive check (`services/cabinet/src/check.ts` + `src/stream/retroactive-check.ts`): Cabinets DynamoDB Streams consumer filtered to `INSERT` + `SK begins_with MED#`, queries FlaggedBatches by exact batch and GSI1 skeleton, calls `@asli/matching` `classifyMatch`/`decide`, updates the medicine's `latestTier`/`lastCheckedAt`, conditional-puts MATCH items (`attribute_not_exists`), publishes one `AlertEvent` to SNS per newly created MATCH.
- Delete-medicine also deletes the medicine's MATCH items first.
- Idempotency for POST handlers (`src/idempotency.ts`) via Powertools `makeIdempotent` keyed on an optional `Idempotency-Key` header (`throwOnNoIdempotencyKey: false`, so requests without it still work, just without dedup).
- Metrics per docs/OBSERVABILITY_AND_COST.md: `CheckTier` (dim tier), `MatchesCreated` (dim trigger, tier), `BatchCollisionIgnored`.
- `infra/lib/lanes/f-cabinet.ts`: imports Cabinets/FlaggedBatches/IngestionState/Idempotency tables, the alerts SNS topic, the shared DLQ and the shared HTTP API from SharedStack via SSM; wires the 5 routes (JWT auth) and the stream consumer's `DynamoEventSource` (batch 100, bisect on error, 3 retries, DLQ, filter criteria on INSERT + MED# prefix).
- Unit tests (34, Vitest): `authz.test.ts` (all 15 role/action combinations from docs/PERMISSIONS.md + deny-by-default on lookup failure), `check.test.ts` (new FLAGGED match publishes one AlertEvent; idempotent re-run publishes nothing new; NO_ALERT_FOUND publishes nothing), handler tests for all 5 endpoints including VIEWER 403 on add/remove, `stream/retroactive-check.test.ts` (dispatches per INSERT record, ignores non-INSERT).
- `pnpm -r lint && pnpm -r build && pnpm -r test` all green repo-wide.
- `cdk synth LaneFStack-dev-f` verified clean (SSM imports for `dev-shared` resolve as CFN dynamic references, no AWS calls needed at synth time).
**Remaining:**
- `LaneFStack-int` is deployed and live (superseded the earlier "blocked" status above from a prior session).
- Swap `services/cabinet/src/authz.ts`'s local stub for `@asli/authz` once lane H merges the real Verified Permissions-backed package (interface is identical, so this should be a one-line import change plus deleting the local stub).

**Addendum (2026-09-19, follow-up session): real `GET /v1/cabinets` 500 found and fixed - a real CDK/IAM gap, not an app bug.**
While smoke-testing the live site with a real signed-in browser session, `GET /v1/cabinets` (list-cabinets.ts, called by `HomeMedicineList`) 500'd with a generic `{"code":"INTERNAL"}` body. `GET /v1/cabinets/{id}` (get-cabinet.ts) worked fine against the same real data, so this wasn't an auth/CORS issue (both fixed earlier in this session) - it was specific to `listMembershipsForUser`'s `GSI1` query. Root cause: `infra/lib/lanes/f-cabinet.ts` imports `cabinetsTable` via `dynamodb.Table.fromTableAttributes(...)` but never passed `globalIndexes: [...]` - and CDK's `grantReadWriteData()` only includes a table's GSI ARNs in the resulting IAM policy when the imported `Table` construct actually knows about them. Without it, the generated policy's `Resource` was just the base table ARN, so `dynamodb:Query` against `GSI1` (a different IAM resource ARN, `.../table/<name>/index/GSI1`) was denied - confirmed directly via `aws iam get-role-policy` on `ListCabinetsHandler`'s role (only the base table ARN was listed) and by running the exact same `Query` against `GSI1` with my own credentials (worked fine, proving the data/index were correct and this was purely a permissions gap). The fix pattern already existed 6 lines below in the same file, with a comment explaining it, for `flaggedBatchesTable` - it just hadn't been applied to `cabinetsTable`. Fixed by adding `globalIndexes: ['GSI1', 'GSI2', 'GSI3']` to `cabinetsTable`'s `fromTableAttributes` call; `cdk diff` showed a clean, purely-additive IAM policy change (adds `/index/*` to the `Resource` list) across every Lambda that calls `cabinetsTable.grantReadWriteData()` (`ListCabinetsHandler`, `CreateCabinetHandler`, `GetCabinetHandler`, `AddMedicineHandler`, `DeleteMedicineHandler`, `RetroactiveCheckHandler`). Deployed `LaneFStack-int`; verified fixed for real - the identical live browser session that had just gotten a 500 got a 200 and rendered the real medicines list immediately after. `pnpm --filter infra lint/test` green. Full writeup (with the other 4 bugs found in the same live-testing pass) in `submission/LEARNING_LOG.md`'s 2026-09-19 entry.
**Gotchas / decisions:**
- `MatchContext.aliases` (manufacturer alias map from the Reference table) is intentionally not fetched/passed in this lane - it's optional in `@asli/matching`'s `MatchContext`, and `normalizeManufacturer` already handles the common cases on its own. Revisit if manufacturer-alias false negatives show up in testing.
- `checkedAgainst()` (docs/ALERTS.md `monthCount`/`latestMonth`) is computed by a full `Scan` of IngestionState filtered to `status = DONE`, not a maintained aggregate - that table only grows one row per month per tab, so a scan is cheap and avoids needing S (stats job, not built yet) as a dependency.
- Split `packages/matching`-consuming repo access into two interfaces, `CabinetRepo` (Cabinets table CRUD) and `MatchLookupRepo` (read-only FlaggedBatches/IngestionState lookups for the retroactive check), instead of one repo needing all four table names - cleaner DI for handlers that only touch the Cabinets table.
- Followed `services/ingestion`'s existing test pattern: dependency-injected fake clients (`vi.fn` on `.send`) rather than `aws-sdk-client-mock`, for consistency with A1's lane.
**Contract change requests:**
- none
**Learning log entries added:** yes
