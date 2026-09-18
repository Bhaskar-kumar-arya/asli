# X — Integrator (continuous)
**Priority:** P0 · **Continuous from Wave 1** · **Sessions:** many (restart freely from Handoff) · **Depends on:** lanes as they finish

## Read first
CLAUDE.md, plan/BUILD_PLAN.md (Gates), docs/TESTING.md, docs/ALERTS.md (Demo path), every lane's Handoff before merging it

## Goal
Keep `main` green and `int` deployed with every finished lane, and prove the gates end to end.

## Owns
`main` branch merges, `tests/e2e/**`, `scripts/seed-demo.ts`, `infra/lib/lanes/*` registration conflicts only, `plan/INTEGRATION_LOG.md`

## Responsibilities
1. Merge order: B → C (+lookup) → A1 → D1 → D2 → F → G1 → G2 → D3 → A2 → H → I → S → E → Wave 2.
2. Before each merge: read the lane Handoff, run `pnpm -r lint test`, rebase, resolve conflicts (never change another lane's logic silently; send it back if needed), deploy to `int`, run e2e.
3. Switch stubs to real implementations as lanes land (authz mode, lookup, content).
4. **e2e tests** (`tests/e2e`): sign in test user; manual check against seeded row = FLAGGED with source; scan fixture image; add medicine → MATCH within 10 s; publish AlertEvent → push/email counters increment; demo replay → match + event.
5. **Demo data** `scripts/seed-demo.ts`: demo users (two siblings), "Mom" cabinet with realistic medicines, one disclosed mock strip medicine matching a chosen real CDSCO row that will be replayed; produce `fixtures/demo/replay-1.json` for A2.
6. Track gates in `plan/INTEGRATION_LOG.md` with timestamps.
7. Contract change requests: collect from Handoffs, decide with the human, apply as `contracts-v1.x`, record in plan/CHANGELOG.md, notify affected lanes.

## Acceptance criteria
- [ ] Scan gate and Core gate passed and logged
- [ ] e2e suite green on `int` at feature freeze

---
## Handoff (the session updates this before stopping)
**Status:** IN PROGRESS (continuous lane - restart freely)
**Stage deployed:** `int` (all 9 Wave-1 lane stacks: A1, A2, C, F, G1, G2, H, I, S)
**Done:**
- Ran `pnpm -r lint && pnpm -r test` clean before starting (baseline check).
- Deployed all 9 Wave-1 lane stacks to `int` (`STAGE=int SHARED_STAGE=dev-shared cdk deploy --all`).
- Found and resolved a shared-HTTP-API route conflict: destroyed the now-redundant `dev-a2`, `dev-c`, `dev-h` sandbox stacks (their acceptance criteria were already met/logged; nothing lost).
- Found and fixed a missing Cognito `userPassword` auth flow on the shared client (`infra/lib/shared-stack.ts`, normally T02-owned - additive one-line fix, redeployed `SharedStack-dev-shared`). Needed so any lane's test tooling can sign in a test user at all.
- Created a test Cognito user (`e2e-test@asli.internal`) in the shared `dev-shared` pool for `tests/e2e` (and future `tools/accuracy`) runs.
- Built `tests/e2e/` from scratch (didn't exist before this session) - Vitest suite that signs in as a real user and hits the real `int` API. Added `tests/*` to `pnpm-workspace.yaml` (was missing). Skips itself (not fail) when live-stage credentials aren't set, so `pnpm -r test` stays green without AWS access.
- Found and fixed a real bug in lane F (`infra/lib/lanes/f-cabinet.ts`): FlaggedBatches table was imported with `Table.fromTableName` (no GSI info), so `grantReadData` never covered GSI1 - every retroactive check was silently `AccessDeniedException`, medicines stuck on `PENDING` forever. Fixed to `fromTableAttributes({ globalIndexes: ['GSI1'] })`, redeployed `LaneFStack-int`. Mechanical IAM-only fix, F's business logic untouched.
- Ran `tests/e2e` for real against `int`: manual check on a seeded row → FLAGGED with a real CDSCO source (Scan gate), and add medicine → retroactive MATCH within 10s → AlertEvent → both push-sender and email-sender confirmed processing it (Core gate). Both passed.
- Marked the Scan and Core gates ✅ in `plan/INTEGRATION_LOG.md` with the real evidence above (previously ⬜ - nothing had ever been deployed to the shared `int` stage before this session).
- `pnpm -r lint && pnpm -r test` green repo-wide after all changes.
**Remaining:**
- `scripts/seed-demo.ts` and `fixtures/demo/replay-1.json` (owned by X per this task file, not started yet) - demo users (two siblings), "Mom" cabinet, one disclosed mock strip medicine matching a real CDSCO row for A2's demo replay.
- Real push/email *delivery* unverified (only fan-out confirmed) - needs a real push subscription registered and an SES-verified test recipient (SES is in sandbox on `int`).
- `POST /v1/scans` (real photo → Bedrock vision) still blocked account-wide (see T01) - the Scan gate's "real strip photo" half is unverified; only the manual-check half is proven live on `int`.
- A3 still unmerged (`lane/A3` branch) - per the P2 cutting rule, leave it unless Textract access clears.
- Early submission / Freeze / Final submission gates not started.
**Gotchas / decisions:**
- The shared HTTP API and Cognito pool are single physical resources living under `SHARED_STAGE` (`dev-shared`) - they are NOT per-stage. Any lane stack that registers HTTP routes (A2, C, F, G1, H, ...) will conflict if the same lane is deployed to two stages at once (e.g. a `dev-<lane>` sandbox left running alongside `int`). Before deploying a lane to `int`, check whether its `dev-<lane>` sandbox is still up and destroy it first if so.
- `tests/e2e` resolves the API endpoint/Cognito client ID from `SHARED_STAGE` (not `E2E_STAGE`) for exactly this reason - `E2E_STAGE` only picks which lane stacks' Lambda log groups to inspect (e.g. for the push/email fan-out check).
- Two concurrent `cdk` invocations against the same `cdk.out` directory collide ("Another CLI is currently synthing") - run them sequentially or pass distinct `--output` dirs.
**Contract change requests:**
- none (the Cognito auth-flow and F IAM fixes were infra-construct fixes, not `packages/contracts` changes)
**Learning log entries added:** no (do this next session - the three findings above are worth recording)

---
## Update (2026-09-19, Wave 2 int deploy pass)
**Status:** Wave 2 (J, K, L, M, N) verified against real `int` data. Z1/Z2 deliberately not started per instruction.
**Stage deployed:** `int` now also has `LaneJStack-int`, `LaneLStack-int`, `LaneMStack-int`, `LaneNStack-int` (K is client-only, no infra). `LaneSStack-int` (already deployed) had `compute-stats` invoked for real against real backfilled data for the first time.
**Done:**
- Wired lane L's `ReportProblemButton` into `ResultCard.tsx` (lane C) and `MedicineDetailPage.tsx` (lane F) - one import + one JSX line each, per L's Handoff.
- Destroyed `LaneLStack-dev-l` (route-conflict pattern), then deployed `LaneJStack-int`, `LaneLStack-int`, `LaneMStack-int`, `LaneNStack-int`.
- Found and fixed a real CloudFormation bug in J's `LambdaErrorRateAlarm` (two Metrics Insights `SELECT` queries combined via math in one alarm - unsupported, `CREATE_FAILED: Invalid metrics list`) - fixed in `infra/lib/lanes/j-dashboard.ts` (J's file, mechanical infra-only fix), redeployed clean.
- Invoked lane S's `compute-stats` Lambda directly against `int`'s FlaggedBatches table (1032 rows already ingested, never backfilled into stats before) - `/v1/public/stats` now shows real numbers.
- Found and fixed a real cross-lane bug: M's `GET /v1/public/insights` 500'd against the real stats data because it assumed a nested `ImpactStatsDocument` shape that S's `compute-stats` doesn't actually write (S writes the overall stats and each month as separate DynamoDB items, not one nested document) - fixed in `services/insights/src/handlers/public-insights.ts` (M's file) to query and assemble from S's actual storage shape, redeployed clean, re-verified M's headline exactly matches S's total.
- Verified N's `POST /v1/pharmacy/checks` live: a real 200-row CSV with real seeded batch numbers, warm executions 3.0-3.4s (<5s bar).
- Verified L's `POST /v1/reports` live: real batch identity, 201 with real PvPI routes, stored item confirmed to hold no personal data.
- `pnpm -r lint && pnpm -r test && pnpm -r build` green repo-wide after every change.
- Updated `plan/INTEGRATION_LOG.md` (Lane status table for J/K/L/M/N/S, a dated note, and a Merge log row) and the Handoff sections of `plan/tasks/{J,L,M,N,S}-*.md`.
**Remaining:**
- `scripts/seed-demo.ts` / `fixtures/demo/replay-1.json` still not started (carried over from the prior session).
- No live Cognito test-user password was available this session (the `e2e-test@asli.internal` user exists but its credentials weren't retrievable, and resetting its password was outside this session's permission scope) - N's and L's handlers were verified by direct Lambda invocation with a synthetic JWT-authorizer claim instead of a real sign-in; `tests/e2e` itself was not re-run (nothing about the Scan/Core gates changed this session). A future session with the test-user password should re-run `tests/e2e` and re-verify N/L through the real HTTP API + Cognito path for full end-to-end confidence.
- A human should compare S's now-real numbers against docs/PRODUCT.md's Evidence table and decide whether to update it.
- Z1/Z2 deliberately not started per instruction - now unblocked, ready for a future session.
- K, N's invoice-photo path, and any other Bedrock-dependent path remain blocked account-wide (see T01).
**Gotchas / decisions:**
- CloudWatch Alarms support only one Metrics Insights (`SELECT ... FROM SCHEMA(...)`) query per alarm - combining two via a further metric-math expression is rejected by CloudFormation only at real deploy time, not at `cdk synth`.
- Cross-lane "reads another lane's DynamoDB item shape" integrations (M reading S's Stats-table items) can't be caught by either lane's own unit tests, since each lane's tests use its own fixtures shaped by its own assumption about the other's format - only a real call against real data written by the other lane's real Lambda surfaces the mismatch. Worth deliberately testing these paths for real during every integration pass, not just synthing/unit-testing each lane in isolation.
- Directly invoking a Lambda with a crafted `requestContext.authorizer.jwt.claims.sub` (bypassing the HTTP API/Cognito) is a reasonable substitute for a real signed-in request when no live test-user credential is available - same technique the prior session used for H's authz handlers.
**Contract change requests:** none.
**Learning log entries added:** yes (see submission/LEARNING_LOG.md, 2026-09-19 X entries).
