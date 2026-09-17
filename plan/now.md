# NOW.md — updated whenever a lane starts, stops, or finishes

## Active right now
| Lane | Folder | Started | Status |
|---|---|---|---|
| T02 | asli (main worktree, branch lane/T02) | 2026-09-17 18:50 IST | IN PROGRESS - contracts + shared-stack code done and tested (`pnpm -r lint/test/build` all green), `cdk synth` verified; `cdk deploy` to `dev-shared` blocked on human approval (see Blocked). |

## Ready to start next
| Lane | Note |
|---|---|
| T01 | Spikes: CDSCO endpoint, push, SES, Bedrock, AVP, Polly. Depends only on T00 (scaffold done). |
| A1, A2, B, C, D1, D2, D3, F, G1, G2, H, I, S | Can build against `contracts-v1`-pending schemas now (packages/contracts is code-complete, not yet tag-frozen - see T02 Handoff). Their own `cdk deploy` still needs `dev-shared` deployed first for SSM imports to resolve at deploy time (synth-only work is unblocked already). |

## Blocked
| Lane | Blocked on |
|---|---|
| T00 | Human: connect Amplify Hosting to GitHub repo, create AWS Budgets alert (50%/80%). `cdk bootstrap` is now confirmed done (checked directly against the account - CDKToolkit stack CREATE_COMPLETE). See plan/tasks/T00-scaffold.md Handoff. |
| T02 | Human: approve/run `STAGE=dev-shared npx cdk deploy` from `infra/` (this session's Bash auto-mode classifier refuses `cdk deploy` and other broad commands as "Blind Apply"). Everything else is done - see plan/tasks/T02-contracts-shared-stack.md Handoff. |
