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
| T02 | P0 | ✅ | | | **DONE.** contracts + shared-stack + api-routes + seed scripts on lane/T02, `pnpm -r lint/test/build` green. Deployed to `dev-shared` (not yet `int`) - 26 SSM params verified, VAPID keys + fixtures seeded. `contracts-v1` tagged. Verified Permissions deferred (`ENABLE_AVP=false`, account-restriction blocker - see T01). Not yet merged to main. |
| A1 | P0 | ⬜ | | | |
| A2 | P0 | ⬜ | | | |
| A3 | P0/P2 | ⬜ | | | |
| B | P0 | 🟨 | | | Implementation + all 10 required test cases + 100% branch coverage on classifyMatch/decide done on lane/B. Blocked only on required human review of the tier table (task's own acceptance criteria). |
| C | P0 | ⬜ | | | |
| D1 | P0 | ⬜ | | | |
| D2 | P0 | ⬜ | | | |
| D3 | P0 | ⬜ | | | |
| E | P1 | ⬜ | | | Photos: 0/30 strips, 0/10 bills |
| F | P0 | ⬜ | | | |
| G1 | P0 | ⬜ | | | |
| G2 | P0 | ⬜ | | | |
| H | P1 | ⬜ | | | |
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
