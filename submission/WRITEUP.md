# Asli — writeup

An AWS Builder Center blog post adapted from this writeup is drafted at
`submission/BLOG_POST.md`. **TODO (human):** publish it on Builder Center and paste the live URL
here: {{BUILDER_CENTER_BLOG_URL}}.

## The problem
India's CDSCO publishes monthly lists of drug batches that failed quality tests (Not of Standard
Quality) or were found Spurious — but as government tables and PDFs, never pushed to the families
who actually own the medicine. In a hand check of 171 flagged batches across three CDSCO
central-lab alerts (Sep 2024, Jan 2025, Mar 2025), 170 (99.4%) were still within their expiry date
when announced, with an average of ~9.6 months between manufacture and announcement — so the
batch was almost always still in a cabinet by the time the alert came out. We confirmed this
against a real, full ingestion backfill on `int` (2026-09-19, 21 months of CDSCO data): 3,326
flagged batches total (3,274 NSQ + 52 Spurious), 99.47% still within expiry at announcement, a
median 9 months from manufacture to alert. See `docs/PRODUCT.md` "Evidence" for the full table.

## What we built
Scan a strip, bill or QR code, or type details in → deterministic match against every CDSCO NSQ
and Spurious list → a result with its source and plain-language guidance → save to a shared
family cabinet → every caregiver in that cabinet gets alerted the moment a new CDSCO list matches
one of their saved medicines, not just at scan time. A pharmacy-mode CSV bulk-check and a
problem-report flow routed to India's official PvPI channel round out the two non-family use
cases in scope.

## How it works
See the architecture diagram and deterministic-matching explanation in `README.md`. In short:
EventBridge Scheduler triggers a Step Functions ingestion pipeline daily, which fetches CDSCO's
structured endpoint (PDF + Textract as a documented fallback), saves every raw response to S3
before parsing anything, and writes normalized rows to DynamoDB. DynamoDB Streams drive matching
in both directions — new CDSCO rows are checked against every saved medicine, and every newly
saved medicine is checked against the whole CDSCO history — so nobody has to keep re-scanning
their medicines by hand. `packages/matching` is the single, deterministic decision point for the
FLAGGED / VERIFY / NO_ALERT_FOUND tier; nothing else in the codebase is allowed to make that call.

## Where AWS fits
| Service | What it does in Asli | Why this and not the alternative |
|---|---|---|
| EventBridge Scheduler | Daily cheap check for a new CDSCO month | Fixed monthly cron would miss late publishing |
| Step Functions (Standard) | Retries, a visible execution for the demo, Map state for backfill, Choice for the PDF fallback | One large Lambda — timeouts, no visibility |
| Lambda (Node.js 22) | Scales to zero for a spiky, tiny workload | Containers — idle cost for near-zero traffic |
| DynamoDB on-demand + Streams | Key lookups by batch; streams drive matching in both directions without polling | RDS — idle cost, overkill for this access pattern |
| S3 | Raw CDSCO snapshots prove what was published and when; uploads with a 1-day lifecycle | — |
| Textract (fallback only) | Only used if the structured CDSCO endpoint is unavailable | Primary path — costly and error-prone when a clean endpoint already exists |
| Bedrock (Claude, via Converse API) | Extracts fields from strip/bill photos; classifies unmapped failure reasons into a fixed enum at ingestion | Never used to decide a match — that would make an LLM the safety decision-maker |
| SNS | Fans out one alert event to push and email; new channels just subscribe | Direct calls from matchers — tighter coupling |
| SES | Email alerts | SMS/WhatsApp — India DLT and Meta verification too slow for a weekend build |
| Web Push (VAPID) | Phone notification with no app store | Native app — far more build time for the same alert |
| Cognito | Managed sign-in, JWT for API Gateway | Custom auth |
| Amazon Verified Permissions | Managed Cedar policies for caregiver sharing, auditable | Ad-hoc role checks scattered through handler code |
| Translate + Polly | Draft Hindi/Kannada templates (human reviewed before use); read-aloud | Runtime LLM translation of safety-critical text — never allowed by CLAUDE.md rule 5 |
| Amplify Hosting | PWA hosting with a live URL in minutes | CloudFront + S3 wired by hand |
| CloudWatch (EMF metrics, dashboard) | Cost and accuracy evidence, public `/dashboard` | Third-party APM — unnecessary for this scope |
| AWS CDK (TypeScript) | Whole stack deploys in one command, diffable and reviewable | Console clicking — not reproducible, not reviewable |

## Decisions we're proud of
- **Deterministic matching; the LLM only reads images.** `packages/matching` decides every tier;
  Bedrock never sees the decision, only the photo.
- **"No alert found", never "safe."** The negative result never implies certification — CLAUDE.md
  rule 2, enforced by an automated banned-words check on every rendered result, not just a style
  guideline.
- **Batch, never brand.** Every user-facing string refers to "this batch"; nothing implies a whole
  brand or manufacturer is unsafe.
- **Structured CDSCO endpoint over PDF OCR**, with Textract as a documented, tested fallback for
  the months the endpoint doesn't cover.
- **Crowd reports routed to PvPI** (India's official pharmacovigilance channel) instead of
  broadcasting one user's report to every other user of the same batch — avoids spreading an
  unverified claim while still giving the report somewhere real to go.
- **No generated safety text reaches users.** Guidance comes only from `packages/content`'s
  reviewed templates; a scan result is rendered, never composed.
- **Bill images deleted immediately after extraction** — nothing is logged or retained past the
  fields it produces.
- **Both matching directions run off the same DynamoDB Streams pattern** (new CDSCO row → check
  every saved medicine; new saved medicine → check the whole CDSCO history) instead of two
  separate systems, so a family never has to remember to re-check something they already saved.

## Measured results
- **Accuracy:** not yet measurable. `tools/accuracy` (label CLI, scoring against
  `packages/matching`'s own normalize functions, tier-correctness probes, JSON/markdown reports)
  is built and unit tested, but scoring real accuracy needs real strip/bill photos and a live scan
  path — both blocked on the AWS account-wide Bedrock restriction below. {{Fill in once a real
  accuracy run exists.}}
- **Cost:** the `ap-south-1` pricing table (`packages/contracts/src/pricing.ts`) is filled in for
  12 of 13 tracked SKUs from the AWS Price List API — the one gap, `bedrockOutputTokenPer1k`, has
  no SKU in any region, and no Anthropic Bedrock model is priced in `ap-south-1` at all (a real
  vision Lambda would need a cross-region inference profile). Per-scan cost can't be computed from
  real traffic yet — no live scan has reached `int` in the measurement window, same restriction.
  `GET /v1/public/metrics` (the public `/dashboard`) does show real, measured ingestion and alert
  fan-out cost and volume.
- **Latency:** retroactive check (add a medicine → CDSCO match found → alert fan-out to push and
  email) verified end-to-end against real `int` data in well under the 10-second target. Pharmacy
  bulk-check verified at 3.0–3.4s warm for a real 200-row CSV, comfortably under 5s.

## What we learned
- **This AWS account blocks Bedrock invoke, Textract, Translate, and Verified Permissions
  account-wide** — confirmed not an IAM or SCP issue (a root-user caller bypasses IAM entirely,
  `describe-organization` shows no org/SCP exists, and `get-foundation-model` shows the model is
  ACTIVE while `invoke-model` still returns `ValidationException: Operation not allowed` across
  four different providers). This shaped the whole second half of the build: every AWS-vision-
  dependent path had to ship code-complete and fixture-tested rather than live-verified.
- **Polly has zero Hindi or Kannada voices in `ap-south-1`** — not just Kannada, as the original
  docs assumed. Read-aloud falls back to the browser's own `speechSynthesis` for both languages.
- **A stored field that feeds a content hash must never depend on data that changes after the row
  is written.** A2's idempotency key derived from alias data that evolved over time, so re-running
  the same ingestion month created duplicates instead of no-ops — only caught by a real deploy and
  a real re-run, not by any unit test.
- **The shared HTTP API and Cognito user pool are single physical resources across every stage.**
  Deploying a lane to `int` while its own `dev-<lane>` sandbox was still registering the same
  routes caused a hard `ConflictException` — destroying the now-redundant sandbox stacks first
  fixed it, but this only shows up once you actually try a real integration deploy.
- **Two lanes' own unit tests can both pass while directly contradicting each other's real storage
  shape.** Lane M assumed lane S's stats document nested a `byMonth` breakdown; lane S actually
  wrote each month as its own separate table item. Both lanes' fixtures matched their own (wrong)
  assumption, so only a real call against real data on `int` surfaced the 500.
- **CloudFormation rejects two CloudWatch Metrics Insights queries combined into one Alarm**, only
  discovered at real `cdk deploy` time — undocumented in this codebase's assumptions going in.

See `submission/LEARNING_LOG.md` for the full, timestamped list (30+ entries across every lane).

## Limitations
- Coverage is limited to what CDSCO itself has published — Asli can't flag a batch CDSCO hasn't
  listed yet.
- Foil strips can be hard to photograph clearly; low-confidence reads are deliberately capped at
  "Verify" rather than guessed into a firm tier.
- The demo's flagged strip is a disclosed mock (real strip photography for the accuracy harness is
  still pending — see "Measured results").
- Real photo scanning, PDF/Textract ingestion fallback, Cedar-based sharing permissions, and
  Polly-voiced hi/kn read-aloud are all code-complete and fixture-tested, but not yet verified
  against live AWS calls, due to the account-wide restriction described above.

## What's next
- Clear the AWS Bedrock/Textract/Translate/Verified Permissions account restriction and run the
  accuracy harness against real strip and bill photos.
- Pharmacy mode at scale — the CSV bulk-check path is built and verified at 3–5s per 200-row file;
  the next step is onboarding real pharmacy partners.
- More languages beyond Hindi and Kannada, and native-speaker review of the current hand-drafted
  translations.
- {{Any partnership or scale plans the team wants to add.}}

## AI tools used
Claude Code (Anthropic) wrote most of the code in this repository under our direction, working
lane-by-lane from the specs in `docs/` and `plan/`, including this writeup and the blog post — the
git history's own commit trailers confirm two Claude Code model versions did the committing across
the build (`Co-Authored-By: Claude Sonnet 5` and `Co-Authored-By: Claude Haiku 4.5`). No other
AI coding tool (Copilot, Cursor, etc.) was used. Separately, and not a coding assistant: the scan
extraction Lambda calls Google's Gemini API as its default vision-extraction provider, with
Bedrock and Textract as runtime-switchable fallbacks (see "Where AWS fits" above and
`plan/INTEGRATION_LOG.md`) — this is a product-runtime dependency for reading strip/bill photos,
not a tool used to write the code, and it never influences the matching decision (CLAUDE.md rule
1: `packages/matching` alone decides the tier).

## Team
{{Names, roles, and Builder Center profile links for all teammates — needed for fast-track
eligibility per plan/tasks/Z2-submission-package.md Deliverable 6.}}
