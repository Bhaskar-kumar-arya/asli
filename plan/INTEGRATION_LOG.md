# INTEGRATION_LOG.md (maintained by lane X)

## Gates
| Gate | Target (IST) | Status | Time passed | Evidence |
|---|---|---|---|---|
| Stage 0 | Thu 11:00 | ✅ | | Amplify URL **live**: https://main.d2ag2oukltn4mc.amplifyapp.com. T01 verdict **known**: ENDPOINT_OK. **contracts-v1 tagged** on the deployed lane/T02 commit, pushed to origin. |
| Scan | Fri 12:00 | ⬜ | | Real strip → correct card on int |
| Core | Fri 20:00 | ⬜ | | Add medicine → push + email; demo replay → push + email |
| Early submission | Sat 18:00 | ⬜ | | Submission form confirmation |
| Freeze | Sat 22:00 | ⬜ | | e2e green, no P0 bugs |
| Final submission | {{SUBMISSION_DEADLINE}} − 3 h | ⬜ | | |

## Lane status
| Lane | Pri | Status | Merged to main | Deployed to int | Notes |
|---|---|---|---|---|---|
| T00 | P0 | 🟨 | | | Amplify Hosting live: https://main.d2ag2oukltn4mc.amplifyapp.com. Only remaining: AWS Budgets alert. |
| T01 | P0 | 🟨 | | | Endpoint verdict: **ENDPOINT_OK**. Blocked on human AWS-console actions for Bedrock model access, AVP/Translate/Textract account restrictions, SES sender identity. See T01 Handoff. |
| T02 | P0 | ✅ | 2026-09-18 | | **DONE, merged to main.** contracts + shared-stack + api-routes + seed scripts, `pnpm -r lint/test/build` green. Deployed to `dev-shared` - 26 SSM params verified, VAPID keys + fixtures seeded. `contracts-v1` tagged. Verified Permissions deferred (`ENABLE_AVP=false`, account-restriction blocker - see T01). |
| A1 | P0 | 🟨 | | dev-a1 | **DONE, not yet merged to main** (on `lane/A1`). CDSCO endpoint client/parser: real T01-fixture-verified parsing (217 NSQ + 4 Spurious rows), `pnpm -r lint/test/build` green (49 new tests). Real `LaneA1Stack-dev-a1` deploy invoked end-to-end against the live CDSCO endpoint, confirmed S3 write. |
| A2 | P0 | 🟨 | | dev-a2 | **DONE, not yet merged to main** (on `lane/A2`). Ingestion state machine, daily check-months, backfill, demo replay, build-reference. `pnpm -r lint/test/build` green (90 new tests). Real `LaneA2Stack-dev-a2` deploy - all 6 acceptance criteria verified against it, including a genuine idempotency bug (rowHash depended on evolving aliases) found and fixed only by re-running on real infra. |
| A3 | P0/P2 | ⬜ | | | |
| B | P0 | ✅ | 2026-09-18 | | **DONE, merged to main.** All 10 required test cases + 100% branch coverage on classifyMatch/decide, property tests, benchmark. Human reviewed classify.ts against the tier table in chat and approved (task's own acceptance criterion). `@asli/matching` is now real, not a stub. |
| C | P0 | 🟨 | | dev-c | **DONE, not yet merged to main** (on `lane/C`). Upload/scan/check/alert-detail APIs + `packages/lookup`. `pnpm -r lint/test/build` green (47 new tests in services/scan, 5 in packages/lookup, 194 total repo-wide). Real `LaneCStack-dev-c` deploy; Checks/Alerts/Uploads invoked directly against real seeded data (FLAGGED result, SPURIOUS-first, clean logs). Scans endpoint code-complete + fixture-tested but not live-verified - blocked on T01's Bedrock model access (same blocker as A2/N). |
| D1 | P0 | ⬜ | | | |
| D2 | P0 | ⬜ | | | |
| D3 | P0 | ⬜ | | | |
| E | P1 | ⬜ | | | Photos: 0/30 strips, 0/10 bills |
| F | P0 | 🟨 | | | **IN PROGRESS, not yet deployed.** Cabinet CRUD handlers + retroactive check stream consumer, local authz stub (H's package still a placeholder), 34 unit tests, `pnpm -r lint/test/build` green, `cdk synth LaneFStack-dev-f` clean. Real deploy needs human approval (auto-mode classifier blocked it this session). |
| G1 | P0 | 🟨 | | | IN PROGRESS. Subscriptions API + push-sender/email-sender Lambdas + wording-enforced templates written, 26 unit tests, `pnpm -r lint/test/build` green, `cdk synth` clean. Not deployed yet. |
| G2 | P0 | 🟨 | | | **IN PROGRESS** (on `lane/G2`, own worktree `asli-G2`). New-alert fan-out: stream consumer on FlaggedBatches (GSI3 candidate lookup, conditional MATCH puts, latestTier bump, `AlertEvent` publish), 60-day backfill notification guard (age-of-`alertMonth`, not execution-tag - `IngestionState.sourceType` can't distinguish backfill from daily). `pnpm -r lint/test/build` green (19 new tests), `cdk synth` clean. Not yet deployed/verified against real AWS. |
| H | P1 | ✅ | 2026-09-18 | dev-h | **DONE, merged to main.** Cedar `stub`/`avp` authz, invites and members API. 56 new tests. Deployed `LaneHStack-dev-h` and invoked all 4 handlers directly against real seeded fixture data in `stub` mode - OWNER invites, VIEWER denied, invite accept single-use, last-owner guard, all confirmed live. `avp` mode unit-tested only (blocked on the same account-wide Verified Permissions restriction as T01/T02). See plan/tasks/H-permissions-cedar.md Handoff. |
| I | P1 | ⬜ | | | Review: hi ⬜ kn ⬜ |
| S | P1 | ⬜ | | | |
| J | P2 | ⬜ | | | |
| K | P2 | ⬜ | | | |
| L | P2 | ⬜ | | | |
| M | P2 | ⬜ | | | |
| N | P2 | ⬜ | | | |
| Z1 | P0 | ⬜ | | | |
| Z2 | P0 | ⬜ | | | |

## Merge log
| Time | Lane | Commit | e2e | Notes |
|---|---|---|---|---|
| 2026-09-18 | T02 | merge commit, `lane/T02` → `main` | n/a | contracts-v1 + shared-stack, prerequisite for B and all Wave 1 lanes. |
| 2026-09-18 | B | merge commit, `lane/B` → `main` | n/a | Matching library, human-reviewed. |
