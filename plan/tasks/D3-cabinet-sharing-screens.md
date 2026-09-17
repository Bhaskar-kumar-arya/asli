# D3 — Cabinet, medicine detail, members, notification deep link
**Priority:** P0 · **Wave 1** · **Sessions:** 1–2 · **Depends on:** T02 (mocks)

## Read first
CLAUDE.md, docs/UX.md (screens 2, 8–12), docs/API.md (cabinets, invites, members), docs/PERMISSIONS.md

## Goal
The "medicine cabinet watched for you" experience shared between family members.

## Owns
`apps/web/src/features/cabinet/**`, one line in `app/routes.tsx`, Home screen medicine list component

## Deliverables
1. Home list: cabinets and medicines with tier status chips, PENDING spinner while retroactive check runs (poll 3 s up to 30 s), "Last CDSCO update: Month YYYY".
2. Cabinet screen grouped by `forPerson`, add medicine (opens D2 flow in "save" mode or manual form).
3. Medicine detail: identity, latest check, match history with alert details and source links, remove (hidden or disabled with explanation when not permitted — use the API's 403 message).
4. Members: list with roles, create invite (code + share link using Web Share API), accept invite page `/invite/:code`, role change, alerts toggle, leave cabinet.
5. Notification deep link `/cabinets/:id/medicines/:medId?match=<alertId>` highlights the new match.
6. Tests with fixtures, including a VIEWER trying to remove.

## Acceptance criteria
- [ ] Full flows render and work with mocks
- [ ] Against `int`: add medicine → status leaves PENDING → match shown
- [ ] Two accounts share a cabinet via invite on two devices
- [ ] Opening a push notification lands on the highlighted match

## Out of scope
Backend logic.

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
