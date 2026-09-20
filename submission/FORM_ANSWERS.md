# FORM_ANSWERS.md — paste-ready answers for the First Commit submission form

The form (https://www.wemakedevs.org/aws/first-commit/submit) could not be read without signing in,
so the field names below are the ones the organisers' notice and the event rules ask for: the idea,
the problem, what the project does, who did what, AWS usage with feedback, a demo video, a repository
and the AI tools used. Match each block to whichever field the form actually shows.
`submission/WRITEUP.md` is the long version; these are the pasteable ones.

**One submission per team. Submit early and improve, since a late submission is not scored.**

## Basics
- **Project name:** Asli
- **Tagline:** Know your batch. Check whether a medicine your family owns is on a CDSCO recall list,
  and get alerted when a new list matches.
- **Team name:** bskry
- **Track:** Ship It (deployed on AWS). The event scores one submission for Ship It, Build It and
  Best UI, so there is nothing else to pick.
- **Repository (public):** https://github.com/Bhaskar-kumar-arya/asli
- **Live demo:** https://main.d2ag2oukltn4mc.amplifyapp.com
- **Demo video (YouTube, unlisted or public):** {{YOUTUBE_URL}}
- **AWS Builder Center blog post (optional, top 5 win a keyboard):** {{BUILDER_CENTER_BLOG_URL}}
- **Builder Center profiles (all four, must be accurate):** {{BUILDER_CENTER_PROFILE_LINKS}}

## Live demo access (put this in the "how do we open it" field)
No sign-up needed. Open the link and press the **"Continue as guest"** button (guest mode) on the first screen. It
signs in to a sample family's cabinet ("Mom's medicines", fake data only) with no typing. The public
pages open from the "Open to anyone" links on the same screen. If the button ever fails, sign in by
hand with `asha.demo@asli.internal` / `AsliDemo!2026`. To see a FLAGGED result, choose Check a medicine → Type details and enter product
`Montelukast & Levocetirizine`, batch `E9AIY029`, manufacturer `Pharma Force Lab` (a real row from
CDSCO's Feb-2026 list). For "No alert found for this batch", enter any other batch.

## What is the idea? (short)
India's drug regulator, CDSCO, publishes monthly lists of medicine batches that failed quality tests
or were found spurious, as government tables and PDFs that families never see. Asli lets a family
scan a strip, a pharmacy bill or a QR code, checks the batch against every CDSCO list, saves their
medicines in a shared cabinet, and alerts every caregiver when a new list matches. The match is
deterministic code, never an AI's opinion.

## What problem does it solve, and for whom?
Of 3,326 flagged batches we ingested across 21 months of CDSCO data, 99.47% were still within expiry
when CDSCO announced them, a median 9 months after manufacture. So the medicine is almost always
still in the home when the alert appears, and nobody tells the family. Asli is built first for the
adult child managing an elderly parent's long-term medicines from another city, then for the parent
(Hindi, Kannada, large text, read-aloud) and for a pharmacist checking stock in bulk.

## What does the project actually do? (detailed)
- Reads a batch from a strip photo, a bill photo or a QR code, or takes typed details.
- Matches it against every CDSCO NSQ and Spurious list and returns FLAGGED, VERIFY, or "No alert
  found for this batch". Never the word "safe". Every FLAGGED or VERIFY result cites the alert month,
  the reporting lab and the original CDSCO source, with our stored snapshot reference.
- Saves medicines to a shared cabinet with Owner, Editor and Viewer roles. Each save is re-checked
  against the full history at once.
- When a new CDSCO list is ingested, checks every saved medicine and sends web-push and email to the
  cabinet's caregivers.
- Gives next-step guidance only from reviewed English, Hindi and Kannada templates, always including
  "do not stop a prescribed medicine without talking to your doctor".
- Pharmacy mode bulk-checks a CSV (200 rows in about 3 s). A problem report goes to India's official
  PvPI channel rather than to other users.
- Public pages show CDSCO alert counts and the app's own measured accuracy and cost.

## Who did what?
Four people, two laptops between us for almost the whole build and one more laptop near the end, so
git shows laptop names, not people, and commit counts are not a measure of contribution. Each area
has one owner:
- **Bhaskar Kumar Arya, backend and data pipeline:** CDSCO ingestion (EventBridge Scheduler, Step
  Functions, S3, DynamoDB); the deterministic matching library; the scan, check, cabinet, sharing and
  alert fan-out Lambdas; public stats, metrics and insights; pharmacy CSV check; PvPI problem reports.
- **Pushya Jain, frontend:** the React PWA: scan flow (strip, bill, QR), result screens, cabinet and
  sharing screens, sign-in and account creation, type-ahead, web-push subscription, public pages.
- **Heet Shah, design and product content:** the visual system ("The Analyst's Record") and UX;
  result-card wording rules; the reviewed English, Hindi and Kannada guidance templates and
  read-aloud; the mock strip and screenshots.
- **Yashas Yogindra, architecture, AWS infrastructure and delivery:** system shape and service
  choices; CDK stacks, Cognito, Amplify and CORS wiring, and deploys; observability and cost model;
  integration; the submission package (README, writeup, video, blog).
- Shared: collecting real strip photos and bills for the test set, and testing on real phones.

## Which AWS services, how, and what feedback?
**Used, and running:** Amplify Hosting (the live URL), Cognito (sign-in), API Gateway HTTP API and
Lambda on Node.js 22 (every endpoint), DynamoDB with Streams (batch lookups, and both matching
directions with no polling), S3 (raw CDSCO snapshots, photo uploads on a 1-day lifecycle, public
metrics), EventBridge Scheduler and Step Functions (the daily ingestion pipeline; it ran a real
21-month backfill), SNS and SES (email alerts; delivered to a real inbox), Web Push, CloudWatch
(metrics, dashboard, alarms), Budgets, CDK (14 stacks in `ap-south-1`), SSM and Secrets Manager.
**Written and tested but blocked in our account:** Bedrock vision, Textract bulk-PDF analysis,
Translate, and Amazon Verified Permissions with Cedar policies. The live photo reader is therefore
Google's Gemini API, switchable to Bedrock with one SSM parameter. Sharing roles run on a stub of the
same Cedar role table.
**Feedback:** Step Functions, DynamoDB Streams, Amplify and CDK were excellent for a four-day build.
The pain was `Operation not allowed` / `SubscriptionRequiredException` on Bedrock, Textract,
Translate and Verified Permissions with no message saying an account-level entitlement was missing
or where to request it (it took a session to prove it was not IAM or an SCP); no Hindi or Kannada
Polly voices in `ap-south-1`; no Anthropic model priced in `ap-south-1` and a missing Bedrock
Price List SKU, which blocks a cost-per-scan figure; and a CloudFormation `Invalid metrics list` when
two Metrics Insights queries share one alarm, with no hint at the cause.

## What did you learn?
The live site had never worked in a real browser even though every unit test passed: four stacked
bugs (env vars, a doubled path prefix, a placeholder auth module, CORS) that jsdom and Node-script
checks cannot see, found only by driving the deployed site with a real browser. Also that a stored
field feeding an idempotency hash must not depend on data that changes later; that a bare `fetch()`
in a Lambda has no working retry; and that a fresh reviewer caught a FLAGGED stamp reading "ON RECORD"
(which reads as legitimate) that passed every automated check. Full log: `submission/LEARNING_LOG.md`.

## What is measured, and what is not?
Measured: 44 of 44 deterministic tier checks correct; batch number read exactly on 12 of 15
sourced-online strip photos (80.0%); bill line recall 50.0% on 6 real bills; about 5.7 s average
scan latency; alert fan-out well under 10 s; 200-row pharmacy CSV in 3.0–3.4 s. Separately, an
informal hand-checked pass on our own real strip photos (not run through the automated harness)
got the batch number exactly right on 49 of 53 (92.5%). Not measured: cost per scan (no scans in
the CloudWatch window, and Bedrock is unpriced in our region). The harness test set is small (15
strips, 6 bills) and we say so.

## Which AI tools did you use?
Claude Code (Anthropic) is the AI coding tool we used. We used it during the coding process,
alongside work we did by hand, one session per area from written specs, with each area's owner
directing and reviewing. Commits made with its help carry a `Co-Authored-By: Claude` trailer, so the
extent is visible in the public git history. The trailers name Claude Sonnet 5, Claude Opus 5 and
Claude Haiku 4.5. No other AI coding tool was used. Impeccable (a design-linting CLI) ran over the web
redesign. Separately, the Google Gemini API is a runtime dependency for reading photos, not a coding
tool.

## Anything the judges should know
The flagged strip in the video is a **mock strip matching a real CDSCO alert**. The "new alert
arrives" moment is a **replay of a real past alert**, labelled as a demo replay in the app and email.
