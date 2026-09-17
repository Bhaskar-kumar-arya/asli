# F — Cabinet API and retroactive check
**Priority:** P0 · **Wave 1** · **Sessions:** 1–2 · **Depends on:** T02 (B, lookup and authz stubs OK)

## Read first
CLAUDE.md, docs/DATA_MODEL.md (Cabinets), docs/API.md (cabinets), docs/ALERTS.md (Retroactive check), docs/PERMISSIONS.md (authz interface)

## Goal
Families save medicines once, and every saved medicine is immediately checked against the full CDSCO history.

## Owns
`services/cabinet/**`, `infra/lib/lanes/f-cabinet.ts`

## Deliverables
1. Handlers: `GET/POST /v1/cabinets`, `GET /v1/cabinets/{id}`, `POST /v1/cabinets/{id}/medicines`, `DELETE /v1/cabinets/{id}/medicines/{medId}`. Creating a cabinet creates the OWNER member. Authorization via `createAuthz` (stub mode until H merges; mode from SSM).
2. On first sign-in (lazy, on `GET /v1/cabinets` returning empty), create a default cabinet "My family".
3. Stream consumer on Cabinets (filter: INSERT with SK begins_with `MED#`): `findCandidates` → `decide` → update MED `latestTier`/`lastCheckedAt` → conditional put MATCH items → publish `AlertEvent` (trigger RETROACTIVE) for new FLAGGED/VERIFY matches. Event source mapping with filter criteria, bisect on error, DLQ.
4. Delete medicine also deletes its MATCH items.
5. Metrics per docs.

## Acceptance criteria
- [ ] Unit tests for handlers and stream consumer with fixtures
- [ ] On `dev-f` (seeded): adding a medicine matching a seeded row creates a MATCH and publishes one SNS message; re-processing the same stream record publishes nothing
- [ ] VIEWER gets 403 on add/remove
- [ ] PENDING → final tier within 10 s

## Out of scope
Invites and member management (H), senders (G1).

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
