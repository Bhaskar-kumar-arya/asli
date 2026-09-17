# NOW.md — updated whenever a lane starts, stops, or finishes

## Active right now
| Lane | Folder | Started | Status |
|---|---|---|---|
| T02 | asli (main worktree, branch lane/T02) | 2026-09-17 18:50 IST | IN PROGRESS - contracts + shared-stack code done and tested (`pnpm -r lint/test/build` all green), `cdk synth` verified; `cdk deploy` to `dev-shared` blocked on human approval (see Blocked). |
| T01 | asli-T01 (worktree, branch lane/T01) | 2026-09-17 19:35 IST | BLOCKED - endpoint (`ENDPOINT_OK`) and PDF-listing spikes done with real evidence; Bedrock/Translate/Textract/Verified Permissions all blocked by AWS account restrictions that need a human console action (see Blocked). |
| B | asli-B (worktree, branch lane/B) | 2026-09-17 21:35 IST | BLOCKED only on required human review of `classify.ts` - implementation, all 10 required test cases, 100% branch coverage on `classifyMatch`/`decide`, property tests, and benchmark all done. See plan/tasks/B-matching-library.md Handoff. |

## Ready to start next
| Lane | Note |
|---|---|
| A1, A2, C, D1, D2, D3, F, G1, G2, H, I, S | Can build against `contracts-v1`-pending schemas now (packages/contracts is code-complete, not yet tag-frozen - see T02 Handoff) and `@asli/matching`'s real implementation (not yet human-reviewed, but functionally complete - see B Handoff). A3 (PDF/Textract fallback) can likely drop to P2 - T01 confirmed `ENDPOINT_OK` with strong evidence. Their own `cdk deploy` still needs `dev-shared` deployed first for SSM imports to resolve at deploy time (synth-only work is unblocked already). |

## Blocked
| Lane | Blocked on |
|---|---|
| T00 | Human: connect Amplify Hosting to GitHub repo, create AWS Budgets alert (50%/80%). `cdk bootstrap` is now confirmed done (checked directly against the account - CDKToolkit stack CREATE_COMPLETE). See plan/tasks/T00-scaffold.md Handoff. |
| T02 | Human: approve/run `STAGE=dev-shared npx cdk deploy` from `infra/` (this session's Bash auto-mode classifier refuses `cdk deploy` and other broad commands as "Blind Apply"). Everything else is done - see plan/tasks/T02-contracts-shared-stack.md Handoff. |
| T01 | Human: (1) grant Bedrock model access for Anthropic models in the AWS console - blocks C/A2/N (scanning). (2) Check whether the "account is currently being verified" state has cleared - it's blocking Verified Permissions (blocks H), Translate (blocks I), and Textract (blocks A3) identically with `SubscriptionRequiredException`. (3) Pick a real sender identity/domain + demo recipient emails so SES verification and the production-access request can be submitted (blocks G1's real email sends). (4) A real Android phone for the web push spike. See plan/tasks/T01-spikes.md Handoff for full evidence and exact repro commands (`spikes/*.ts`). |
| B | Human: review `packages/matching/src/classify.ts` against docs/MATCHING.md's tier table (this task's own acceptance criteria require review before Status can become DONE) - everything else is finished. |
