# G2 — New-alert fan-out
**Priority:** P0 · **Wave 1** · **Sessions:** 1 · **Depends on:** T02 (B stub OK)

## Read first
CLAUDE.md, docs/ALERTS.md (New-alert fan-out, Demo path), docs/DATA_MODEL.md (FlaggedBatches, Cabinets GSI3), docs/MATCHING.md

## Goal
When CDSCO publishes a new month (or the demo replays one), every saved medicine that matches is found and alerted.

## Owns
`services/fanout/**`, `infra/lib/lanes/g2-fanout.ts`

## Deliverables
1. Stream consumer on FlaggedBatches (INSERT only), batch size 100, bisect on error, DLQ, max retries 3.
2. For each new row: query Cabinets GSI3 by skeleton, `decide(medicine.identity, [row])`, conditional put MATCH (trigger NEW_ALERT or DEMO when `row.demo`), update MED `latestTier` if higher, publish `AlertEvent` for newly created matches only.
3. Backfill guard: when an execution is a backfill (`IngestionState.sourceType` or an execution tag marks it), still create MATCH items but do not send notifications older than 60 days of `alertMonth` unless trigger is DEMO — avoids spamming users with historical alerts during backfill (retroactive check already covers saved medicines). Document the rule.
4. Metrics.

## Acceptance criteria
- [ ] Inserting a fixture row into `dev-g2` FlaggedBatches that matches a seeded medicine creates one MATCH and one SNS message
- [ ] Reprocessing creates nothing new
- [ ] A 500-row month insert completes without throttling errors (load test with fixtures)

## Out of scope
Sending (G1).

---
## Handoff (the session updates this before stopping)
**Status:** NOT STARTED | IN PROGRESS | BLOCKED | DONE
**Stage deployed:** 
**Done:**
- 
**Remaining:**
- 
**Gotchas / decisions:**
- 
**Contract change requests:**
- none
**Learning log entries added:** yes / no
