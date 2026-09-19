# NOW.md — updated whenever a lane starts, stops, or finishes

**2026-09-19 (update 2): reconciled against plan/INTEGRATION_LOG.md again — Z1 is done bar one mechanical
deploy step and the phone recording; the Bedrock block on scanning no longer applies (see below).**

## Active right now
| Lane | Folder | Started | Status |
|---|---|---|---|
| Z2 | main | in progress | Submission package. README.md and submission/WRITEUP.md drafted with real numbers; remaining: screenshots/GIF, PNG export of the architecture diagram, Builder Center blog post, video (human, needs a phone/screen recording), team placeholders. See plan/tasks/Z2-submission-package.md Handoff. |

## Ready to start next / mechanical follow-ups
| Lane | Note |
|---|---|
| Z1 | Code-complete, `int` fully deployed except `LaneZ1Stack-int` itself (`DELETE /v1/me`) — `cdk diff` confirms a clean, purely-additive change (new Lambda + IAM + route only). Blocked only on a human approving the actual `cdk deploy` (this session's sandbox blocks shared-infra mutations by default). Demo-replay screen recording still needs a human with an Android phone. |

## No longer blocked
- **Scan extraction (`POST /v1/scans`) is unblocked.** Bedrock access itself is still account-gated (see T01), but as of 2026-09-19 the extraction pipeline (`services/scan`) no longer hard-depends on it: `services/scan/src/scans/extraction-provider.ts` picks a backend (`bedrock` | `textract` | `gemini`) from an SSM parameter at Lambda runtime, no redeploy needed to switch. **`gemini` is the deployed default** (Google Gemini free-tier key in Secrets Manager, `gemini-3.5-flash-lite` model id, itself SSM-driven in case Google deprecates it) — verified end-to-end against the real API and a real medicine photo, meaningfully more accurate on dense small-print labels than the `textract` (OCR + regex rules, zero external AI call) fallback. `bedrock` stays wired and IAM-granted so flipping back the moment account access clears is one `aws ssm put-parameter --value bedrock`. This means E's accuracy harness and N's invoice-photo path can now actually run for real once photos exist — they were previously blocked on this.

## Blocked (AWS account-wide restriction, see T01 Handoff)
| Lane | Blocked on |
|---|---|
| A3 (PDF/Textract fallback) | Account-wide `SubscriptionRequiredException` on Textract *for the bulk-PDF-analysis path A3 uses*. Unmerged on `lane/A3`, not wired into A2's `build.ts`. Per the P2 cutting rule, recommended to stay unmerged unless this clears. (Note: C's `textract` scan-extraction fallback uses plain `DetectDocumentText`/`AnalyzeDocument`, a different call pattern, and that one works — see "No longer blocked" above. The two aren't the same restriction in practice even though both are nominally "Textract.") |
| H (avp mode) | Verified Permissions blocked the same way; ships with `ENABLE_AVP=false` stub authz. |
| I (Polly hi/kn read-aloud) | Translate/Polly blocked the same way; also Polly has zero hi-IN/kn-IN voices in `ap-south-1` regardless. Falls back to browser `speechSynthesis`. |

## Human-only follow-ups (not AWS-restriction related)
- T00: AWS Budgets alert (50%/80%) still needs a console click-through.
- K (QR): needs ≥3 real pack QR photos shot and decode rate logged (`VITE_FEATURE_QR` off by default).
- E (accuracy harness): tooling done; needs 30 real strip photos + 10 real bills labeled to produce real accuracy numbers — now unblocked end-to-end since scan extraction no longer needs Bedrock (see above).
- Push/email: fan-out verified, but real *delivery* needs a live push subscription + an SES-verified recipient inbox.
- D1: real Cognito sign-in never smoke-tested against Amplify Hosting's deployed env vars.
- hi/kn guidance strings: hand-drafted only, need native-speaker review (`scripts/content/review.md`).

## Recently finished (see plan/INTEGRATION_LOG.md for full detail and evidence)
All of T00–T02, A1, A2, B, C, D1/D2/D3, F, G1, G2, H, I, S, J, K, L, M, N are merged to `main`; Wave 1 and Wave 2 are deployed to `int`. C's scan extraction was reworked 2026-09-19 to be Bedrock-optional (Gemini default, Textract/Bedrock as runtime-switchable fallbacks — see "No longer blocked" above). Z1's hardening pass (audit, demo seed data, pricing table, `DELETE /v1/me`) is code-complete and `int` is fully redeployed except `LaneZ1Stack-int` itself. Z2 is in progress.
