# OBSERVABILITY_AND_COST.md

## Metrics (CloudWatch EMF via Powertools, namespace `Asli`, dimension `stage`)
| Metric | Unit | Emitted by |
|---|---|---|
| BedrockInputTokens, BedrockOutputTokens (dim: purpose=strip|bill|reason) | Count | C, A2, N |
| TextractPages | Count | A3 |
| TranslateCharacters, PollyCharacters | Count | I scripts |
| ScanLatencyMs | Milliseconds | C |
| ExtractionFailed | Count | C |
| BatchEditedByUser | Count | C (from confirm step) |
| CheckTier (dim: tier) | Count | C, F, G2 |
| BatchCollisionIgnored | Count | matching callers |
| IngestedRows (dim: category, sourceType) | Count | A2 |
| IngestionFailed | Count | A2 |
| MatchesCreated (dim: trigger, tier) | Count | F, G2 |
| PushSent, PushFailed, EmailSent, EmailFailed | Count | G1 |

## Cost model (config: `packages/contracts/src/pricing.ts`)
Store unit prices with `source` URL and `checkedAt` date. Prices must be verified from AWS pricing pages for ap-south-1 during the event; do not guess.
- Cost per scan = Bedrock input tokens × input price + output tokens × output price + Lambda GB-seconds × price + API Gateway request + S3 PUT/GET.
- Cost per monthly ingestion run = Step Functions state transitions + Lambda + DynamoDB writes + S3 PUTs (+ Textract pages if fallback).
- Projection at 10,000 families = (families × average medicines × 1 retroactive check) + (monthly new-alert fan-out) + (scans per month assumption, stated explicitly).

Report measured values from `int`, not estimates, in the dashboard and writeup.

## Alarms (to team email via SNS `asli-<stage>-ops`)
- IngestionFailed ≥ 1
- Any DLQ depth ≥ 1
- Lambda error rate > 5% over 5 minutes
- AWS Budgets: monthly budget alert at 50% and 80% of the team's credit amount

## CloudWatch dashboard (lane J, CDK)
Rows: ingestion (rows, failures, last run), scans (volume, latency p50/p95, failures, edits), matching (tiers, matches created), alerts (push/email sent and failed), cost (tokens and computed cost per 1,000 scans).

## Tracing
X-Ray active tracing on API Lambdas and the state machine.
