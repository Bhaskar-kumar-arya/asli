# M — Public insights page
**Priority:** P2 · **Wave 2** · **Sessions:** 1 · **Depends on:** S

## Read first
CLAUDE.md, docs/UX.md, S Handoff, docs/SAFETY_AND_CONTENT.md (wording)

## Owns
`services/insights/**`, `apps/web/src/features/insights/**`, `infra/lib/lanes/m-insights.ts`

## Deliverables
1. `GET /v1/public/insights`: flagged batches per month (NSQ vs Spurious), by reason code, by reporting source, lag and months-to-expiry distributions, headline cards.
2. `/insights` page with accessible charts (e.g. Recharts), each with a text summary and "Source: CDSCO alerts, computed by Asli on <date>".
3. No manufacturer rankings or named-company charts.

## Acceptance criteria
- [ ] Headline matches S numbers
- [ ] Charts readable at 360 px and with screen reader summaries

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
