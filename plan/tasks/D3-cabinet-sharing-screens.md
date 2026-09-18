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
**Status:** IN PROGRESS
**Stage deployed:** none (frontend-only lane, nothing to deploy; not yet run against a live `int` API)
**Done:**
- `apps/web/src/features/cabinet/**`: API client (`api/client.ts`, `api/cabinets.ts`, `api/alerts.ts`, placeholder `api/auth.ts`), tier/reason copy helpers (`lib/tierCopy.ts`, `lib/reasonCopy.ts`, rule-compliant wording per docs/SAFETY_AND_CONTENT.md), `components/StatusChip.tsx`, `components/HomeMedicineList.tsx` (deliverable 1: cross-cabinet list, status chips, "Last CDSCO update", 3s/30s PENDING poll via `hooks/usePendingPoll.ts`), `pages/CabinetPage.tsx` (deliverable 2: grouped by `forPerson`, add-medicine link), `pages/AddMedicinePage.tsx` (manual-entry fallback; links to `/scan?saveToCabinet=` for D2's future flow), `pages/MedicineDetailPage.tsx` (deliverable 3: identity, match history with per-alert source link/reporting lab/reason text via `GET /v1/alerts/{alertRef}`, permission-aware remove that surfaces the API's real 403 message and disables itself), `pages/MembersPage.tsx` (deliverable 4: role list, role change, alerts toggle, leave, create invite + Web Share API / clipboard fallback), `pages/InviteAcceptPage.tsx` (`/invite/:code`).
- Deliverable 5 (notification deep link): `/cabinets/:cabinetId/medicines/:medId?match=<alertId>` is wired in `app/routes.tsx`; `MedicineDetailPage` reads `?match=` and sets `data-highlighted="true"` + `aria-current="true"` on the matching match-history row.
- Deliverable 6 (tests): 14 Vitest/RTL tests across 8 files, all against contract-shaped fixtures (`__fixtures__/cabinetDetail.ts`, mirroring `packages/contracts/fixtures/cabinets.json`'s Asha/Vikram/Priya OWNER/EDITOR/VIEWER demo cabinet) and a route-keyed `installMockFetch` helper (`__fixtures__/mockFetch.ts`) - no real network calls. Includes the required VIEWER-remove-denied case (`MedicineDetailPage.test.tsx`: clicking Remove gets a real 403 body back, the API's exact message is shown via `role="alert"`, and the button disables).
- Added `@asli/contracts` as an `apps/web` dependency (wasn't wired in before this lane).
- `pnpm -r lint`, `pnpm -r test`, and `pnpm -r build` all green repo-wide (checked after this lane's changes, not just `apps/web` in isolation).

**Remaining:**
- Not yet run against a real `int` deployment - all three "Against `int`" acceptance criteria (PENDING → match, two-account invite share, real push-notification deep link) are unverified beyond mocked-fetch tests, since there's no deployed API to hit yet.
- Home screen integration: `HomeMedicineList` is a standalone component grown for this lane's own tests; D1 (screen 2 shell) still needs to actually mount it inside its Home screen layout.
- "Add medicine" only has the manual-entry fallback; the "opens D2 flow in save mode" half of deliverable 2 is a dead link (`/scan?saveToCabinet=`) until D2 exists.
- Medicine detail doesn't render the full reviewed "What to do next" guidance body (`GET /v1/content/guidance/{key}`) - `packages/content` (lane I) is still a placeholder. Only tier titles, reason plain-text, and the CDSCO source link are shown.
- No visual/e2e pass on a real phone yet (UX.md's 360px/one-handed/AAA-contrast requirements are only sanity-checked by eye in the CSS, not measured).
- `packages/authz`/Cedar isn't wired in client-side at all - the app relies entirely on the API's real 403s for permission enforcement (this matches PERMISSIONS.md's server-side-only enforcement model, so likely fine, but flagging since no lane has done a client-side Cedar-aware "hide vs. show-then-fail" pass).

**Gotchas / decisions:**
- Neither `apps/web/src/app/routes.tsx` nor any router beyond `main.tsx`'s catch-all existed yet, because D1 hasn't started. Created `routes.tsx` as a minimal bootstrap `<Routes>` shell (cabinet routes + `/*` → the untouched `App.tsx` placeholder) and pointed `main.tsx` at it. **D1 should feel free to restructure/replace this file** - it's scaffolding so D3's routes are reachable now, not a claimed design for the app shell. `App.tsx` itself was left untouched.
- Current-user identity has no real source yet (D1 owns sign-in, screen 1). Added a placeholder `api/auth.ts` (`getIdToken`/`getCurrentUserId` reading two `localStorage` keys) purely so the API client can send a bearer token and Members page can highlight "You" / show the Leave button for yourself. Delete this once D1 ships real auth and swap for whatever it exports.
- CabinetDetail's `members` list has no per-member "isSelf" flag from the API - `MembersPage` derives it by comparing `member.userId` to the (placeholder) current user id.
- Remove-medicine UX: rather than hardcode "OWNER/EDITOR can remove" client-side (which would duplicate PERMISSIONS.md's Cedar policy in two places), the Remove button always attempts the DELETE call; a 403 response's exact `error.message` is shown and the button disables. This directly satisfies "use the API's 403 message" per the deliverable, at the cost of one wasted API call for VIEWERs who click it.
- "Last CDSCO update" on the Home list is computed client-side as the max `alertMonth` across all `matches` returned by every cabinet's `CabinetDetail` (API.md/DATA_MODEL.md have no single "global last update" field) - reasonable given the contract, but worth reconciling with however lane S/M end up defining "last update" for their public dashboards, in case the wording should match.
- Used `fireEvent` (not `@testing-library/user-event`) in tests since the latter isn't an `apps/web` devDependency yet and adding it felt out of scope for this lane.

**Contract change requests:**
- none

**Learning log entries added:** yes
