# N — Pharmacy mode (bulk check)
**Priority:** P2 · **Wave 2** · **Sessions:** 1 · **Depends on:** core gate

## Read first
CLAUDE.md, docs/API.md (pharmacy), docs/SCANNING.md (bill), docs/MATCHING.md

## Owns
`services/pharmacy/**`, `apps/web/src/features/pharmacy/**`, `infra/lib/lanes/n-pharmacy.ts`

## Deliverables
1. `POST /v1/pharmacy/checks`: CSV (columns mapped by header: product, batch, manufacturer, expiry, quantity; template CSV downloadable) or supplier invoice photo (reuse C's bill extraction module by import).
2. Results table: every row's tier, flagged rows first, `flaggedUnits` total, source links, export results as CSV.
3. `/pharmacy` page, simple and fast; up to 500 rows.

## Acceptance criteria
- [ ] A 200-row CSV with 3 seeded flagged batches returns those 3 as FLAGGED in < 5 s
- [ ] Invoice photo path works on one real invoice

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
