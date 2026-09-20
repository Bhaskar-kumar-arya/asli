# The medicine in your cabinet might already be on a government recall list. You'd never know.

*Built at WeMakeDevs × AWS "First Commit" (Ship It track) — a 48-hour serverless build on AWS.*

## The hook

Every month, India's drug regulator — the Central Drugs Standard Control Organisation (CDSCO) —
publishes a list of medicine batches that failed quality testing or turned out to be spurious.
It's public. It's official. And almost nobody who actually owns one of those batches ever sees it,
because it's published as a government table or PDF, not pushed to the person standing in front of
their medicine cabinet.

Before writing a line of code, we wanted to know if that gap actually mattered, or if it was a
solution looking for a problem. So we hand-checked 171 flagged batches across three real CDSCO
central-lab alerts (Sep 2024, Jan 2025, Mar 2025). **170 of them (99.4%) were still within their
expiry date when CDSCO announced the alert**, with an average of about 9.6 months between
manufacture and announcement. In other words: when CDSCO flags a batch, it is almost always still
sitting in someone's home, not already thrown away.

Once we had a real ingestion pipeline running against 21 months of live CDSCO data, that spot check
held up: **3,326 flagged batches (3,274 NSQ + 52 Spurious), 99.47% still within expiry at
announcement, a median 9 months from manufacture to alert.** That's the problem Asli exists to
close — the gap between a list that exists and a family that's on the other side of it.

## What we built

Asli checks whether a medicine a family owns belongs to a batch CDSCO has flagged. You scan a
strip, a pharmacy bill, or a QR code — or just type the details in — and get a deterministic result
against every CDSCO NSQ and Spurious list, with a link back to the original source. Save it to a
shared family cabinet, and every caregiver in it gets alerted automatically the next time a new
CDSCO list matches, without anyone having to remember to re-check.

A pharmacy-mode CSV bulk-check and a problem-report flow routed to India's official PvPI
pharmacovigilance channel round out the two non-family use cases we scoped in.

## The interesting engineering decisions

**The LLM never decides anything.** This was the rule we cared about most, and it shaped almost
every downstream choice. `packages/matching` is the single, deterministic library that decides
FLAGGED / VERIFY / NO_ALERT_FOUND — string normalization, similarity thresholds, tier logic, all
plain code, all unit tested. Bedrock (or, as it turned out, Gemini — more on that below) only ever
*reads a photo* and hands back extracted fields. If a model hallucinates a batch number, the worst
case is a wrong lookup, never a wrong safety verdict quietly laundered through an LLM's judgment.

**"No alert found," never "safe."** It's tempting to show a green checkmark and the word "safe" —
it reads better in a demo. We banned it instead, enforced by an automated check on every rendered
result string, not just a style guideline in a doc nobody reads. CDSCO not having flagged a batch
yet is not the same claim as "this medicine is safe," and conflating the two is exactly the kind of
overclaim a safety product can't afford.

**Batch, never brand.** Every user-facing string refers to "this batch," never a manufacturer or
product line in general — including for Spurious results, where the label on a counterfeit often
impersonates a real, innocent manufacturer. Wording like "a batch carrying this label was found to
be spurious" protects a real company from being read as having made fake medicine.

**Structured endpoint over PDF scraping — with a fallback we actually needed to build.** CDSCO
turned out to have an undocumented but usable structured JSON endpoint, so ingestion parses that
directly instead of OCR-ing PDFs. We kept a PDF + Textract fallback for months the endpoint doesn't
cover, tested against fixtures.

**Two matching directions off the same DynamoDB Streams pattern.** A new CDSCO row checks every
saved medicine; a newly saved medicine checks the whole CDSCO history. Same stream-driven shape,
both directions — so a family never has to remember to manually re-check something they already
saved.

**One account-wide AWS restriction reshaped the whole second half of the build.** Partway through,
we confirmed — not guessed — that this AWS account blocks Bedrock `invoke-model`, Textract,
Translate, and Verified Permissions account-wide. We ruled out IAM and SCP as the cause directly:
a root-user call bypasses IAM policy entirely, `organizations describe-organization` confirmed no
org exists to apply an SCP, and `get-foundation-model` showed the model as `ACTIVE` while
`invoke-model` still threw `ValidationException: Operation not allowed` — consistently, across four
different model providers. Rather than block on an AWS support ticket, we made the scan-extraction
backend swappable at Lambda runtime via an SSM parameter: Gemini as the default (verified end-to-end
against a real Indian medicine box photo — it read batch/MRP/expiry fields cleanly where Textract's
OCR badly garbled the same dense small print), Textract as a zero-external-dependency fallback, and
the original Bedrock client kept intact behind the same interface so flipping back is one
`aws ssm put-parameter` call, not a redeploy, the moment account access clears.

## What's measured, honestly

We didn't want a demo where every number was aspirational, so here's exactly what's real and what
isn't:

- **Latency:** the retroactive check — add a medicine, get matched against CDSCO history, alert
  fan-out to push and email — was verified end-to-end against real data on our `int` environment,
  well under our 10-second target. Pharmacy bulk-check ran 3.0–3.4 seconds warm for a real 200-row
  CSV, under our 5-second target.
- **Cost:** our `ap-south-1` pricing table is filled in for 12 of 13 tracked AWS SKUs, pulled from
  the real AWS Price List API — the one gap is that no Anthropic Bedrock model is priced in
  `ap-south-1` at all, so a production Bedrock vision path would need a cross-region inference
  profile. `GET /v1/public/metrics` (our public `/dashboard`) shows real, measured ingestion and
  alert fan-out cost and volume from actual pipeline runs.
- **Accuracy:** measured with our harness (`tools/accuracy`) against the deployed stage. All 44
  seeded tier-correctness probes were right. On 15 real strip photos the batch number was read
  exactly 80.0% of the time (12 of 15; 3 of 3 flat-on, 9 of 12 tilted), the manufacturer was
  identified strongly on 86.7%, and the expiry month was exact on only 40.0% — our weakest field.
  On 6 real, redacted pharmacy bills, line recall was 50.0%. Average scan latency was about 5.7
  seconds. It is a small sample (15 strips and 6 bills against a target of 30 and 10), and the
  numbers are on the public `/dashboard`.

We'd rather show a small honest sample than an invented number, which is also why there is no
per-scan cost figure: no scans landed in the CloudWatch window, and Bedrock is unpriced in our region.

## What's next

- Grow the test set to the 30 strips and 10 bills we planned, shot by hand in poor light and at
  angles, and re-run the harness.
- Onboard real pharmacy partners onto the CSV bulk-check path, which is already verified at
  production-relevant speed.
- Native-speaker review of the current hand-drafted Hindi and Kannada guidance templates, and more
  languages beyond those two.
- Flip the extraction backend to Bedrock the moment this AWS account's model access restriction
  clears — the client is already built and ready.

The full writeup, architecture, and a 30+ entry timestamped learning log of what broke and what we
measured along the way are in the [GitHub repo](https://github.com/Bhaskar-kumar-arya/asli).
