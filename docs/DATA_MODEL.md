# DATA_MODEL.md

All tables: on-demand billing, point-in-time recovery on, deletion protection off in `dev-*`, on in `int`. Names: `asli-<stage>-<table>`. Exported to SSM as `/asli/<stage>/table/<name>` (name) and `/asli/<stage>/table/<name>/stream` (stream ARN where enabled).

## FlaggedBatches (stream: NEW_IMAGE)
| Key | Pattern |
|---|---|
| PK | `BATCH#<batchNorm>` |
| SK | `ALERT#<alertMonth>#<category>#<rowHash>` |
| GSI1PK / GSI1SK | `SKEL#<batchSkeleton>` / `ALERT#<alertMonth>#<rowHash>` |
| GSI2PK / GSI2SK | `MONTH#<alertMonth>` / `<category>#<rowHash>` |

Attributes: all fields of `FlaggedBatch` (DATA_SOURCES.md §4), `alertId` (= rowHash), `ingestedAt`, `demo` (boolean, true only for demo-injected rows).
Access: exact lookup by batchNorm; near lookup by skeleton (GSI1); list a month (GSI2). Single-alert lookups use `alertRef` = base64url of `PK|SK`, carried in API responses.
Writes: conditional put `attribute_not_exists(PK)` so reruns never duplicate.

## IngestionState
| PK | SK |
|---|---|
| `MONTH#<YYYY-MM>` | `TAB#<nsq|spurious>` |
Attributes: `status` (PENDING/RUNNING/DONE/FAILED), `sourceType` (ENDPOINT/PDF/FIXTURE), `rowCount`, `snapshotKeys[]`, `executionArn`, `updatedAt`, `error`.

## Cabinets (single table, stream: NEW_AND_OLD_IMAGES)
| Item | PK | SK | Notes |
|---|---|---|---|
| Cabinet | `CAB#<cabinetId>` | `META` | name, createdBy, createdAt |
| Member | `CAB#<cabinetId>` | `MEMBER#<userId>` | role OWNER/EDITOR/VIEWER, alertsEnabled, email (encrypted field not required; never logged), joinedAt. GSI1PK `USER#<userId>` GSI1SK `CAB#<cabinetId>` |
| Invite | `CAB#<cabinetId>` | `INVITE#<code>` | role, expiresAt (TTL), createdBy. GSI2PK `INVITE#<code>` |
| Medicine | `CAB#<cabinetId>` | `MED#<medId>` | identity (MedicineIdentity), label, forPerson, addedBy, addedAt, lastCheckedAt, latestTier. GSI3PK `SKEL#<batchSkeleton>` GSI3SK `CAB#<cabinetId>#MED#<medId>` |
| Match | `CAB#<cabinetId>` | `MATCH#<medId>#<alertId>` | tier, category, alertRef, reasonCode, alertMonth, trigger (RETROACTIVE/NEW_ALERT/DEMO), createdAt, notifiedAt. Written with `attribute_not_exists` for idempotency |

Access: list user's cabinets (GSI1); accept invite (GSI2); find medicines for a new alert by skeleton (GSI3); list cabinet contents (PK query).

## PushSubscriptions
PK `USER#<userId>`, SK `SUB#<sha256(endpoint)>`; attributes endpoint, keys {p256dh, auth}, userAgent, createdAt, lastSuccessAt, failures. Delete on 404/410 from push service.

## Reference
| PK | SK | Use |
|---|---|---|
| `MFR#<manufacturerNorm>` | `ALIAS#<aliasNorm>` | Manufacturer aliases (canonical ← variants). GSI1PK `ALIAS#<aliasNorm>` |
| `BRAND#<brandNorm>` | `MFR#<manufacturerNorm>` | Brand → manufacturer candidates with `confidence` and `evidence` (from CDSCO rows where product name contains brand) |
| `REASON#<reasonRawNorm>` | `CODE` | Cached reason classification |

## Stats
PK `STATS#<kind>` SK `<scope>` e.g. `STATS#LAG` / `ALL`, `STATS#MONTH` / `2025-03`. Value is a JSON document matching `StatsDocument` in contracts.

## Reports (PvPI, private, Wave 2)
PK `REPORT#<yyyy-mm>` SK `<reportId>`; problemType, alertRef?, batchNorm, createdAt. No free text stored beyond 280 chars, never shown to other users.

## Idempotency (Powertools)
Standard Powertools schema, TTL on `expiration`.

## S3 buckets
| Bucket | Prefixes | Lifecycle |
|---|---|---|
| `asli-<stage>-raw` | `raw/cdsco/endpoint/…`, `raw/cdsco/pdf/…`, `textract/…`, `fixtures/demo/…` | keep; versioning on |
| `asli-<stage>-uploads` | `strip/<userId>/<uploadId>`, `bill/<userId>/<uploadId>`, `pharmacy/<userId>/<uploadId>` | expire after 1 day; bills deleted by code immediately after extraction |
| `asli-<stage>-public` | `audio/<lang>/<templateKey>.mp3`, `metrics/accuracy/latest.json` | keep |

All buckets: block public access (public bucket served through CloudFront/Amplify only), SSE-S3, TLS-only policy.

## SNS
`asli-<stage>-alerts` topic, message = `AlertEvent` (contracts). Message attributes: `trigger`, `tier`.

## Events and contracts
Every item, request, response and event shape is defined as a Zod schema in `packages/contracts/src`. Table item types live in `packages/contracts/src/items.ts`.
