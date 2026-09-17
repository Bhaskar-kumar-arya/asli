# NOW.md — updated whenever a lane starts, stops, or finishes

## Active right now
| Lane | Folder | Started | Status |
|---|---|---|---|
| T01 | asli-T01 (worktree, branch lane/T01) | 2026-09-17 19:35 IST | BLOCKED - endpoint (`ENDPOINT_OK`) and PDF-listing spikes done with real evidence; Bedrock/Translate/Textract/Verified Permissions all blocked by AWS account restrictions that need a human console action (see Blocked). |

## Ready to start next
| Lane | Note |
|---|---|
| A1, A2, C, D1, D2, D3, F, G1, G2, H, I, S | **`contracts-v1` is tagged, `dev-shared` is deployed and seeded, and `@asli/matching`'s real implementation is merged to `main`** (human-reviewed 2026-09-18, see B Handoff) - fully unblocked now, including real `cdk deploy` (SSM imports resolve) and real tier decisions (no more stub). A3 (PDF/Textract fallback) can likely drop to P2 - T01 confirmed `ENDPOINT_OK` with strong evidence. Note: Verified Permissions isn't deployed yet (`ENABLE_AVP=false`, see T02 Handoff) - H can build against the stub authz mode until that's resolved. |

## Blocked
| Lane | Blocked on |
|---|---|
| T00 | Human: Amplify Hosting connected and live (https://main.d2ag2oukltn4mc.amplifyapp.com). Only remaining: create the AWS Budgets alert (50%/80%). `cdk bootstrap` confirmed done. See plan/tasks/T00-scaffold.md Handoff. |
| T01 | Human: (1) grant Bedrock model access for Anthropic models in the AWS console - blocks C/A2/N (scanning). Deferred for now, not urgent - CDSCO endpoint matching doesn't need vision extraction. (2) Check whether the "account is currently being verified" state has cleared - it's blocking Verified Permissions (blocks H), Translate (blocks I), and Textract (blocks A3) identically with `SubscriptionRequiredException`. Deferred for now - T02 already ships `ENABLE_AVP=false` as a workaround. (3) ~~Pick a real sender identity/domain + demo recipient emails~~ **DONE 2026-09-17** - sender + recipient emails verified in SES sandbox, G1's real email sends unblocked. (4) ~~A real Android phone for the web push spike~~ **DONE 2026-09-18** - human has an Android phone available, web push spike unblocked. See plan/tasks/T01-spikes.md Handoff for full evidence and exact repro commands (`spikes/*.ts`). |

## Recently finished
| Lane | Finished | Notes |
|---|---|---|
| B | 2026-09-18 | **DONE. Merged to `main`.** Human reviewed `classify.ts` against docs/MATCHING.md's tier table in chat and approved. All 10 required test cases, 100% branch coverage on `classifyMatch`/`decide`, property tests, and benchmark pass. `@asli/matching` is now the real implementation on `main` - C, F, G2, A1 no longer need a stub. See plan/tasks/B-matching-library.md Handoff. |
| T02 | 2026-09-17 22:35 IST | **DONE. Merged to `main`.** `SharedStack` deployed to `dev-shared` (verified: 26 SSM params present), VAPID keys generated, fixtures seeded, `contracts-v1` tagged and pushed. Verified Permissions deferred (`ENABLE_AVP=false`) pending the same AWS account restriction T01 found - redeploy without the flag once that clears. Also: force-pushed over a stale parallel `origin/lane/T02` from an earlier, never-deployed attempt on a different device (human confirmed it was abandoned) - see T02 Handoff Gotchas.
