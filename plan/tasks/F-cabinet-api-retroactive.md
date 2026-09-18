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
- Real `cdk deploy STAGE=dev-f` (blocked in this session, needs human to run/approve - see Status).
- After deploy: seed `dev-f` with a matching FlaggedBatches row and smoke-test "adding a medicine matching a seeded row creates a MATCH and publishes one SNS message; re-processing the same stream record publishes nothing" end-to-end on real infra (the equivalent logic is covered by `check.test.ts` against fakes, but the acceptance criterion asks for a real `dev-f` run).
- Manually verify "PENDING → final tier within 10 s" against the real deployed stream consumer's latency.
- Swap `services/cabinet/src/authz.ts`'s local stub for `@asli/authz` once lane H merges the real Verified Permissions-backed package (interface is identical, so this should be a one-line import change plus deleting the local stub).
**Gotchas / decisions:**
- `MatchContext.aliases` (manufacturer alias map from the Reference table) is intentionally not fetched/passed in this lane - it's optional in `@asli/matching`'s `MatchContext`, and `normalizeManufacturer` already handles the common cases on its own. Revisit if manufacturer-alias false negatives show up in testing.
- `checkedAgainst()` (docs/ALERTS.md `monthCount`/`latestMonth`) is computed by a full `Scan` of IngestionState filtered to `status = DONE`, not a maintained aggregate - that table only grows one row per month per tab, so a scan is cheap and avoids needing S (stats job, not built yet) as a dependency.
- Split `packages/matching`-consuming repo access into two interfaces, `CabinetRepo` (Cabinets table CRUD) and `MatchLookupRepo` (read-only FlaggedBatches/IngestionState lookups for the retroactive check), instead of one repo needing all four table names - cleaner DI for handlers that only touch the Cabinets table.
- Followed `services/ingestion`'s existing test pattern: dependency-injected fake clients (`vi.fn` on `.send`) rather than `aws-sdk-client-mock`, for consistency with A1's lane.
**Contract change requests:**
- none
**Learning log entries added:** yes
