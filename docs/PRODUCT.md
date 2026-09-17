# PRODUCT.md

## One line
Asli tells a family whether a medicine they own belongs to a batch CDSCO has officially flagged as Not of Standard Quality or Spurious, and keeps watching their medicines every month.

## Users
**Primary: the caregiver.** An adult child (25–45) managing an elderly parent's long-term medicines, often from another city, often sharing the job with siblings.
**Secondary: the parent.** 60+, may use the app with large text and read-aloud, in Hindi or Kannada.
**Extension: the pharmacist.** Checks stock or a supplier invoice in bulk (pharmacy mode, Wave 2).

## Problem
CDSCO publishes monthly alerts listing batches that failed tests at central and state labs. They are published as tables and PDFs on government sites that consumers do not read. No practical consumer tool matches a family's own batches to these lists.

## Evidence (verified by hand, to be recomputed by lane S)
| Alert month (central labs) | Batches | Within expiry at announcement | Avg months from manufacture to alert |
|---|---|---|---|
| Sep 2024 | 49 | 48 | 11.0 |
| Jan 2025 | 52 | 52 | 9.6 |
| Mar 2025 | 70 | 70 | 8.6 |
| Total | 171 | 170 (99.4%) | ~9.6 |

Headline for the demo (only after lane S confirms on the full backfill): flagged batches are typically still within expiry, often by about a year, when CDSCO announces them.

## Core promise and its limits
- Asli checks against CDSCO's published lists. A batch not on a list is "No alert found", not "safe".
- Alerts are batch-specific. Asli never implies a brand is unsafe.
- Asli never tells anyone to stop a medicine.

## Scope
### In (P0: must work in the demo)
1. Ingestion of all available CDSCO NSQ and Spurious months into DynamoDB, with S3 snapshots and new-month detection
2. Strip scan (Bedrock vision) and bill scan, with manual entry fallback
3. Deterministic matching with tiers FLAGGED / VERIFY / NO_ALERT_FOUND and a source link
4. Result card with "what to do next" guidance
5. Family cabinet: save medicines, retroactive check against full history
6. New-month alert pipeline → web push + email to caregivers
7. Demo trigger that replays a real past alert as a new month (disclosed)

### In (P1: should work)
8. Caregiver sharing with roles (Amazon Verified Permissions / Cedar)
9. Guidance in Hindi and Kannada, read-aloud
10. Plain-language failure reasons
11. Statistics job (lag, within-expiry share, counts)
12. PDF + Textract fallback ingestion (becomes P0 if the endpoint spike fails)

### In (P2: extras, only if fully working)
13. Cost and accuracy dashboard
14. QR decoding
15. "Report a problem" button that routes to PvPI
16. Public insights page
17. Pharmacy mode (bulk check of stock CSV or invoice photo)

### Out
- Crowd-sourced warnings shown to other users
- Any LLM-decided safety result
- Public open API
- SMS and WhatsApp
- Rankings of manufacturers

## Success criteria for the demo
- A real strip photo returns a correct result card on the live URL
- A flagged (disclosed mock) strip returns a red card with the CDSCO source link
- Adding a medicine triggers a retroactive match
- Running the demo trigger produces a push notification on an Android phone and an email
- Accuracy scoreboard on at least 30 real photos, cost per 1,000 scans measured
