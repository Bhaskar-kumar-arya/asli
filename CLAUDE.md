# CLAUDE.md — Rules for every Claude Code session on Asli

Read this file completely before doing anything. Then read your task file in `plan/tasks/` and the docs it lists.

## What Asli is
Asli checks whether a medicine a family owns belongs to a batch that India's Central Drugs Standard Control Organisation (CDSCO) has declared Not of Standard Quality (NSQ) or Spurious. Users scan a strip, a pharmacy bill, or a QR code, or type details in. Asli matches the batch against CDSCO's official lists, saves the family's medicines in a shared cabinet, and alerts caregivers when a new list matches.

Hackathon: WeMakeDevs x AWS "First Commit", Ship It track. Build window: Thu 17 Sep 2026 08:00 IST to {{SUBMISSION_DEADLINE}}.

## Non-negotiable product rules
1. **Matching is deterministic.** The tier (FLAGGED / VERIFY / NO_ALERT_FOUND) is decided only by `packages/matching`. No LLM ever decides or influences a tier. LLMs may only *extract* fields from images or *normalize* data at ingestion into fixed enums/aliases.
2. **Never say "safe".** The negative result is always "No alert found for this batch". Never "safe", "genuine", "verified", or a green tick without that text.
3. **Batch, never brand.** All user-facing text refers to "this batch". Never imply a brand, product, or manufacturer is unsafe in general.
4. **Always cite the source.** Every FLAGGED or VERIFY result shows the CDSCO alert month, the reporting lab/source, and a link to the original CDSCO source (endpoint URL or PDF), plus our stored S3 snapshot reference.
5. **Never advise stopping a medicine.** Guidance comes only from reviewed templates in `packages/content`. They must say: do not stop a prescribed medicine without talking to your doctor. No free-form generated advice reaches users.
6. **Spurious nuance.** For SPURIOUS results the manufacturer on the label may be impersonated. Wording: "A batch carrying this label was found to be spurious", never "Manufacturer X made fake medicine".
7. **Privacy.** Never log images, bill text, names, phone numbers, emails, or free-text notes. Bill images are deleted right after extraction. Log IDs and counts only.
8. **Be polite to CDSCO.** Never call CDSCO from a user request. Only the ingestion pipeline fetches, at most once per day plus backfill, with a delay of at least 2 seconds between requests and an identifying User-Agent. Every raw response is saved to S3 first.

## Engineering rules
- **Monorepo:** pnpm workspaces, TypeScript everywhere, Node.js 22 Lambdas, AWS CDK v2 (TypeScript), region `ap-south-1`.
- **Contracts are frozen.** `packages/contracts` (Zod schemas + fixtures) is the single source of truth for API shapes, table items, and events. If your lane needs a contract change: stop, write the proposed change under "Contract change requests" in your task file's Handoff section, and tell the human. Do not edit `packages/contracts` unless your task is T02 or the human approves.
- **Stay in your lane.** Your task file lists the paths you own. Do not edit anything else. If you must, stop and ask.
- **Infrastructure ownership:** each lane owns exactly one CDK construct/stack file in `infra/lib/lanes/`. Shared resources live only in `infra/lib/shared-stack.ts` (owned by T02). Lanes import shared resources through SSM parameters under `/asli/<stage>/...`.
- **Stages:** `STAGE=<your-stage>` (e.g. `dev-a1`) names your lane stack; `SHARED_STAGE` (default `dev-shared`) is where your stack imports shared resources from via SSM. Seed data into `dev-shared` only with key prefixes of your lane ID so lanes don't collide. Never deploy to `int` unless your task is T02, X or Z1.
- **Tests:** Vitest. Every lane ships unit tests. Handlers are tested against `packages/contracts/fixtures`. `pnpm -r test` must pass before you mark your lane done.
- **Lambda toolkit:** AWS SDK v3, Powertools for AWS Lambda (TypeScript) for Logger, Metrics (EMF), Tracer and Idempotency.
- **Cost logging:** every Bedrock, Textract, Translate or Polly call emits a metric (see `docs/OBSERVABILITY_AND_COST.md`).
- **Idempotency:** every write that can be retried uses a deterministic key or conditional write. Re-running any pipeline must never duplicate data.
- **No secrets in code.** Secrets Manager or SSM only.
- **Commits:** small, frequent, descriptive, on your lane branch. The repo's history must fall inside the event window.
- **AI tools must be credited** in `submission/WRITEUP.md` (Claude Code).

## Before you end a session
1. Run `pnpm -r lint && pnpm -r test`.
2. Update the **Handoff** section at the bottom of your task file: status, done, remaining, gotchas, contract change requests.
3. Append anything you learned (something that broke, a measured comparison, a first-time AWS service) to `submission/LEARNING_LOG.md` with a timestamp and your lane ID.

## Doc map
| Need | Read |
|---|---|
| Why and for whom | docs/PRODUCT.md |
| System shape | docs/ARCHITECTURE.md |
| CDSCO data | docs/DATA_SOURCES.md |
| Tables, buckets, events | docs/DATA_MODEL.md |
| Matching tiers | docs/MATCHING.md |
| HTTP API | docs/API.md |
| Image extraction | docs/SCANNING.md |
| Alerts | docs/ALERTS.md |
| Sharing and Cedar | docs/PERMISSIONS.md |
| Wording and templates | docs/SAFETY_AND_CONTENT.md |
| Privacy | docs/PRIVACY.md |
| Screens | docs/UX.md |
| Metrics and cost | docs/OBSERVABILITY_AND_COST.md |
| Tests and accuracy | docs/TESTING.md |
| Plan and lanes | plan/BUILD_PLAN.md |
| Integration status | plan/INTEGRATION_LOG.md |
| Contract changes | plan/CHANGELOG.md |
