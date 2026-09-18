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
**Status:** IN PROGRESS
**Stage deployed:** none yet
**Done:**
- New package `@asli/fanout` (`services/fanout/**`): stream consumer on FlaggedBatches (`src/handlers/stream-consumer.ts`), core fan-out logic (`src/fan-out.ts`) - queries Cabinets GSI3 by `batchSkeleton`, runs `decide(medicine.identity, [row], ctx)` per candidate medicine (aliases loaded from Reference, `checkedAgainst` from `@asli/lookup`), conditional-puts MATCH items (`attribute_not_exists(PK)`, idempotent on reprocessing), bumps `MED.latestTier` only if higher (optimistic conditional update), and returns `AlertEvent`s for newly-created matches for the handler to publish to SNS.
- Backfill guard (`src/backfill-guard.ts`): `shouldNotify(alertMonth, trigger, now)` suppresses the SNS publish (but not the MATCH item) when `alertMonth` is >60 days old and trigger isn't DEMO. See Gotchas for why this doesn't inspect `IngestionState.sourceType`.
- `src/tier-rank.ts` ranks MedicineStatus so latestTier only ever moves up.
- `infra/lib/lanes/g2-fanout.ts`: imports FlaggedBatches (+ stream), Cabinets (GSI3), IngestionState, Reference, AlertsTopic and the shared `StreamDlq` via SSM; wires `DynamoEventSource(batchSize: 100, bisectBatchOnError: true, retryAttempts: 3, onFailure: SqsDlq(sharedDlq))` per this task's Deliverable 1.
- `pnpm -r lint/test/build` green (19 new fanout tests, 90+ repo-wide unchanged/passing). `cdk synth STAGE=dev-g2 SHARED_STAGE=dev-shared` for `LaneG2Stack-dev-g2` is clean.
**Remaining:**
- Real `cdk deploy` to `dev-g2` and verification of all 3 acceptance criteria against it (fixture insert → one MATCH + one SNS message; reprocess → nothing new; 500-row month insert with no throttling). Nothing here was invoked against live AWS yet - only synth + unit tests.
- No brand→manufacturer candidate lookup is wired in (unlike C's scan-time path) - when a saved medicine has no `manufacturer`, `decide()` falls back to `MFR_UNKNOWN` -> VERIFY (never FLAGGED), which is safe but slightly less precise than it could be. Low priority; flagging for whoever picks up matching precision work later.
**Gotchas / decisions:**
- Backfill guard is implemented as an `alertMonth`-age check (>60 days -> no notify, MATCH still written), not as "is this execution a backfill" detection. `IngestionState.sourceType` is `ENDPOINT` for both the daily `check-months` run and a `scripts/backfill.ts` run (see A2's `check-months`/`backfill.ts`) - it can't tell them apart, and there's no separate execution tag. Age-off-`alertMonth` is simpler, fully deterministic per stream record, needs no extra IngestionState lookup in the hot path, and gives the exact behavior the task asked for (no notification for a >60-day-old alert, regardless of why it just arrived).
- `MATCH.notifiedAt` is only set at write time when the row is also being published to SNS - it is never backfilled later, so `notifiedAt` doubles as "was a notification sent for this match" (absent = backfill-suppressed).
- `services/fanout/src/reference/alias-map.ts` duplicates C's `services/scan/src/reference/alias-map.ts` (own ~35-line copy, not a shared package) per CLAUDE.md "stay in your lane" - not exported from `@asli/lookup` since lookup is candidate-lookup-only (owned by C) and this is Reference-table access, not FlaggedBatches/IngestionState access.
- **Worktree note:** this task was started in the shared `asli` main worktree while it was mid-switch between other lanes' branches (it moved from `lane/G1` to `lane/D3` under me during the session - see git reflog). To avoid touching `lane/D3`'s uncommitted work, all G2 code was built in a fresh worktree `asli-G2` on branch `lane/G2`, created off `main`, matching T01's existing pattern. Future sessions picking up G2 should use `asli-G2`, not the shared `asli` directory.
**Contract change requests:**
- none
**Learning log entries added:** yes
