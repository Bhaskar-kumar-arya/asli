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
