# D1 — Web shell: auth, layout, settings, push subscription, i18n frame
**Priority:** P0 · **Wave 1** · **Sessions:** 1 · **Depends on:** T02

## Read first
CLAUDE.md, docs/UX.md, docs/API.md, docs/ALERTS.md (Web push), docs/SAFETY_AND_CONTENT.md (Languages)

## Goal
The app frame every screen lives in, usable by an elderly user, with sign-in and push working.

## Owns
`apps/web/src/{app,shell,auth,settings,i18n,api,mocks,sw.ts,theme}/**`, `apps/web/index.html`, `apps/web/vite.config.ts`

## Must not touch
`apps/web/src/features/{scan,cabinet,insights,dashboard,pharmacy}/**` (D2, D3, M, J, N)

## Deliverables
1. Theme tokens and components: Button, Card, StatusChip (tier), Field, Page, BottomNav; font sizes and contrast per docs/UX.md; text-size setting (normal/large/extra large) via root CSS variable.
2. Cognito email sign-in (Amplify JS v6 Auth only) with a friendly flow; protected routes.
3. `api/` typed client generated from contracts (fetch wrapper with JWT, error mapping), and **MSW mocks** returning contract fixtures, enabled with `VITE_MOCK=1`. D2/D3/others use this.
4. i18next setup with `en`, `hi`, `kn` resource loading from `packages/content` (fallback to `en`), language switch persisted to profile/localStorage.
5. Service worker (`sw.ts`): precache shell, `push` handler (show notification from payload), `notificationclick` opens `url`.
6. Settings screen: language, text size, notifications toggle (subscribe/unsubscribe via `/v1/push/subscriptions`), "Send test notification".
7. Routes registry file `app/routes.tsx` where D2/D3/M/J/N add one line each (the only shared edit point; keep lines sorted to avoid conflicts).
8. Offline banner.

## Acceptance criteria
- [ ] With `VITE_MOCK=1` every screen route renders without a backend
- [ ] Sign-in works against `int` Cognito on the Amplify URL
- [ ] Test notification arrives on Android Chrome (once G1 is deployed; until then against T01 spike sender)
- [ ] Lighthouse accessibility ≥ 95 on shell pages
- [ ] Language switch changes shell text

## Out of scope
Feature screens.

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
