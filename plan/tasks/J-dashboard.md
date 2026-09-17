# J — Cost and accuracy dashboard
**Priority:** P2 · **Wave 2** · **Sessions:** 1 · **Depends on:** core gate, E report

## Read first
CLAUDE.md, docs/OBSERVABILITY_AND_COST.md, docs/TESTING.md (Accuracy metrics)

## Owns
`services/metrics/**`, `apps/web/src/features/dashboard/**`, `infra/lib/lanes/j-dashboard.ts`, `packages/contracts/src/pricing.ts` values only (with sources)

## Deliverables
1. CloudWatch dashboard in CDK (rows in docs) and alarms.
2. `GET /v1/public/metrics`: latest accuracy JSON + cost per scan, per 1,000 scans, per ingestion run, and the 10,000-family projection with stated assumptions, from CloudWatch metric data over the last 24 h on `int`.
3. Public `/dashboard` page: accuracy by method and condition, cost cards, "measured on <date>".
4. Verified prices with source URLs and dates in `pricing.ts`.

## Acceptance criteria
- [ ] Numbers on the page match a manual calculation from CloudWatch for one scan
- [ ] Page is readable at 360 px

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
