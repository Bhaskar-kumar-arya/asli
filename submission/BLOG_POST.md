# The medicine in your cabinet might already be on a government alert list. You'd never know.

*Built by team bskry for the WeMakeDevs × AWS "First Commit" hackathon (Ship It track): a four-day serverless build on AWS.*

- **Try it:** https://main.d2ag2oukltn4mc.amplifyapp.com (press "Continue as guest", no sign-up needed)
- **Code:** https://github.com/Bhaskar-kumar-arya/asli
- **3-minute demo:** {{YOUTUBE_URL}}

## The problem

Every month, India's drug regulator, the Central Drugs Standard Control Organisation (CDSCO), publishes
a list of medicine batches that failed quality testing or turned out to be spurious. The list is
public, but almost nobody who owns one of those batches ever sees it. It comes out as a government
table or a PDF, and nothing pushes it to the person standing in front of their medicine cabinet.

Before writing any code, we wanted to know whether that gap mattered or whether we were solving a
problem nobody had. So we hand-checked 171 flagged batches across three real CDSCO central-lab alerts
(Sep 2024, Jan 2025, Mar 2025). **170 of them (99.4%) were still within their expiry date when CDSCO
announced the alert**, about 9.6 months on average after manufacture. When CDSCO flags a batch, it is
almost always still sitting in someone's home.

Once our ingestion pipeline had run against 21 months of live CDSCO data, the spot check held up:
**3,326 flagged batches (3,274 NSQ and 52 Spurious), 99.47% still within expiry at announcement, a
median of 9 months from manufacture to alert.** That gap, between a list that exists and a family that
never sees it, is what Asli is for.

## What we built

Asli checks whether a medicine a family owns belongs to a batch CDSCO has flagged. You scan a strip, a
pharmacy bill or a QR code, or type the details in, and get a deterministic result against every CDSCO
Not of Standard Quality (NSQ) and Spurious list, with a link back to the original source. Save the
medicine to a shared family cabinet and every caregiver in it is alerted when a new CDSCO list matches,
without anyone having to remember to re-check.

The primary user is the adult child managing an elderly parent's medicines from another city. A
pharmacy-mode CSV bulk check and a problem-report flow routed to India's official PvPI
pharmacovigilance channel cover two other users.

## The stack

![Asli architecture diagram](https://raw.githubusercontent.com/Bhaskar-kumar-arya/asli/main/docs/diagrams/architecture.png)

Everything runs in `ap-south-1`, is defined in AWS CDK and scales to zero.

- **Amplify Hosting** serves the React PWA, **Cognito** handles sign-in, and **API Gateway** with
  **Lambda** (Node.js 22) serves every endpoint.
- **EventBridge Scheduler** checks daily for a new CDSCO month. **Step Functions** runs the ingestion
  pipeline, and every raw CDSCO response is saved to **S3** before anything is parsed.
- **DynamoDB** (on demand) holds the flagged batches and the family cabinets. **DynamoDB Streams**
  drive matching in both directions.
- **SNS** fans one alert out to **SES** email and Web Push.
- **CloudWatch** backs a public dashboard of measured accuracy and cost.
- **One non-AWS piece:** the Gemini API reads the photos, for a reason covered below.

## Decisions that shaped it

**The LLM never decides anything.** This was the rule we cared about most. `packages/matching` is a
single deterministic library that decides FLAGGED, VERIFY or NO_ALERT_FOUND: string normalization,
similarity thresholds and tier logic, all plain code and all unit tested. A vision model only reads a
photo and hands back fields. If it misreads a batch number, the worst case is a wrong lookup, never a
wrong safety verdict.

**"No alert found", never "safe".** It is tempting to show a green tick and the word "safe", because
it reads better in a demo. We banned it, and an automated check enforces the ban on every rendered
result. CDSCO not having flagged a batch yet is not the same claim as "this medicine is safe".

**Batch, never brand.** Every user-facing string refers to "this batch". For Spurious results the
label on a counterfeit often impersonates a real, innocent manufacturer, so the wording is "a batch
carrying this label was found to be spurious".

**A structured endpoint instead of PDF scraping.** CDSCO has an undocumented but usable JSON endpoint,
so ingestion parses that directly. We also wrote a PDF and Textract fallback and tested it against
fixtures, but it is not deployed: the endpoint worked, and Textract's bulk PDF analysis is blocked in
our account.

**Two matching directions from the same DynamoDB Streams pattern.** A new CDSCO row checks every saved
medicine, and a newly saved medicine checks the whole CDSCO history. A family never has to remember to
re-check something they already saved.

## What fought back

**One account-wide AWS restriction reshaped the second half of the build.** Bedrock `InvokeModel`
returned `ValidationException: Operation not allowed` while `get-foundation-model` showed the model
as `ACTIVE`. Textract bulk analysis, Translate and Verified Permissions failed too. We ruled out IAM (a
root-user call hit the same wall) and SCPs (no organisation existed). Rather than wait on a support
ticket, we made the photo-reading backend switchable at runtime through an SSM parameter. Gemini is the
default, Textract's plain photo OCR is a fallback, and the Bedrock client stays intact, so switching
back is one `aws ssm put-parameter`, not a redeploy. The consequences are stated plainly in the repo:
caregiver sharing runs on a stub that enforces the same Cedar role table, because Verified Permissions
is blocked.

**Every test passed, and the live site had never worked in a real browser.** We drove the deployed site
with a headless browser and found four stacked bugs that unit tests and Node scripts could not see:
the Amplify environment variables had never been set, an API path was prefixed twice (`/v1/v1`), the
cabinet client still read a placeholder auth module so no request carried a token, and API Gateway's
CORS only allowed `localhost`. Photo upload then broke twice more: first CORS on the uploads bucket,
then a `403` from S3 because we sent `Content-Type` twice and broke the presigned POST policy.

**A `fetch()` with no timeout means the retry loop never runs.** Some bill scans timed out at 30
seconds. The Gemini call sat inside a two-attempt retry loop, but with no per-attempt timeout a hung
first call consumed the whole Lambda budget, so the second attempt could never happen. A 12-second
per-attempt timeout fixed it, and re-running the same test set gave zero timeouts.

**A fresh reviewer beat every automated gate.** All tests, lint and a design detector passed a
FLAGGED stamp that read "ON RECORD" whenever the alert category was unknown. In plain English that
reads as legitimate, the opposite of the meaning. It now says "Listed by CDSCO".

## What's measured, honestly

We did not want a demo where every number was aspirational, so here is what is real and what is not.

- **Latency:** saving a medicine, matching it against CDSCO history and fanning the alert out to push
  and email was verified end to end on real data, well under our 10-second target. A 200-row pharmacy
  CSV checked in 3.0 to 3.4 seconds warm.
- **Accuracy:** measured with our harness (`tools/accuracy`) against the deployed stage. All 44 seeded
  tier-correctness probes were right. On 15 sourced-online strip photos the batch number was read
  exactly 80.0% of the time (12 of 15; 3 of 3 flat-on, 9 of 12 tilted), the manufacturer was
  identified strongly on 86.7%, and the expiry month was exact on only 40.0%, our weakest field. On 6
  real, redacted pharmacy bills, line recall was 50.0%. Average scan latency was about 5.7 seconds. It
  is a small sample, 15 strips and 6 bills against a target of 30 and 10, and the numbers are on the
  public `/dashboard`. Separately, an informal hand-checked pass on our own real strip photos, not run
  through the automated harness, read the batch number exactly right on 49 of 53 (92.5%).
- **Cost:** there is no per-scan figure. No scans landed in the CloudWatch window, and no Anthropic
  model is priced in `ap-south-1`. The dashboard shows ingestion and alert cost, and a projection for
  10,000 families with its assumptions stated.

We would rather show a small honest sample than an invented number.

## What we'd tell AWS

- Tell us when an account-level entitlement is missing, and where to request it. The error
  `Operation not allowed` on a model that reports `ACTIVE` cost us most of a day, and it is why three
  of our planned AI services shipped written and tested but unverified.
- Amazon Polly has no Hindi or Kannada voices in `ap-south-1`. For an app whose users include
  Hindi- and Kannada-reading parents, that is the gap that matters most.
- Price the models in the region you deploy to, and keep the Price List API complete, so a team can
  compute cost per request.

## What's next

- Grow the test set to the 30 strips and 10 bills we planned, shot by hand in poor light and at
  angles, and re-run the harness.
- Get a native-speaker review of the hand-drafted Hindi and Kannada guidance, then add languages.
- Onboard real pharmacy partners onto the CSV bulk check.
- Switch the photo reader back to Bedrock the moment the account restriction clears.

The full writeup, the architecture, and a timestamped learning log of what broke and what we measured
are in the [GitHub repo](https://github.com/Bhaskar-kumar-arya/asli).
