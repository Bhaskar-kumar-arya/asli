# ALERTS.md

## Triggers
| Trigger | Source | Lane |
|---|---|---|
| NEW_ALERT | FlaggedBatches stream INSERT (new CDSCO month ingested) | G2 |
| RETROACTIVE | Cabinets stream INSERT of a `MED#` item | F |
| DEMO | FlaggedBatches INSERT where `demo = true` (from demo replay) | G2 (same path, flagged in event) |

Both matchers use `packages/matching`. Only FLAGGED and VERIFY create MATCH items and events.

## New-alert fan-out (G2)
1. Stream batch (batch size 100, bisect on error, max retries 3, on-failure destination SQS DLQ).
2. For each inserted FlaggedBatch: query Cabinets GSI3 `SKEL#<batchSkeleton>` → candidate medicines.
3. `decide(medicine.identity, [flaggedBatch])` per medicine.
4. For FLAGGED/VERIFY: conditional put MATCH item (`attribute_not_exists`); if it already exists, skip (idempotent).
5. Publish `AlertEvent` to SNS only for newly created MATCH items.

## Retroactive check (F)
1. Stream INSERT of `MED#` → query FlaggedBatches by `BATCH#<batchNorm>` and GSI1 `SKEL#<skeleton>`.
2. `decide` → update MED `latestTier`, `lastCheckedAt`; put MATCH items; publish `AlertEvent` for new ones.
3. Even NO_ALERT_FOUND updates `latestTier` so the UI leaves PENDING.

## AlertEvent (contracts)
```ts
AlertEvent { eventId, trigger: "NEW_ALERT"|"RETROACTIVE"|"DEMO", cabinetId, medId,
  medicineLabel?, tier: "FLAGGED"|"VERIFY", alert: AlertSummary, createdAt }
```
No personal data in the event beyond IDs and the user-given medicine label.

## Senders (G1), subscribed to SNS
### Recipient resolution
Load cabinet members with `alertsEnabled = true`; for each, `authz.isAllowed(user, "ReceiveAlerts", cabinet)`.

### Web push
- Library `web-push`, VAPID keys in Secrets Manager `asli/<stage>/vapid` (generated once by T02 script).
- Payload (≤ 3 KB): `{ title, body, url: "/cabinets/<id>/medicines/<medId>", tag: <eventId>, tier }`.
- Title/body from `packages/content` notification templates in the member's language. FLAGGED: "Batch alert for <label>". VERIFY: "Please check <label> with your pharmacist". Never say unsafe.
- On 404/410 delete the subscription. TTL 24h, urgency high for FLAGGED.

### Email (SES)
- From `alerts@<verified domain or address>`; stage `int` uses verified identities while SES is in sandbox.
- HTML + text template from `packages/content`: what matched, CDSCO month, reason in plain language, source link, "what to do next", link to the app. Language = member preference.
- Configuration set with bounce/complaint tracking to CloudWatch.

### Idempotency
Powertools idempotency keyed by `eventId + userId + channel`.

## Demo path
`POST /v1/admin/demo/replay-month` (A2) starts the ingestion state machine with `sourceType: FIXTURE` and a fixture key in `asli-int-raw/fixtures/demo/`. The fixture contains a real past CDSCO row whose batch matches the disclosed mock strip saved in the demo cabinet. Rows get `demo: true` and `alertMonth` of the original alert. The rest of the path is identical to production. The UI and email show a small "Demo replay of a real <Month YYYY> CDSCO alert" label when `demo` is true.

## Channel constraints to respect
- iOS web push works only for home-screen-installed PWAs (iOS 16.4+). Record the demo on Android Chrome.
- SES sandbox: only verified recipients; request production access on day one.
