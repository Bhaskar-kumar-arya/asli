# Asli — writeup (template; lane Z2 completes with real numbers)

## The problem
{{Who is affected, what CDSCO publishes, why families don't see it. Headline statistics from lane S with the months and data sources used.}}

## What we built
{{Scan a strip, bill or QR, or type details → deterministic match against every CDSCO NSQ and Spurious list → result with source and guidance → shared family cabinet → alerts when a new list matches.}}

## How it works
{{Architecture diagram. Ingestion pipeline, matching rules summary (batch + manufacturer, tiers), alerts, permissions.}}

## Where AWS fits
| Service | What it does in Asli | Why this and not the alternative |
|---|---|---|
{{Copy and update from docs/ARCHITECTURE.md}}

## Decisions we're proud of
- Deterministic matching; the LLM only reads images.
- "No alert found", never "safe"; batch-level wording.
- Structured endpoint over PDF OCR (with a fallback).
- Crowd reports routed to PvPI instead of warning other users.
- No generated safety text reaches users, so no guardrail-dependent advice.
- Bill images deleted immediately.

## Measured results
- Accuracy: {{by method and condition, from lane E}}
- Cost: {{per 1,000 scans, per monthly run, 10,000-family projection with assumptions, from lane J}}
- Latency: {{p50/p95 scan}}

## What we learned
{{Pick the best 4–6 entries from LEARNING_LOG.md, each with what broke or what we measured.}}

## Limitations
- Coverage is limited to CDSCO's published lists.
- Foil strips can be hard to read; low-confidence reads are capped at "Verify".
- Demo flagged strip is a disclosed mock.

## What's next
{{Pharmacy mode at scale, more languages, partnerships with pharmacies.}}

## AI tools used
Claude Code (Anthropic) wrote most of the code under our direction, using the specs in docs/ and plan/. {{List any others.}}

## Team
{{Names and roles}}
