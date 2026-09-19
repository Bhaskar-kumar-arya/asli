# NOW.md — updated whenever a lane starts, stops, or finishes

**2026-09-19 (update 4): all engineering work is done. `int` is fully current with `main` across
all 14 stacks. E's accuracy harness has run for real against `int` (15 strips + all 6 bills, zero
timeouts) and produced a real report, after finding and fixing a real bug in lane C's Gemini
client (missing fetch timeout was letting a hung request burn the whole Lambda budget) and
redeploying `LaneCStack-int` once more. T00's AWS Budgets alert is confirmed created. Everything
left is human-only — see below.**

## Active right now
| Lane | Folder | Started | Status |
|---|---|---|---|
| Z2 | main | in progress | Submission package. README.md, WRITEUP.md, BLOG_POST.md, LICENSE and the exported architecture PNG are all drafted with real numbers. Remaining is human-only: screenshots/GIF, publishing the Builder Center blog post, the demo video, team-name placeholders. See plan/tasks/Z2-submission-package.md Handoff. |

## No longer blocked
- **Scan extraction (`POST /v1/scans`) is unblocked and deployed to `int`.** Bedrock access itself is still account-gated (see T01), but the extraction pipeline (`services/scan`) no longer hard-depends on it: `services/scan/src/scans/extraction-provider.ts` picks a backend (`bedrock` | `textract` | `gemini`) from an SSM parameter at Lambda runtime, no redeploy needed to switch. **`gemini` is the deployed default** and verified live end-to-end on `int` against real photos, including a correct `NO_ALERT_FOUND` and a correct `FLAGGED` (with real CDSCO source citation) result. `bedrock` stays wired and IAM-granted so flipping back the moment account access clears is one `aws ssm put-parameter --value bedrock`.
- **E's accuracy harness has run for real against `int` with the full current testset (15 strips + 6 bills, zero timeouts).** `pnpm --filter @asli/accuracy-harness run:accuracy -- --stage int --upload` produced a real report (batch-exact 80.0%, manufacturer STRONG 86.7%, expiry-month exact 40.0%, bill line recall 50.0%, seeded tier-correctness 44/44, avg latency 5692ms), uploaded to the public bucket for J's dashboard, with a measured angle-vs-accuracy comparison logged to `submission/LEARNING_LOG.md`. Along the way, fixed a real bug in the harness itself (`resolveStageConfig` was reading the wrong SSM prefix) and, separately, a real bug in **lane C's** `services/scan/src/scans/gemini-client.ts` (the Gemini `fetch()` call had no timeout at all, so a hung response would burn the Lambda's entire 30s budget with no chance for the existing retry logic to run — only ever hit on bill scans, never strips). Fixed with a 12s per-attempt `AbortSignal.timeout`, 3 new tests, and a `LaneCStack-int` redeploy; verified fixed by the harness completing with zero timeouts immediately after. Full writeup in `submission/LEARNING_LOG.md` and `plan/INTEGRATION_LOG.md`'s 2026-09-19 notes.
- **T00's AWS Budgets alert is confirmed created** (`My Monthly Cost Budget` $50, `asli-int-team-credit` $100 with 50%/80% thresholds, both healthy) — this acceptance criterion is met, `plan/tasks/T00-scaffold.md` updated accordingly.

## Blocked (AWS account-wide restriction, see T01 Handoff)
| Lane | Blocked on |
|---|---|
| A3 (PDF/Textract fallback) | Account-wide `SubscriptionRequiredException` on Textract *for the bulk-PDF-analysis path A3 uses*. Unmerged on `lane/A3`, not wired into A2's `build.ts`. Per the P2 cutting rule, recommended to stay unmerged unless this clears. (Note: C's `textract` scan-extraction fallback uses plain `DetectDocumentText`/`AnalyzeDocument`, a different call pattern, and that one works.) |
| H (avp mode) | Verified Permissions blocked the same way; ships with `ENABLE_AVP=false` stub authz. |
| I (Polly hi/kn read-aloud) | Translate/Polly blocked the same way; also Polly has zero hi-IN/kn-IN voices in `ap-south-1` regardless. Falls back to browser `speechSynthesis`. |

## Human-only follow-ups (everything else that remains in the whole project)
- **Testset size (E):** 15/30 strips, 6/10 bills labelled (bills went from 1/10 to 6/10 this session — two team members provided their own real, redacted Tata 1mg pharmacy invoices, `testset/sources.md`'s "bills 002-006" note). Strips still need actual human-shot photos of real Indian medicine strips (`testset/README.md`); internet sourcing for strips has been exhausted (`testset/sources.md`'s "Coverage gaps" section). This is the only remaining item for E's task.
- **Demo-replay screen recording:** needs a human with an Android phone (`plan/tasks/Z1-hardening-freeze.md` Handoff has the exact seeded-data walkthrough).
- **Submission video:** record per `submission/DEMO_SCRIPT.md`, ≤3:00, captions, mock-strip disclosure on screen, upload and link.
- **README screenshots/GIF:** needs a browser against the live Amplify URL (https://main.d2ag2oukltn4mc.amplifyapp.com).
- **AWS Builder Center blog:** publish `submission/BLOG_POST.md`, fill in `{{BUILDER_CENTER_BLOG_URL}}` in `WRITEUP.md`.
- **Team placeholders:** `{{TEAM_NAME}}` in `LICENSE`/README, teammate names/roles and Builder Center profile links in `WRITEUP.md` (fast-track eligibility).
- **K (QR):** needs ≥3 real pack QR photos shot and decode rate logged (`VITE_FEATURE_QR` off by default, code path otherwise complete).
- **Push/email delivery:** fan-out verified, but real *delivery* needs a live push subscription + an SES-verified recipient inbox.
- **D1:** real Cognito sign-in never smoke-tested against Amplify Hosting's deployed env vars specifically (has been tested directly against the API/Cognito pool from a script instead).
- **hi/kn guidance strings:** hand-drafted only, need native-speaker review (`scripts/content/review.md`).
- **Early/final submission** through the hackathon's own form (Saturday 18:00 early, ≥3h before deadline final).

## Recently finished (see plan/INTEGRATION_LOG.md for full detail and evidence)
All of T00–T02, A1, A2, B, C, D1/D2/D3, F, G1, G2, H, I, S, J, K, L, M, N, Z1 are merged to `main` and deployed to `int` (all 14 stacks, including `LaneZ1Stack-int` and the redeployed `LaneCStack-int`). C's scan extraction was reworked 2026-09-19 to be Bedrock-optional (Gemini default, Textract/Bedrock as runtime-switchable fallbacks). Z1's hardening pass (audit, demo seed data, pricing table, `DELETE /v1/me`) is fully done including its own deploy. E's harness has produced a real accuracy report against live `int`. Z2 is in progress, docs-complete, blocked only on human-only deliverables.
