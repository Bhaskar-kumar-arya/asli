# INTEGRATION_LOG.md (maintained by lane X)

## Gates
| Gate | Target (IST) | Status | Time passed | Evidence |
|---|---|---|---|---|
| Stage 0 | Thu 11:00 | ⬜ | | Amplify URL, T01 verdict, contracts-v1 tag |
| Scan | Fri 12:00 | ⬜ | | Real strip → correct card on int |
| Core | Fri 20:00 | ⬜ | | Add medicine → push + email; demo replay → push + email |
| Early submission | Sat 18:00 | ⬜ | | Submission form confirmation |
| Freeze | Sat 22:00 | ⬜ | | e2e green, no P0 bugs |
| Final submission | {{SUBMISSION_DEADLINE}} − 3 h | ⬜ | | |

## Lane status
| Lane | Pri | Status | Merged to main | Deployed to int | Notes |
|---|---|---|---|---|---|
| T00 | P0 | ⬜ | | | |
| T01 | P0 | 🟨 | | | Endpoint verdict: **ENDPOINT_OK**. Blocked on human AWS-console actions for Bedrock model access, AVP/Translate/Textract account restrictions, SES sender identity. See T01 Handoff. |
| T02 | P0 | 🟨 | | | Code complete on lane/T02 (contracts + shared-stack + api-routes + seed scripts), `pnpm -r lint/test/build` green, `cdk synth` verified. Not merged, not deployed - `cdk deploy dev-shared` needs human approval. |
| A1 | P0 | ⬜ | | | |
| A2 | P0 | ⬜ | | | |
| A3 | P0/P2 | ⬜ | | | |
| B | P0 | ⬜ | | | |
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
