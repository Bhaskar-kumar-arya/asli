# Asli — Know your batch

**Team bskry · WeMakeDevs × AWS "First Commit" · Ship It track (also considered for Build It's
criteria and Best UI, per the event's "one submission, all tracks" rule)**

| | |
|---|---|
| Live app (no sign-up needed, see below) | https://main.d2ag2oukltn4mc.amplifyapp.com |
| Public repository | https://github.com/Bhaskar-kumar-arya/asli |
| Demo video (≤ 3 min) | {{YOUTUBE_URL}} |
| AWS Builder Center blog post | {{BUILDER_CENTER_BLOG_URL}} (draft: `submission/BLOG_POST.md`) |

## Open the live app without signing up
The judges' notice asks that a live demo be openable without signing up. Asli has three ways in,
fastest first:

1. **Two pages need no account at all.** `/insights` (CDSCO alert counts by month and reason) and
   `/dashboard` (measured accuracy and running cost, straight from CloudWatch) are public.
2. **A ready-made demo account with a family cabinet already in it.** On the sign-in page enter
   `asha.demo@asli.internal` / `AsliDemo!2026`. This is a seeded demo account holding fake data
   only (no personal information). It opens on "Mom's medicines" with two saved medicines: one that
   matches a real CDSCO alert, one with no alert found.
3. **Or type a batch in by hand** (Check a medicine → Type details) once signed in. Two inputs to try,
   both confirmed against the live API on 2026-09-20:
   - Product `Montelukast & Levocetirizine`, batch `E9AIY029`, manufacturer `Pharma Force Lab`
     → **FLAGGED**, with the CDSCO alert month, the reporting lab and a link to the original CDSCO
     source. (This is a real row from CDSCO's Feb-2026 Not-of-Standard-Quality list.)
   - Product `Paracetamol 500mg`, batch `ZZ99TEST1`, manufacturer `Cipla`
     → **No alert found for this batch**.

"Create an account" also works, but it sends a real confirmation code by email, which is why the
demo account exists.

## The problem
Every month India's drug regulator, the Central Drugs Standard Control Organisation (CDSCO),
publishes lists of medicine batches that failed quality testing (Not of Standard Quality, "NSQ") or
were found to be Spurious. The lists are public and official, but they are government tables and
PDFs on sites families do not read. Nothing pushes them to the person standing in front of a
parent's medicine box.

We wanted to know whether that gap matters or whether we were inventing a problem. So we counted.

- **Hand check, before building anything:** 171 flagged batches across three CDSCO central-lab
  alerts (Sep 2024, Jan 2025, Mar 2025). **170 of 171 (99.4%) were still within their expiry date
  when CDSCO announced them**, about 9.6 months on average after manufacture.
- **Full real backfill, run by our own ingestion pipeline (21 months, 2024-11 to 2026-07):**
  3,326 flagged batches (3,274 NSQ + 52 Spurious). **3,204 (99.47%) were still within expiry at
  announcement.** Median 9 months from manufacture to announcement.

So when CDSCO flags a batch it is almost always still in someone's home. Nobody tells them.
The people on the other side of this are mostly the adult children who manage an elderly parent's
long-term medicines from another city, and the parent, who may need Hindi or Kannada and large text.
A pharmacist checking stock is the third user.

## What Asli does
1. **Check a medicine** three ways: photograph a strip, photograph a pharmacy bill (many medicines
   at once), or scan a pack QR code. Typing the details in always works too.
2. **Match deterministically** against every CDSCO NSQ and Spurious list. The result is one of
   three tiers: FLAGGED, VERIFY (partial or low-confidence match) or **"No alert found for this
   batch"**. Every FLAGGED or VERIFY result shows the alert month, the reporting lab, a link to the
   original CDSCO source and the reference to our stored snapshot of it.
3. **Save to a shared family cabinet.** Saving a medicine re-checks it against the whole CDSCO
   history straight away.
4. **Keep watching.** When CDSCO publishes a new list, our pipeline ingests it and checks every
   saved medicine in every cabinet. Every caregiver in the affected cabinet gets a web-push and an
   email. Nobody has to remember to re-scan.
5. **Share with roles.** Owner, Editor and Viewer roles decide who can add, remove or manage.
6. **Say what to do next, safely.** Guidance comes only from reviewed templates in English, Hindi and
   Kannada, with read-aloud. Every template says: do not stop a prescribed medicine without talking
   to your doctor.
7. **Two extensions.** Pharmacy mode bulk-checks a CSV of stock (200 rows in about 3 seconds).
   "Report a problem" routes a user's report to India's official PvPI pharmacovigilance channel
   instead of broadcasting one person's unverified report to everyone with the same batch.

### The rules the product will not break
These are in `CLAUDE.md`, and most are enforced by code or tests rather than by good intentions.
- **The tier is decided only by `packages/matching`.** No LLM ever decides or influences a tier. A
  model may only read the photo.
- **Never "safe".** The negative result is always "No alert found for this batch". An automated
  banned-words check runs over every rendered result.
- **Batch, never brand.** Nothing implies a brand or manufacturer is unsafe in general. For Spurious
  batches the wording is "a batch carrying this label was found to be spurious", because the label's
  manufacturer may have been impersonated.
- **No generated advice reaches a user.** A result is rendered from reviewed templates, never composed.
- **Privacy.** Bill images are deleted right after extraction. Logs carry IDs and counts only.
- **Polite to CDSCO.** No user request ever calls CDSCO. Only the ingestion pipeline does, at most
  daily, with a 2-second delay between requests and an identifying User-Agent, saving every raw
  response to S3 first.

## Who did what
Team **bskry**: four people, and **two laptops** between all of us for almost the whole build, with
**one more laptop brought in near the end**. Git records the laptop, not the person, so the author
names in the history are laptop identities: `HEET SHAH` (57 commits) and `devestrator` (30) are the
two shared laptops, and `YashasYogindra` (1 commit, the uploads-bucket CORS fix, `41e1826`) is the
third laptop, used at the end. **Commit counts do not measure who did what.** The table is the
division of responsibility: each area has one owner who decides it, reviews it and answers for it.

| Person | Owns | What that covers in this repository |
|---|---|---|
| Bhaskar Kumar Arya | **Backend and the data pipeline** | The CDSCO ingestion pipeline (EventBridge Scheduler, Step Functions, S3 snapshots, DynamoDB); the deterministic matching library and its tier rules; the scan, check, cabinet, sharing and alert fan-out Lambdas; the public stats, metrics and insights endpoints; pharmacy-mode CSV check; problem reports routed to PvPI; the account-deletion endpoint. |
| Pushya Jain | **Frontend (the web app)** | The React PWA in `apps/web`: the scan flow (strip, bill and QR capture, confirm-the-fields step), the result screens, the cabinet, members and sharing screens, sign-in and account creation, type-ahead on medicine and manufacturer, web-push subscription, the public insights and dashboard pages. |
| Heet Shah | **Design and product content** | The visual system, "The Analyst's Record" (`apps/web/DESIGN.md`) and the screen-by-screen UX; the result-card wording rules (never "safe", batch not brand, the spurious-label nuance); the reviewed English, Hindi and Kannada guidance templates and read-aloud behaviour; the mock strip and the README screenshots. |
| Yashas Yogindra | **Architecture, AWS infrastructure and delivery** | System shape and service choices; the shared CDK stack and every lane's stack (14 in `ap-south-1`), Cognito, Amplify Hosting and API Gateway CORS wiring, and the deploys; observability, alarms, budgets and the cost model; integration across areas; the submission package (README, this writeup, the demo video and the blog post). |

Everyone shared the parts that needed several hands: collecting the real strip photos and redacted
pharmacy bills for the test set, and checking the app on real phones.

## How it works
```
EventBridge Scheduler (daily) → Lambda: any new CDSCO month?
   → Step Functions: fetch CDSCO endpoint → save raw response to S3 → parse + normalise
   → DynamoDB FlaggedBatches
DynamoDB Streams ─ new CDSCO row   → check every saved medicine  ┐
DynamoDB Streams ─ new saved med   → check the whole CDSCO history ┴→ SNS → web push + SES email
React PWA (Amplify Hosting) → Cognito → API Gateway → Lambda (scan, check, cabinet, members, …)
```
Both matching directions run off the same DynamoDB Streams pattern, so a family never has to
remember to re-check something already saved. The architecture diagram is in `README.md` and
`docs/diagrams/architecture.png`.

## Where AWS fits
Everything runs in `ap-south-1`, is defined in AWS CDK (TypeScript, 14 stacks) and scales to zero.
The status column is deliberate: it says what we ran against real AWS, and what is code-complete but
was blocked (see "AWS feedback").

| Service | What it does in Asli | Status |
|---|---|---|
| Amplify Hosting | Hosts the PWA at the live URL | **Live** |
| Cognito | Sign-in, JWT for the API. Sign-in verified against the live pool 2026-09-20 | **Live** |
| API Gateway (HTTP API) + Lambda (Node.js 22) | Every endpoint: scan, check, cabinet, members, pharmacy, reports, public stats | **Live** |
| DynamoDB (on-demand) + Streams | Key lookups by batch; streams drive both matching directions | **Live**. Add a medicine → CDSCO match → alert event verified end to end in well under 10 s |
| S3 | Raw CDSCO snapshots (the "what was published, and when" evidence), photo uploads on a 1-day lifecycle, public metrics | **Live** |
| EventBridge Scheduler + Step Functions | Daily new-month check; the ingestion state machine with retries, a Map state for backfill and a visible execution | **Live**. Ran a real 21-month backfill |
| SNS + SES + Web Push (VAPID) | One alert event fans out to email and phone push | **Live**. Email delivered to a real inbox. Push accepted by the push service (`pushSent: 1`); not yet seen on a physical Android phone |
| CloudWatch (EMF metrics, dashboard, alarms), Budgets | Cost and accuracy evidence behind the public `/dashboard`; alarms; a $50 budget alert | **Live** |
| AWS CDK, SSM Parameter Store, Secrets Manager | One-command deploy; lanes read shared resources through SSM; the vision key lives in Secrets Manager | **Live** |
| Textract | Scan-extraction fallback (`DetectDocumentText`) works. The PDF ingestion fallback (`AnalyzeDocument` on bulk PDFs) is blocked account-wide and unmerged | **Partly live** |
| Bedrock (Converse, vision) | Wired and IAM-granted as a runtime-switchable extractor, and for classifying unmapped failure reasons at ingestion | **Blocked in this account**, see below |
| Amazon Verified Permissions (Cedar) | Cedar schema and policies for Owner/Editor/Viewer are written and tested in `packages/authz` | **Blocked**. Sharing is enforced live by a stub that implements the same role table |
| Translate + Polly | Hindi/Kannada templates were to be drafted with Translate and read aloud with Polly | **Blocked**. Templates are hand-drafted and need native-speaker review. Read-aloud uses the browser's `speechSynthesis` |

**One non-AWS dependency, stated plainly.** Because Bedrock invocation is refused in this account,
the live strip/bill photo reader is Google's Gemini API, called from our Lambda with the key in
Secrets Manager. The provider is an SSM parameter read at runtime
(`/asli/<stage>/scan/extractionProvider`: `bedrock` | `textract` | `gemini`), so moving back to
Bedrock is one `put-parameter`, not a redeploy. It reads fields only. It never sees, decides or
influences a tier.

## What is measured
| | Result | Basis |
|---|---|---|
| Deterministic tiering | **44 / 44** seeded cases correct | Probes generated from real CDSCO rows |
| Strip reading, batch number exact | **80.0%** (12 of 15) | Real photos. Flat-on 3 of 3, tilted 9 of 12. Small sample |
| Strip reading, manufacturer identified strongly | 86.7% (13 of 15) | Same 15 photos |
| Strip reading, expiry month exact | 40.0% (6 of 15) | Same 15 photos. Our weakest field |
| Bill reading, line recall | 50.0% | 6 real, redacted pharmacy invoices |
| Average scan latency | ~5.7 s | Harness run against the deployed stage, zero timeouts |
| Retroactive check → alert fan-out | well under the 10 s target | Real data, deployed stage |
| Pharmacy CSV, 200 rows | 3.0–3.4 s warm | Real run |

These are on the public `/dashboard` (`GET /v1/public/metrics`), not only in this document.
The test set is 15 strips and 6 bills against a target of 30 and 10, so treat the accuracy figures
as a small, honest sample, not a benchmark.

**Cost is not yet measured per scan.** The `ap-south-1` price table is filled in for 12 of 13 SKUs
straight from the AWS Price List API. The 13th, Bedrock output tokens, has no SKU in any region, and
no Anthropic model is priced in `ap-south-1` at all. The trailing CloudWatch window held no scans,
so the dashboard shows a projection for 10,000 families with its assumptions stated, not a measured
per-scan figure. We would rather show that than an invented number.

## What we learned
Judged as "four days should leave you knowing something you didn't on Thursday". These are the ones
that changed how we build; `submission/LEARNING_LOG.md` has all 30+, each timestamped by lane.

- **Unit tests passed while the live site had never worked.** Driving the deployed site with a real
  headless browser found four stacked bugs: Amplify env vars never set, a doubled `/v1/v1` path, an
  auth module still reading a placeholder localStorage key so no request carried a token, and API
  Gateway CORS that only allowed `localhost`. Unit tests (jsdom has no CORS), local dev and every
  Node-script "live check" bypassed the browser, so none could see it.
- **Then it happened again on photo upload.** CORS on the uploads bucket, then a `403` from S3
  because we sent `Content-Type` twice and broke the presigned-POST policy condition.
- **An env-var-driven CDK setting with no default silently regresses on the next redeploy.** A deploy
  without `AMPLIFY_URL` dropped the Amplify origin from CORS with no warning. It now has a default.
- **A stored field that feeds a content hash must not depend on data that changes later.** Our
  ingestion idempotency key used alias data that evolved, so re-running a month created duplicates.
  Only a real re-run showed it.
- **Two lanes' tests can both pass while contradicting each other.** One assumed a stats document
  nested a per-month breakdown; the other wrote each month as its own item. A real call returned 500.
- **A bare `fetch()` in a Lambda with a retry loop has no retry.** With no per-attempt timeout, the
  function's own timeout was the only thing that could end a hung Gemini call. Fixed at 12 s per
  attempt, then confirmed by re-running the same test set with zero timeouts.
- **A fresh reviewer beat every automated gate.** All tests, lint and a design detector passed a
  FLAGGED stamp that read "ON RECORD" when the alert category was unknown. In plain English that
  reads as *legitimate*. It now says "Listed by CDSCO".
- **Check what a fixture value actually is before reusing it.** Real drug names in our fixtures,
  invented company names beside them. Reusing the company names as type-ahead suggestions would have
  implied real firms are commonly flagged, so the manufacturer list is a separate, real one.

## AWS feedback
Written for the people who make these services, from a team building on them for four days.

**What worked well**
- **Step Functions** made ingestion legible. A visible execution for a retrying, branching pipeline
  is worth more in a demo than any diagram, and the Map state made the 21-month backfill trivial.
- **DynamoDB Streams** let one pattern serve both matching directions with no polling and no queue
  to babysit.
- **Amplify Hosting** put a real HTTPS URL up in minutes. **CDK** meant a whole 14-stack system
  redeployed in one command and stayed reviewable in diffs.
- **Powertools for AWS Lambda** gave structured logs, EMF metrics and idempotency without ceremony.

**What cost us time**
- **"Operation not allowed" with no way to tell why.** `bedrock-runtime:InvokeModel` returned
  `ValidationException: Operation not allowed` while `get-foundation-model` reported the model
  ACTIVE. Textract bulk analysis and Translate returned `SubscriptionRequiredException`, and
  Verified Permissions failed the same way. It took a session to prove it was not IAM (a root caller
  hit it too) and not an SCP (no organisation existed). An error that says an account-level
  entitlement is missing, and where to request it, would have saved most of a day. It is also the
  reason three of our four planned AI services shipped code-complete but unverified.
- **Polly has no Hindi or Kannada voices in `ap-south-1`.** For an app whose users include parents
  who read Hindi and Kannada, this is the gap that matters most. It is easy to miss before you build
  a read-aloud feature on it.
- **No Anthropic model is priced in `ap-south-1`, and one Bedrock SKU is missing from the Price List
  API.** The public pricing pages render client-side, so they cannot be read by a script. A team that
  must show cost per scan cannot compute it for the region it deploys in.
- **CloudFormation rejects two CloudWatch Metrics Insights queries combined in one alarm** with
  `Invalid metrics list` and no hint about which rule it broke. We found it only at real deploy time.
- **The HTTP API and Cognito user pool are single physical resources across stages in our design.**
  That is our design, but a `ConflictException` on duplicate routes is not a friendly way to learn it.

## Rubric map
| Criterion | Where to look |
|---|---|
| Idea and impact | "The problem": 99.47% of 3,326 flagged batches were still within expiry when announced, so the alert almost always arrives while the medicine is still in the home |
| Built on AWS | "Where AWS fits" (status column) and the architecture diagram; the video shows the Step Functions execution, DynamoDB, CloudWatch and Amplify |
| Learning | "What we learned" and "AWS feedback" |
| Execution | "Open the live app" (try it yourself) and "What is measured" |
| Demo video | `submission/DEMO_SCRIPT.md`: what it does, who it is for, where AWS fits, in under 3 minutes |
| Best UI | `apps/web/DESIGN.md`: the app is styled as a lab's bench register. There is no green anywhere, and "No alert found" renders as no stamp at all, so the medium cannot say "safe". Three scripts (English, Devanagari, Kannada) sit in ruled bands like an Indian station nameboard. Contrast measured off rendered elements at 4.5:1 or better, no horizontal overflow at 360 px with large text |

## Limitations
- Asli can only flag what CDSCO has published. "No alert found" means exactly that. It is not a
  statement that a batch is safe, and the app never says it is.
- Low-confidence reads are capped at VERIFY rather than guessed into a firm tier. Foil strips are
  hard to photograph. Expiry-month reading is only 40% exact.
- Accuracy rests on 15 strips and 6 bills, mostly sourced photos rather than shot by us. The demo's
  flagged strip is a **mock strip that matches a real CDSCO alert**, and the video says so on screen.
- The Hindi and Kannada guidance is hand-drafted and has not had a native-speaker review.
- Cedar sharing rules run through the stub, not Verified Permissions. PDF ingestion fallback and
  Polly voices are unverified or unavailable for the reasons above. QR decoding passed 2 of 2 real
  pack photos and is behind a feature flag, short of the 3 we wanted.
- The Feb-2026 "new alert" moment in the video is a **replay of a real past alert**, labelled as a
  demo replay in the app and email.

## What's next
- Clear the account restriction and run the accuracy harness on Bedrock as well as Gemini.
- Take the test set to the 30 strips and 10 bills we planned, shot by hand in poor light and at angles.
- Native-speaker review of Hindi and Kannada, then more languages.
- Real pharmacy pilots for the CSV bulk-check.

## AI tools used
- **Claude Code (Anthropic)** is the AI coding tool we used. We used it during the coding process,
  alongside work we did by hand, running it one session per area from the written specs in `docs/`
  and `plan/` and the rules in `CLAUDE.md`. We also used it to draft documentation such as this
  document and the blog post. The owner of each area (see "Who did what") directed and reviewed the
  work, and we checked the results against the deployed app. Commits made with its help carry a
  `Co-Authored-By: Claude` trailer, so the extent of its use is visible in the repository's commit
  history (`git log --grep 'Co-Authored-By: Claude'`). The trailers name three models: Claude
  Sonnet 5, Claude Opus 5 (used for the web redesign) and Claude Haiku 4.5. No other AI coding tool
  (Copilot, Cursor and so on) was used.
- **Impeccable**, a design-linting CLI, ran over the redesign (`.impeccable/`). Its `detect` check
  returned no findings.
- **Google Gemini API** is a *runtime* dependency for reading photos (see "Where AWS fits"), not a
  tool used to write the code.

## Credits and licences
Repository code is MIT (`LICENSE`). Test-set photos sourced from Wikimedia Commons are listed with
their licences in `testset/sources.md`. Fonts (Archivo, Anonymous Pro, Noto Sans Devanagari and
Kannada) are open-licence Google Fonts.
