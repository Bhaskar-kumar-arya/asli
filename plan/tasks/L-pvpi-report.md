# L — "Report a problem" routed to PvPI
**Priority:** P2 · **Wave 2** · **Sessions:** 1 · **Depends on:** core gate

## Read first
CLAUDE.md, docs/PRODUCT.md (Out of scope: crowd warnings), docs/DATA_MODEL.md (Reports), docs/SAFETY_AND_CONTENT.md

## Owns
`services/reports/**`, `apps/web/src/features/report/**`, `infra/lib/lanes/l-reports.ts`

## Deliverables
1. **Verify first:** current official Pharmacovigilance Programme of India (PvPI) consumer reporting routes (form, app, helpline) from official IPC/PvPI sources. Record URLs and date in Handoff. Do not ship unverified numbers or links.
2. "Report a problem with this medicine" on result and medicine detail screens: choose problem type (side effect, looks different, doesn't seem to work, packaging problem, other), explanation of how to report to PvPI, batch details formatted for copying.
3. `POST /v1/reports`: store privately (docs/DATA_MODEL.md Reports) and return PvPI routes. Never displayed to other users, never affects tiers.
4. Wording: "Asli does not investigate reports. PvPI is the official channel."

## Acceptance criteria
- [ ] Links verified with date
- [ ] Report stored without personal data beyond IDs
- [ ] No UI anywhere shows report counts per batch

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
