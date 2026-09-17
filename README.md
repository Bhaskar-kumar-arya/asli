# Asli — Is this medicine batch flagged by CDSCO?

> Placeholder README. Lane Z2 rewrites this before submission with screenshots, the architecture diagram, measured cost and accuracy numbers, and the demo video link.

## The problem
CDSCO publishes monthly lists of drug batches that failed quality tests (Not of Standard Quality) or were found Spurious. Families almost never see them. In a hand check of 171 flagged batches from three CDSCO central-lab alerts (Sep 2024, Jan 2025, Mar 2025), 170 were still within their expiry date when announced, with an average of about 9.6 months between manufacture and announcement. These batches can still be sitting in a family's medicine cabinet. (Replace with the figures computed by the stats job across the full backfill.)

## What Asli does
- Scan a strip, a pharmacy bill, or a pack QR code, or type the details
- Match the batch against every official CDSCO NSQ and Spurious list, deterministically, with a link to the source
- Save a family's medicines in a shared cabinet, checked against the whole history
- Alert every caregiver by web push and email when a new CDSCO list matches
- Explain what to do next in English, Hindi and Kannada, with read-aloud

## Architecture (summary)
EventBridge Scheduler → Step Functions ingestion (CDSCO endpoint, PDF + Textract fallback) → S3 snapshots → DynamoDB → DynamoDB Streams → matching Lambdas → SNS → web push and SES email. React PWA on Amplify Hosting, Cognito sign-in, Amazon Verified Permissions (Cedar) for caregiver sharing, Bedrock for image extraction, Translate and Polly for guidance. All infrastructure in AWS CDK.

## Repository layout
```
apps/web                 React + Vite PWA
packages/contracts       Zod schemas, types, fixtures (source of truth)
packages/matching        Deterministic matching library
packages/content         Reviewed guidance templates (en, hi, kn), reason codes
packages/authz           Verified Permissions client and Cedar schema/policies
services/*               Lambda handlers, one folder per lane
infra                    AWS CDK app (shared stack + one stack per lane)
tools/accuracy           Accuracy harness
testset                  Labelled strip and bill photos (no personal data)
docs, plan, submission   Specs, build plan, submission material
```

## Deploy
```
pnpm install
pnpm -r build
STAGE=int pnpm --filter infra cdk deploy --all
```

## Built with
Claude Code was used to write most of the code. See submission/WRITEUP.md.
