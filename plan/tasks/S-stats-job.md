# S — Statistics job and public stats API
**Priority:** P1 · **Wave 1** · **Sessions:** 1 · **Depends on:** T02 (fixtures; real data after A2 backfill)

## Read first
CLAUDE.md, docs/PRODUCT.md (Evidence), docs/DATA_MODEL.md (Stats, FlaggedBatches)

## Goal
Compute the impact statistics from the full backfill, replacing the hand-checked numbers in the pitch.

## Owns
`services/stats/**`, `infra/lib/lanes/s-stats.ts`

## Deliverables
1. Lambda `compute-stats` (invoked by A2 after ingestion and manually): scan FlaggedBatches (paginated; small table), compute per month and overall, split by category and reporting source:
   - rows; share within expiry at alertMonth (expMonth ≥ alertMonth); distribution of months from mfgMonth to alertMonth (mean, median, p10, p90, max) and months remaining to expiry (same stats); rows missing dates excluded and counted
   - counts by reasonCode, by reportingSource
2. Write `StatsDocument` items; export ARN to SSM for A2.
3. `GET /v1/public/stats`.
4. `STATS.md` generated summary (for the writeup) at `tools/stats-report/latest.md` via a script.
5. Test against hand-checked months: Sep-2024 (49 rows, 48 within expiry), Jan-2025 (52, 52), Mar-2025 (70, 70) for central labs, allowing for differences in data source; document any mismatch.

## Acceptance criteria
- [ ] Stats computed on `int` after backfill; headline numbers written into Handoff and learning log
- [ ] Human told the headline numbers so PRODUCT.md and the video script can be updated

## Out of scope
Charts (M).

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
