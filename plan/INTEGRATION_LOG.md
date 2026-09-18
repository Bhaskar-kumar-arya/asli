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
| T00 | P0 | 🟨 | (initial scaffold commits) | | Amplify Hosting live: https://main.d2ag2oukltn4mc.amplifyapp.com. Only remaining: AWS Budgets alert. |
| T01 | P0 | ✅ | 2026-09-18 | | **DONE, merged to main** (`0b33961`). Endpoint verdict: **ENDPOINT_OK**. Bedrock/Translate/Textract/AVP invocation confirmed blocked by an account-level restriction, not IAM/SCP (verified separately: root-user caller bypasses IAM, `describe-organization` confirms no org/SCP exists, `get-foundation-model` shows the model is ACTIVE but `invoke-model` returns `ValidationException: Operation not allowed` across 4 providers). SES sender identity still needs human AWS-console action. See T01 Handoff and 2026-09-18 18:16 IST learning log entry. |
| T02 | P0 | ✅ | 2026-09-18 | | **DONE, merged to main** (`99ef790`). contracts + shared-stack + api-routes + seed scripts, `pnpm -r lint/test/build` green. Deployed to `dev-shared` - 26 SSM params verified, VAPID keys + fixtures seeded. `contracts-v1` tagged. Verified Permissions deferred (`ENABLE_AVP=false`, account-restriction blocker - see T01). |
| A1 | P0 | ✅ | 2026-09-18 | | **DONE, merged to main** (`98d0663`). CDSCO endpoint client/parser: real T01-fixture-verified parsing (217 NSQ + 4 Spurious rows), `pnpm -r lint/test/build` green (49 new tests). Real `LaneA1Stack-dev-a1` deploy invoked end-to-end against the live CDSCO endpoint, confirmed S3 write. |
| A2 | P0 | ✅ | 2026-09-18 | | **DONE, merged to main** (`ec277c6`). Ingestion state machine, daily check-months, backfill, demo replay, build-reference. `pnpm -r lint/test/build` green (90 new tests). Real `LaneA2Stack-dev-a2` deploy - all 6 acceptance criteria verified against it, including a genuine idempotency bug (rowHash depended on evolving aliases) found and fixed only by re-running on real infra. |
| A3 | P2 | ⬜ | | | Not started. Demoted from P0 to P2 now that T01's verdict is ENDPOINT_OK (cutting rule: PDF fallback only needed if the endpoint fails). Safe to start now against T02 alone if capacity allows. |
| B | P0 | ✅ | 2026-09-18 | | **DONE, merged to main** (`792c59e`). All 10 required test cases + 100% branch coverage on classifyMatch/decide, property tests, benchmark. Human reviewed classify.ts against the tier table in chat and approved (task's own acceptance criterion). `@asli/matching` is now real, not a stub. |
| C | P0 | ✅ | 2026-09-18 | | **DONE, merged to main** (`d1e6a20`). Upload/scan/check/alert-detail APIs + `packages/lookup`. `pnpm -r lint/test/build` green (47 new tests in services/scan, 5 in packages/lookup, 194 total repo-wide). Real `LaneCStack-dev-c` deploy; Checks/Alerts/Uploads invoked directly against real seeded data (FLAGGED result, SPURIOUS-first, clean logs). Scans endpoint code-complete + fixture-tested but not live-verified - blocked on the same account-wide Bedrock restriction as A2/N (see T01). |
| D1 | P0 | 🟨 | 2026-09-18 | | Merged to main alongside D2 (`54beaf6`, commit `feat(D1+D2)` - built in one session, human-approved). Theme, shared components, Cognito auth, API client, MSW mocks, i18n shell frame, service worker/push, settings screen. **Remaining:** real Cognito sign-in not yet tested against a deployed User Pool/`int` - needs `VITE_COGNITO_USER_POOL_ID`/`VITE_COGNITO_USER_POOL_CLIENT_ID`/`VITE_API_BASE_URL` set in Amplify Hosting build env and a smoke test. |
| D2 | P0 | 🟨 | 2026-09-18 | | **Merged to main** (`54beaf6`). Method chooser, capture, confirm/manual entry, result card (all docs/UX.md states), bill results, read-aloud, save-to-cabinet. 24 tests passing incl. banned-words grep. **Remaining:** hi/kn result copy (moves to lane I once it ships); not yet run end-to-end against a real `int` deploy or real device; screen recording not captured. |
| D3 | P0 | ✅ | 2026-09-18 | | **DONE, merged to main** (`290b23e`). Cabinet, medicine detail, members, and notification deep-link screens. |
| E | P1 | 🟨 | | | **IN PROGRESS, not yet merged.** Accuracy harness built: label CLI, runner (upload+scan+checks against a real stage via SSM/Cognito), scoring against `@asli/matching`'s own normalize functions, seeded tier-correctness probes off `flagged-batches.json`, JSON+markdown reports, comparison mode. `pnpm -r lint/test/build` green (20 new tests). Blocked on: photos (0/30 strips, 0/10 bills - human task) and a live `int`/`dev-*` deploy with working scans (Bedrock still blocked account-wide per T01) to actually run against. See plan/tasks/E-accuracy-harness.md Handoff. |
| F | P0 | ✅ | 2026-09-18 | | **DONE, merged to main** (`9fa6533`). Cabinet CRUD handlers + retroactive check stream consumer, local authz stub (H's package still a placeholder at merge time), 34 unit tests, `pnpm -r lint/test/build` green, `cdk synth LaneFStack-dev-f` clean. Not yet deployed to a real stage. |
| G1 | P0 | ✅ | 2026-09-18 | | **DONE, merged to main** (`92dabd6`). Subscriptions API + push-sender/email-sender Lambdas + wording-enforced templates, 26 unit tests, `pnpm -r lint/test/build` green, `cdk synth` clean. Not yet deployed to a real stage. |
| G2 | P0 | ✅ | 2026-09-18 | | **DONE, merged to main** (`f96ea7e`). New-alert fan-out: stream consumer on FlaggedBatches (GSI3 candidate lookup, conditional MATCH puts, latestTier bump, `AlertEvent` publish), 60-day backfill notification guard (age-of-`alertMonth`, not execution-tag - `IngestionState.sourceType` can't distinguish backfill from daily). `pnpm -r lint/test/build` green (19 new tests), `cdk synth` clean. Not yet deployed/verified against real AWS. |
| H | P1 | ✅ | 2026-09-18 | dev-h | **DONE, merged to main** (`54e4d8d`). Cedar `stub`/`avp` authz, invites and members API. 56 new tests. Deployed `LaneHStack-dev-h` and invoked all 4 handlers directly against real seeded fixture data in `stub` mode - OWNER invites, VIEWER denied, invite accept single-use, last-owner guard, all confirmed live. `avp` mode unit-tested only (blocked on the same account-wide Verified Permissions restriction as T01/T02). See plan/tasks/H-permissions-cedar.md Handoff. |
| I | P1 | ⬜ | | | Not started. Review: hi ⬜ kn ⬜. Safe to start now against T02 alone - D2's English copy is an explicit stand-in until this ships. |
| S | P1 | ⬜ | | | Not started. Safe to start now against T02 alone. |
| J | P2 | ⬜ | | | Blocked: waiting on the Core gate (F/G1/G2 merged but not yet deployed/live-verified, so Core gate not yet hit). |
| K | P2 | ⬜ | | | Blocked: waiting on the Core gate. |
| L | P2 | ⬜ | | | Blocked: waiting on the Core gate. |
| M | P2 | ⬜ | | | Blocked: waiting on lane S. |
| N | P2 | ⬜ | | | Blocked: waiting on the Core gate. |
| Z1 | P0 | ⬜ | | | Blocked: waiting on Wave 2. |
| Z2 | P0 | ⬜ | | | Blocked: waiting on Z1. |

**Note (2026-09-18):** this table was significantly out of date - it previously showed A1, A2, C, D1, D2, D3, F, G1, G2 as unmerged or not started when `git log --oneline --all | grep merge` shows all of them already merged to `main`. Reconciled against actual git history above; commit hashes included so this doesn't drift again. Still true and worth escalating: **no lane has deployed its backend to the shared `int` stage yet** - all real deploys so far are to per-lane `dev-<id>` stages. The Scan and Core gates below can't be marked ✅ until lane X does an `int` deploy and runs the real end-to-end checks.

## Merge log
| Time | Lane | Commit | e2e | Notes |
|---|---|---|---|---|
| 2026-09-18 00:21 | T02 | `99ef790` merge(T02) | n/a | contracts-v1 + shared-stack, prerequisite for B and all Wave 1 lanes. |
| 2026-09-18 00:22 | B | `792c59e` merge(B) | n/a | Matching library, human-reviewed. |
| 2026-09-18 00:49 | A1 | `98d0663` merge(A1) | n/a | CDSCO endpoint client and parser. |
| 2026-09-18 12:12 | A2 | `ec277c6` merge(A2) | n/a | Ingestion state machine, backfill, demo replay, build-reference. |
| 2026-09-18 12:15 | C | `d1e6a20` merge(C) | n/a | Upload, scan, check and alert-detail APIs. |
| 2026-09-18 17:10 | G1 | `92dabd6` merge(G1) | n/a | Push/email subscription API and senders. |
| 2026-09-18 17:10 | G2 | `f96ea7e` merge(G2) | n/a | New-alert fan-out stream consumer. |
| 2026-09-18 17:16 | F | `9fa6533` merge(F) | n/a | Cabinet API and retroactive check. |
| 2026-09-18 17:20 | D1+D2 | `54beaf6` merge(D2) | n/a | Web shell + scan/confirm/result screens (D1 and D2 built and merged together, human-approved). |
| 2026-09-18 17:25 | D3 | `290b23e` merge(D3) | n/a | Cabinet, medicine detail, members, and notification deep link screens. |
| 2026-09-18 17:28 | T01 | `0b33961` merge(T01) | n/a | AWS spikes - endpoint OK, PDF listing OK, Bedrock/Translate/Textract/AVP blocked by account restriction. |
| 2026-09-18 17:29 | H | `54e4d8d` merge(H) | n/a | Caregiver permissions (Cedar/AVP), invites and members API. |
| 2026-09-18 17:32 | (main) | `ab6bd95` fix(main) | n/a | Repaired `pnpm-lock.yaml` after the multi-lane merge burst above. |
