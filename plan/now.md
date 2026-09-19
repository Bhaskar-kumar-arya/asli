# NOW.md — updated whenever a lane starts, stops, or finishes

**2026-09-19: this file was stale (still showed T01/D1+D2 as active from 2026-09-18).**
**`plan/INTEGRATION_LOG.md` is the up-to-date source of truth for lane status — check there first.**

## Active right now
| Lane | Folder | Started | Status |
|---|---|---|---|
| Z2 | main | not started | Submission package (README, WRITEUP.md, demo video, Builder Center post) - the only lane left with no code/deploy started. See plan/tasks/Z2-submission-package.md. |

## Ready to start next
| Lane | Note |
|---|---|
| Z1 | `cdk synth LaneZ1Stack-dev-z1` clean; `cdk deploy LaneZ1Stack-int` still needs to be folded into the next full `int` redeploy. Demo-replay screen recording still needs a human with an Android phone. |

## Blocked (all on the same AWS account-wide restriction, see T01 Handoff)
| Lane | Blocked on |
|---|---|
| A3 (PDF/Textract fallback) | Account-wide `SubscriptionRequiredException` on Textract. Unmerged on `lane/A3`, not wired into A2's `build.ts`. Per the P2 cutting rule, recommended to stay unmerged unless this clears. |
| Scans (`POST /v1/scans`, real photo), N's invoice-photo path | Account-wide Bedrock `ValidationException: Operation not allowed` (confirmed not IAM/SCP). Code-complete + fixture-tested, never invoked live. |
| H (avp mode) | Verified Permissions blocked the same way; ships with `ENABLE_AVP=false` stub authz. |
| I (Polly hi/kn read-aloud) | Translate/Polly blocked the same way; also Polly has zero hi-IN/kn-IN voices in `ap-south-1` regardless. Falls back to browser `speechSynthesis`. |

## Human-only follow-ups (not AWS-restriction related)
- T00: AWS Budgets alert (50%/80%) still needs a console click-through.
- K (QR): needs ≥3 real pack QR photos shot and decode rate logged (`VITE_FEATURE_QR` off by default).
- E (accuracy harness): needs 30 real strip photos + 10 real bills labeled to produce real accuracy numbers.
- Push/email: fan-out verified, but real *delivery* needs a live push subscription + an SES-verified recipient inbox.
- D1: real Cognito sign-in never smoke-tested against Amplify Hosting's deployed env vars.
- hi/kn guidance strings: hand-drafted only, need native-speaker review (`scripts/content/review.md`).

## Recently finished (see plan/INTEGRATION_LOG.md for full detail and evidence)
All of T00–T02, A1, A2, B, C, D1/D2/D3, F, G1, G2, H, I, S, J, L, M, N are merged to `main`; Wave 1 (A1/A2/C/F/G1/G2/H/I/S) and Wave 2 (J/L/M/N) are deployed to `int`. Z1's hardening pass (audit, demo seed data, pricing table, `DELETE /v1/me`) is done but not yet redeployed to `int`. Z2 has not started.
