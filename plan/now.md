# NOW.md — updated whenever a lane starts, stops, or finishes

## Active right now
| Lane | Folder | Started | Status |
|---|---|---|---|

## Ready to start next
| Lane | Note |
|---|---|
| T01 | Spikes: CDSCO endpoint, push, SES, Bedrock, AVP, Polly. Depends only on T00 (scaffold done). |
| T02 | Contracts, fixtures, shared stack. Depends only on T00 (scaffold done). Can use a placeholder model ID until T01 reports back. |

## Blocked
| Lane | Blocked on |
|---|---|
| T00 | Human: connect Amplify Hosting to GitHub repo, create AWS Budgets alert (50%/80%), `cdk bootstrap` the target account/region. See plan/tasks/T00-scaffold.md Handoff. Everything not requiring AWS credentials is done. |
